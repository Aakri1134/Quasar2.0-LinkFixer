import mongoose from "mongoose"
import { env } from "../../config/env.js"
import enqueue from "../../utils/scheduler/enqueue.js"
import type { WebsiteRepository } from "./website.repository.js"
import type {
  AddWebsitePayload,
  PopulatedWebsite,
  ScanMeta,
  ScanStatus,
  WebsiteQueueMessage, UpdateWebsiteSettingsInput } from "./website.types.js"
import { SCAN_PHASES } from "./website.types.js"
import { AppError } from "../../utils/AppError.js"
import { webHandler } from "../../service/webHandler.js"
import { verificationSchema } from "./website.schema.js"
import { getRedis } from "../../database/connectRedis.js"
import {
  getCheckedLinksKey,
  getQueuedKey,
  getResultKey,
  getScanMetaKey,
} from "../../utils/redisKeys.js"
import { resolveSitemapFromRobots } from "../../utils/website/sitemap.js"
import {
  buildVerificationToken,
  isSameHost,
  parseVerificationToken,
} from "../../utils/website/verification.js"
import { MANAGER_TASKS, type ManagerTasksType } from "../../workers/managers/Manager.types.js"

const WEBSITE_QUEUE = "priority_high_domain"

// scan:meta:<domain> is written by another process, so it is read defensively: anything malformed,
// half-written or left over from an older build degrades to "no metadata" rather than a 500.
function parseScanMeta(raw: string | null): ScanMeta | null {
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== "object") return null
  const record = parsed as Record<string, unknown>

  const meta: ScanMeta = {}
  if (typeof record.websiteID === "string") meta.websiteID = record.websiteID
  if (typeof record.domain === "string") meta.domain = record.domain
  if (typeof record.startedAt === "number") meta.startedAt = record.startedAt
  if (typeof record.total === "number") meta.total = record.total
  if (isScanPhase(record.phase)) meta.phase = record.phase
  if (isManagerTask(record.task)) meta.task = record.task

  return meta
}

function isScanPhase(value: unknown): value is (typeof SCAN_PHASES)[number] {
  return typeof value === "string" && (SCAN_PHASES as readonly string[]).includes(value)
}

function isManagerTask(value: unknown): value is ManagerTasksType {
  return typeof value === "string" && (MANAGER_TASKS as readonly string[]).includes(value)
}

export class WebsiteService {
  constructor(private readonly repo: WebsiteRepository) {}

  // Returns the protected payload for the current user.
  getProtected(user: { id?: string }) {
    return {
      msg: "This is a protected route",
      user,
    }
  }

  // Lists the authenticated user's websites.
  async getWebsitesForUser(userId: string) {
    const user = await this.repo.findWebsitesByUserId(userId)

    if (!user || !user.websites) {
      return null
    }

    const websites = (user.websites as unknown as PopulatedWebsite[]).map(
      ({ domain, updatedAt, id }) => ({
        domain,
        updatedAt,
        id,
      }),
    )

    return {
      website: websites,
      user: userId,
      success: true,
    }
  }

  // Loads one of the authenticated user's websites by id.
  async getWebsitesByID(userId: string, websiteID : string) {
    const user = await this.repo.findWebsitesByUserId(userId)

    if (!user || !user.websites) {
      throw new AppError("Invalid User", 403)
    }
    const current = user.websites.find(w => w.id.toString() === websiteID)
    if(!current){
      throw new AppError("Invalid WebsiteID", 404)
    }

    return {
      website: current,
      user: userId,
      success: true,
    }
  }

  // Generate verification content for domain verification file
  async generateVerificationFileContent(websiteID : string, userID : string) {
    const user = await this.repo.findUserById(userID)
    if (!user) {
      throw new AppError("Unauthorized", 403)
    }

    // Scoped to the caller's own websites, and 404 rather than 403 so ids cannot be probed.
    if (!user.websites.some((website) => website.toString() === websiteID)) {
      throw new AppError("Website not found", 404)
    }

    const website = await this.repo.findWebsiteById(websiteID)
    if(!website){
      throw new AppError("Website not found", 404)
    }

    // Repairs the Website to User back-reference. This used to be pushed and never saved, so the
    // association was lost the moment the request ended (REPORT P0-6).
    if(!website.userID.some(x => x.toString() === userID)){
      website.userID.push(userID as unknown as mongoose.Types.ObjectId)
      await this.repo.saveWebsite(website)
    }

    return {
      token : buildVerificationToken(websiteID, userID),
      issueDate : new Date(),
      domain : website.domain
    }
  }

