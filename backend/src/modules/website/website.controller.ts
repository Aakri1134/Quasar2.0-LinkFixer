import type { Request, Response } from "express"
import { type WebsiteService } from "./website.service.js"
import { asyncHandler } from "../../utils/asyncHandler.js"
import type { AddWebsitePayload } from "./website.types.js"

type AuthenticatedRequest = Request & {
  user?: {
    id: string
  }
}

export class WebsiteController {
  constructor(private readonly service: WebsiteService) {}

  // Returns the protected route payload.
  getProtected(req: AuthenticatedRequest, res: Response) {
    return res.json(this.service.getProtected(req.user ?? {}))
  }

  getWebsiteForUser = asyncHandler(async (req : AuthenticatedRequest, res : Response) => {
    const userId = req.user?.id

		if (!userId) {
			return res.status(401).json({ error: "Unauthorized" })
		}

		const payload = await this.service.getWebsitesForUser(userId)

		if (!payload) {
			return res.status(500).json({
				error: "Internal Server Error",
			})
		}

		return res.status(200).json(payload)
  })

  // Verifies a website ownership token.
  verifyWebsite = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id
    const { link, replace } = req.body as { link: string; replace?: boolean }

    if (!userId) {
      return res.status(403).json({ error: "Unauthorized" })
    }

    const result = await this.service.verifyWebsite(userId, link, replace)
    return res.status(200).json(result)
  })

  // Adds a website to the authenticated user.
  addWebsite = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id
    if (!userId) {
      return res.status(403).json({ error: "Unauthorized" })
    }

    const result = await this.service.addWebsite({userId, ...req.body})
    return res.status(result.statusCode).json(result.body)
  })

  // Removes a website from the authenticated user.
  removeWebsite = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id
    const { websiteID } = req.body as { websiteID: string }
    if (!userId) return res.status(403).json({ error: "Unauthorized" })

    const result = await this.service.removeWebsite(userId, websiteID)
    return res.status(200).json(result)
  })

  // Queues a scan request for a website.
  scanWebsite = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id
    const { websiteID, force } = req.body as { websiteID: string; force?: boolean }

    if (!userId) {
      return res.status(403).json({ error: "Unauthorized" })
    }

    const result = await this.service.scanWebsite(userId, websiteID, force)
    if ("statusCode" in result) {
      return res.status(result.statusCode).json(result.body)
    }
    return res.json(result)
  })

  // Handles the development test route.
  testWebsite = asyncHandler(async (req: Request, res: Response) => {
    const { domain } = req.body as { domain: string }
    const result = await this.service.testWebsite(domain)
    return res.status(result.statusCode).json(result.body)
  })
}
