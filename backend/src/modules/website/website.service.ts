import axios from "axios"
import jwt from "jsonwebtoken"
import { Redis } from "ioredis"
import { env } from "../../config/env.js"
import enqueue from "../../utils/scheduler/enqueue.js"
import { parseSitemap } from "../../utils/website/sitemap.js"
import type { WebsiteRepository } from "./website.repository.js"
import { normalizeHostname } from "../../utils/normalizeHostname.js"

export class WebsiteError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = "WebsiteError"
  }
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

  // Verifies the ownership token for a website.
  async verifyWebsite(userId: string, link: string, replace = false) {
    if (!link) {
      throw new WebsiteError("Invalid URL", 400)
    }

    let url: URL
    try {
      url = new URL(link)
    } catch {
      throw new WebsiteError(`Invalid URL format: ${link}`, 400)
    }

    const domain = normalizeHostname(url.hostname)
    const response = await axios.get(link, {
      timeout: 10000,
      headers: { "User-Agent": "LinkFixerBot/1.0" },
      responseType: "text",
      validateStatus: (status) => status === 200,
    })

    let jwtToken = response.data
    if (typeof jwtToken !== "string") {
      throw new WebsiteError("Verification file must contain plain text JWT token", 400)
    }

    jwtToken = jwtToken
      .trim()
      .replace(/\n/g, "")
      .replace(/\r/g, "")
      .replace(/\s+/g, "")
      .replace(/^\uFEFF/, "")

    if ((jwtToken.match(/\./g) || []).length !== 2) {
      throw new WebsiteError(
        "Invalid JWT format. Token must have format: header.payload.signature",
        400,
      )
    }

    if (jwtToken.includes("<") || jwtToken.includes(">")) {
      throw new WebsiteError(
        "Verification file contains HTML. Please ensure it contains only the JWT token.",
        400,
      )
    }

    const secret = process.env.JWT_VERIFICATION_SECRET
    if (!secret) {
      throw new WebsiteError("Verification secret is not configured", 500)
    }

    const decoded = jwt.verify(jwtToken, secret) as {
      domain?: string
      websiteID?: string
      owner?: string
    }

    const normalizedDomain = domain.replace(/^www\./, "")
    const normalizedJWTDomain = (decoded.domain ?? "").replace(/^www\./, "")

    if (normalizedJWTDomain !== normalizedDomain) {
      throw new WebsiteError(
        `Domain mismatch: JWT is for ${decoded.domain}, but file is hosted on ${domain}`,
        400,
      )
    }

    if (!decoded.websiteID) {
      throw new WebsiteError("Website not found in database", 404)
    }

    const website = await this.repo.findWebsiteById(decoded.websiteID)
    if (!website) {
      throw new WebsiteError("Website not found in database", 404)
    }

    if (!((website.userID as any[]) || []).includes(userId) || decoded.owner !== userId) {
      throw new WebsiteError("Invalid user", 400)
    }

    if (!replace && website.ownerID) {
      throw new WebsiteError("Website already has a owner", 400)
    }

    if (!website.ownerID) {
      website.ownerID = userId as any
      website.verifiedUsers.push(userId as any)
      await this.repo.saveWebsite(website)
      return { success: true }
    }

    if (replace && website.verifiedUsers.includes(userId as any)) {
      website.ownerID = userId as any
      await this.repo.saveWebsite(website)
      return { success: true }
    }

    throw new WebsiteError("New owner must be verified by previous owner", 400)
  }

  // Adds a website to the authenticated user.
  async addWebsite(userId: string, link: string) {
    let safeLink = link
    const user = await this.repo.findUserByIdWithoutPassword(userId)
    if (!user) {
      throw new WebsiteError("User not found", 404)
    }

    if (!safeLink) {
      throw new WebsiteError("Please provide a valid start URL", 400)
    }

    if (!safeLink.includes("http")) {
      safeLink = "http://" + safeLink
    }

    let url: URL
    try {
      url = new URL(safeLink)
    } catch {
      throw new WebsiteError("Invalid URL", 403)
    }

    const domain = url.origin
    if (!domain) {
      throw new WebsiteError("Please provide a valid start URL", 400)
    }

    const website = await this.repo.findWebsiteByDomain(domain)
    if (website !== null) {
      if ((user.websites as any[]).some((web) => web.toString() === website.id)) {
        throw new WebsiteError("Website already added to user", 400)
      }

      user.websites.push({
        id: website._id,
        domain: website.domain,
      } as any)
      website.userID.push(user.id)

      try {
        await Promise.all([this.repo.saveUser(user), this.repo.saveWebsite(website)])
      } catch {
        throw new WebsiteError("Error in saving data", 400)
      }

      return {
        statusCode: 200,
        body: {
          msg: "Website added sucessfully",
          website,
        },
      }
    }

    const sitemapURL = url.hostname + "/sitemap.xml"
    const sitemapLinks = await parseSitemap(sitemapURL)
    const reports: Record<string, unknown> = {}

    if (sitemapLinks.length === 0) {
      reports.sitemap = {
        error: `No links detected at ${sitemapURL}`,
      }
    } else {
      reports.sitemap = {
        url: sitemapURL,
        links: sitemapLinks,
      }
    }

    try {
      const newWebsite = this.repo.createWebsite({
        domain,
        userID: [userId],
        checkedLinks: [],
        sitemapLinks: sitemapLinks.length === 0 ? [safeLink] : sitemapLinks,
      })

      user.websites.push(newWebsite.id)

      try {
        await Promise.all([this.repo.saveUser(user), this.repo.saveWebsite(newWebsite)])
      } catch {
        throw new WebsiteError("Error in saving data", 400)
      }

      return {
        statusCode: 201,
        body: {
          ...reports,
          msg: "Website added sucessfully",
          website: newWebsite,
        },
      }
    } catch (error) {
      if (error instanceof WebsiteError) {
        throw error
      }
      throw new WebsiteError("Server error", 500)
    }
  }

  // Removes a website from the authenticated user.
  async removeWebsite(userId: string, websiteID: string) {
    if (!websiteID) {
      throw new WebsiteError("Invalid request", 400)
    }

    if (!userId) {
      throw new WebsiteError("Invalid request", 400)
    }

    const user = await this.repo.findUserById(userId)
    if (user === null) {
      throw new WebsiteError("User not found", 404)
    }

    user.websites = user.websites.filter((web: any) => web.id !== websiteID)

    const website = await this.repo.findWebsiteById(websiteID)
    if (website === null) {
      try {
        await this.repo.saveUser(user)
      } catch {
        throw new WebsiteError("Error in saving data", 400)
      }
      throw new WebsiteError("Invalid website key", 404)
    }

    website.userID = website.userID.filter((userRef: any) => userRef !== userId)

    try {
      await Promise.all([this.repo.saveWebsite(website), this.repo.saveUser(user)])
    } catch {
      throw new WebsiteError("Error in saving data", 400)
    }

    return {
      msg: "Deleted successfully",
    }
  }

  // Queues a website scan request.
  async scanWebsite(userId: string, websiteID: string, force = false) {
    const user = await this.repo.findUserById(userId)
    if (!user) {
      throw new WebsiteError("Unauthorized", 403)
    }

    if (!user.websites.some((website: any) => websiteID == website.toString())) {
      throw new WebsiteError("Website not found 1", 404)
    }

    const website = await this.repo.findWebsiteById(websiteID)
    if (website === null) {
      throw new WebsiteError("Website not found 2", 404)
    }

    const domain = website.domain
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      throw new WebsiteError("Redis URL is not configured", 500)
    }
    const redis = new Redis(redisUrl)
    const queuedKey = `queued:${domain}`

    const isQueued = await redis.get(queuedKey)
    if (isQueued === "1") {
      return {
        statusCode: 200,
        body: { msg: "website already in queue" },
      }
    }

    await redis.set(queuedKey, 1)

    const queueLength = await enqueue(
      "priority_high_domain",
      JSON.stringify({
        id: websiteID,
        attempt: 0,
      }),
    )

    if (queueLength !== -1) {
      return {
        statusCode: 200,
        body: {
          msg: "/scanWebsites responding",
          size: queueLength,
          success: true,
        },
      }
    }

    return {
      statusCode: 500,
      body: {
        error: "Error in queuing",
        success: false,
      },
    }
  }

  // Creates or reuses a website in development mode and queues a scan.
  async testWebsite(domain: string) {
    if (process.env.MODE_NODE !== "dev") {
      return {
        statusCode: 123,
        body: { you: "naughty" },
      }
    }

    let website = await this.repo.findWebsiteByDomain(domain)
    if (!website) {
      website = this.repo.createWebsite({
        domain,
        sitemapLinks: [domain],
        checkedLinks: [],
        checkedAt: Date.now(),
      })
      await this.repo.saveWebsite(website)
    }

    if (!env.REDIS_URL) {
      throw new WebsiteError("Redis URL is not configured", 500)
    }
    const redis = new Redis(env.REDIS_URL)
    await redis.set(`queued:${domain}`, 1)

    await enqueue(
      "priority_high_domain",
      JSON.stringify({
        id: website.id,
        attempt: 0,
      }),
    )

    return {
      statusCode: 200,
      body: {
        msg: "/scanWebsites responding",
      },
    }
  }
}