  // Verifies the ownership token for a website.
  async verifyWebsite(userID: string, websiteID : string,  link: string, replace = false) {
    const user = await this.repo.findUserById(userID)
    if (!user) {
      throw new AppError("Unauthorized", 403)
    }
    if (!user.websites.some((website) => website.toString() === websiteID)) {
      throw new AppError("Website not found", 404)
    }

    const website = await this.repo.findWebsiteById(websiteID)
    if(!website){
      throw new AppError("Website not found", 404)
    }

    // SSRF guard: `link` is user-supplied and fetched by this server, so it may only ever point at
    // the website's own registered domain, over http(s). Anything else is refused before the fetch.
    let verificationURL: URL
    try {
      verificationURL = new URL(link)
    } catch {
      throw new AppError("Invalid verification URL", 400)
    }
    if (verificationURL.protocol !== "http:" && verificationURL.protocol !== "https:") {
      throw new AppError("Verification URL must use http or https", 400)
    }
    if (!isSameHost(verificationURL.hostname, website.domain)) {
      throw new AppError("Verification URL must be hosted on the website's own domain", 400)
    }

    let payload: unknown
    try {
      const dataTxt = await webHandler.visitTxt(verificationURL.toString())
      payload = JSON.parse(dataTxt)
    } catch {
      throw new AppError("Could not read the verification file", 400)
    }

    const parsed = verificationSchema.safeParse(payload)
    if (!parsed.success) {
      throw new AppError("Invalid Verification Token found", 400)
    }

    const token = parseVerificationToken(parsed.data.token)
    if (!token || token.websiteID !== websiteID || token.userID !== userID) {
      throw new AppError("Invalid Verification Token", 400)
    }
    if (!isSameHost(parsed.data.domain, website.domain)) {
      throw new AppError("Invalid Verification Token", 400)
    }

    if (website.ownerID) {
      if (website.ownerID.toString() === userID) {
        return {
          success : true,
          msg : "Website already verified for current user"
        }
      }
      if (!replace) {
        throw new AppError("Website already claimed by another user", 409)
      }
    }

    website.ownerID = userID as unknown as mongoose.Types.ObjectId
    await this.repo.saveWebsite(website)
    return {
      success : true,
      msg : "Successfully verified website for current user"
    }
  }

  // Adds a website to the authenticated user.
  async addWebsite({ userId, baseURL, agreeToTerms, mail_subscription }: AddWebsitePayload) {
    let safeLink = baseURL
    const user = await this.repo.findUserByIdWithoutPassword(userId)
    if (!user) {
      throw new AppError("User not found", 404)
    }
    let url: URL
    try {
      url = new URL(safeLink)
    } catch {
      throw new AppError("Invalid URL", 403)
    }

    const domain = url.host
    if (!domain) throw new AppError("Please provide a valid start URL", 400)

    const website = await this.repo.findWebsiteByDomain(domain)
    if (website !== null) {
      if (user.websites.some((web) => web.toString() === website.id)) {
        throw new AppError("Website already added to user", 400)
      }
      user.websites.push(website._id)

      website.userID.push(user.id)
      if (mail_subscription) {
        website.mail_subscribers.push(user.id)
      }

      try {
        await Promise.all([
          this.repo.saveUser(user),
          this.repo.saveWebsite(website),
        ])
      } catch {
        throw new AppError("Error in saving data", 400)
      }

      return {
        statusCode: 200,
        body: {
          msg: "Website added sucessfully",
          website,
        },
      }
    }
    const newWebsite = this.repo.createWebsite({
      domain,
      userID: [userId],
      checkedLinks: [],
      agree_to_terms: {
        userId: user.id,
        agreement: agreeToTerms,
      }
    })

    // A website saved with an empty sitemap_links hands every crawl an empty link queue, so the
    // scan completes having checked nothing (REPORT P0-2). Seed what can be discovered from
    // robots.txt; the eval_sitemap run queued below expands the seeds into the real link list.
    // resolveSitemapFromRobots never throws and is bounded to a few seconds.
    const seed = await resolveSitemapFromRobots(url.origin)
    newWebsite.robots_txt_url = seed.robotsTxtUrl
    newWebsite.sitemap_links = seed.sitemapLinks

    if (mail_subscription) {
      newWebsite.mail_subscribers.push(user.id)
    }
    user.websites.push(newWebsite.id)

    try {
      await Promise.all([
        this.repo.saveUser(user),
        this.repo.saveWebsite(newWebsite),
      ])
    } catch {
      throw new AppError("Error in saving data", 400)
    }

    // Discovery runs as an ordinary scan so the Manager can chain eval_sitemap into eval_links. A
    // queue outage must not fail the add: the website is already saved, so the failure is logged
    // and the caller still gets its 201.
    try {
      await this.scanWebsite(userId, newWebsite.id, false, "eval_sitemap")
    } catch (error) {
      console.error("Failed to queue the initial sitemap scan:", (error as Error).message)
    }

    return {
      statusCode: 201,
      body: {
        msg: "Website added sucessfully",
        website: newWebsite,
      },
    }
  }

