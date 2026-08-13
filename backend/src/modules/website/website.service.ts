import axios from "axios"
import jwt from "jsonwebtoken"
import { Types } from "mongoose"
import { Redis } from "ioredis"
import { env } from "../../config/env.js"
import enqueue from "../../utils/scheduler/enqueue.js"
import type { WebsiteRepository } from "./website.repository.js"
import { normalizeHostname } from "../../utils/normalizeHostname.js"
import type { AddWebsitePayload, PopulatedWebsite } from "./website.types.js"
import { AppError } from "../../utils/AppError.js"

export class WebsiteService {
  constructor(private readonly repo: WebsiteRepository) {}

  // Returns the protected payload for the current user.
  getProtected(user: { id?: string }) {
    return {
      msg: "This is a protected route",
      user,
    }
  }

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
  // Generate verification content for domain verification file
  async generateVerificationFileContent(websiteID : string, userID : string) {
    const website = await this.repo.findWebsiteById(websiteID)
    if(!website){
      throw new AppError("Invalid Request")
    }
    if(!website?.userID.find(x => x.toString() === userID)){
      website.userID.push(userID as any)
    }
    return {
      token : `makora_${websiteID}`,
      issueDate : new Date(),
      domain : website.domain
    }
  }

  // Verifies the ownership token for a website.
  async verifyWebsite(userId: string, link: string, replace = false) {
    
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
  async scanWebsite(userId: string, websiteID: string, force = false) {
    const user = await this.repo.findUserById(userId)
    if (!user) {
      throw new AppError("Unauthorized", 403)
    }

    if (!user.websites.some((website: any) => websiteID == website.toString())) {
      throw new AppError("Website not found 1", 404)
    }

    const website = await this.repo.findWebsiteById(websiteID)
    if (website === null) {
      throw new AppError("Website not found 2", 404)
    }

    const domain = website.domain
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      throw new AppError("Redis URL is not configured", 500)
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
        sitemap_links: [domain],
        checkedLinks: [],
        checkedAt: Date.now(),
      })
      await this.repo.saveWebsite(website)
    }

    if (!env.REDIS_URL) {
      throw new AppError("Redis URL is not configured", 500)
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