  // Removes a website from the authenticated user.
  async removeWebsite(userId: string, websiteID: string) {
    if (!websiteID) {
      throw new AppError("Invalid request", 400)
    }

    if (!userId) {
      throw new AppError("Invalid request", 400)
    }

    const user = await this.repo.findUserById(userId)
    if (user === null) {
      throw new AppError("User not found", 404)
    }

    user.websites = user.websites.filter((web) => web.toString() !== websiteID)

    const website = await this.repo.findWebsiteById(websiteID)
    if (website === null) {
      try {
        await this.repo.saveUser(user)
      } catch {
        throw new AppError("Error in saving data", 400)
      }
      throw new AppError("Invalid website key", 404)
    }

    website.userID = website.userID.filter((userRef) => userRef.toString() !== userId)

    try {
      await Promise.all([
        this.repo.saveWebsite(website),
        this.repo.saveUser(user),
      ])
    } catch {
      throw new AppError("Error in saving data", 400)
    }
    return {
      msg: "Deleted successfully",
    }
  }

  // Queues a website scan request.
  async scanWebsite(
    userId: string,
    websiteID: string,
    force = false,
    task: ManagerTasksType = "eval_links",
  ) {
    const user = await this.repo.findUserById(userId)
    if (!user) {
      throw new AppError("Unauthorized", 403)
    }

    if (!user.websites.some((website) => websiteID == website.toString())) {
      throw new AppError("Website not found", 404)
    }

    const website = await this.repo.findWebsiteById(websiteID)
    if (website === null) {
      throw new AppError("Website not found", 404)
    }

    const domain = website.domain
    if (!env.REDIS_URL) {
      throw new AppError("Redis URL is not configured", 500)
    }
    const redis = await getRedis()
    const queuedKey = getQueuedKey(domain)

    // The queued key doubles as the Manager's cancellation guard - it refuses to start a job
    // unless it reads "1". `force` is the escape hatch for a key a crashed run left behind.
    const isQueued = await redis.get(queuedKey)
    if (isQueued === "1" && !force) {
      return {
        statusCode: 200,
        body: { msg: "website already in queue" },
      }
    }

    await redis.set(queuedKey, 1)

    // Manager.websiteConsumer acks and silently drops any message missing id, attempt *or* task,
    // which is why no API-initiated scan ever reached a scraper (REPORT P0-1). `satisfies` is what
    // stops this payload drifting away from the contract again without the compiler noticing.
    const queueLength = await enqueue(
      WEBSITE_QUEUE,
      JSON.stringify({
        id: websiteID,
        attempt: 0,
        task,
      } satisfies WebsiteQueueMessage),
    )

    if (queueLength !== -1) {
      return {
        statusCode: 200,
        body: {
          msg: "/scanWebsites responding",
          size: queueLength,
          task,
          success: true,
        },
      }
    }

    // Nothing will pick the job up, so the domain must not be left looking queued forever -
    // unless a run really was in flight and this call forced its way past it.
    if (isQueued !== "1") {
      await redis.del(queuedKey)
    }

    return {
      statusCode: 500,
      body: {
        error: "Error in queuing",
        success: false,
      },
    }
  }

  // Reports the live scan state for a website, read straight out of Redis.
  async getScanStatus(userId: string, websiteID: string): Promise<ScanStatus> {
    const user = await this.repo.findUserById(userId)
    if (!user) {
      throw new AppError("Unauthorized", 403)
    }

    if (!user.websites.some((website) => website.toString() === websiteID)) {
      throw new AppError("Website not found", 404)
    }

    const website = await this.repo.findWebsiteById(websiteID)
    if (website === null) {
      throw new AppError("Website not found", 404)
    }

    const domain = website.domain
    const snapshot = await this.readScanSnapshot(domain)

    return {
      websiteID: String(website.id),
      domain,
      // The metadata wins when it carries a phase; without it the cancellation guard is all we
      // know, and that only says the job is waiting for a Manager to pick it up.
      phase: snapshot.meta?.phase ?? (snapshot.queued ? "queued" : "idle"),
      checked: snapshot.checked,
      results: snapshot.results,
      queued: snapshot.queued,
      startedAt: snapshot.meta?.startedAt ?? null,
      task: snapshot.meta?.task ?? null,
    }
  }

  // Creates or reuses a website in development mode and queues a scan.
  async testWebsite(domain: string) {
    // The route itself is only registered in dev; this is the second lock on the same door. The
    // old guard answered with statusCode 123, which made res.status() throw (task 2.2).
    if (env.NODE_ENV !== "dev") {
      throw new AppError("Not found", 404)
    }

    let website = await this.repo.findWebsiteByDomain(domain)
    if (!website) {
      website = this.repo.createWebsite({
        domain,
        sitemap_links: [domain],
        checkedLinks: [],
      })
      await this.repo.saveWebsite(website)
    }

    if (!env.REDIS_URL) {
      throw new AppError("Redis URL is not configured", 500)
    }
    const redis = await getRedis()
    await redis.set(getQueuedKey(domain), 1)

    await enqueue(
      WEBSITE_QUEUE,
      JSON.stringify({
        id: website.id,
        attempt: 0,
        task: "eval_links",
      } satisfies WebsiteQueueMessage),
    )

    return {
      statusCode: 200,
      body: {
        msg: "/scanWebsites responding",
      },
    }
  }

  // Reads the four Redis keys a live scan writes, in one round trip.
  private async readScanSnapshot(domain: string) {
    if (!env.REDIS_URL) {
      throw new AppError("Scan status is temporarily unavailable", 503)
    }

    try {
      const redis = await getRedis()
      const [meta, results, checked, queued] = await Promise.all([
        redis.get(getScanMetaKey(domain)),
        redis.llen(getResultKey(domain)),
        redis.scard(getCheckedLinksKey(domain)),
        redis.get(getQueuedKey(domain)),
      ])

      return {
        meta: parseScanMeta(meta),
        results,
        checked,
        queued: queued === "1",
      }
    } catch (error) {
      console.error("Failed to read scan status from Redis:", (error as Error).message)
      throw new AppError("Scan status is temporarily unavailable", 503)
    }
  }

  // Updates the per-website settings the dashboard exposes. Only users attached to the website may
  // change them, and mail_subscription is per-user (it adds or removes the caller from
  // mail_subscribers) rather than a single flag shared by everyone tracking the domain.
  async updateWebsiteSettings(userId: string, websiteID: string, updates: UpdateWebsiteSettingsInput) {
    const website = await this.repo.findWebsiteById(websiteID)
    if (!website) {
      throw new AppError("Website not found", 404)
    }

    if (!website.userID.some((ref) => ref.toString() === userId)) {
      // 404 not 403 - a 403 would confirm the website exists.
      throw new AppError("Website not found", 404)
    }

    if (updates.scan_frequency !== undefined) {
      website.scan_frequency = updates.scan_frequency
    }

    if (updates.mail_subscription !== undefined) {
      const subscribed = website.mail_subscribers.some((ref) => ref.toString() === userId)
      if (updates.mail_subscription && !subscribed) {
        website.mail_subscribers.push(userId as unknown as mongoose.Types.ObjectId)
      } else if (!updates.mail_subscription && subscribed) {
        website.mail_subscribers = website.mail_subscribers.filter(
          (ref) => ref.toString() !== userId,
        ) as typeof website.mail_subscribers
      }
    }

    await this.repo.saveWebsite(website)

    return {
      success: true,
      msg: "Settings updated",
      settings: {
        scan_frequency: website.scan_frequency,
        mail_subscription: website.mail_subscribers.some((ref) => ref.toString() === userId),
      },
    }
  }

}
