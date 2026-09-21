import type { Request, Response } from "express"
import { type WebsiteService } from "./website.service.js"
import { asyncHandler } from "../../utils/asyncHandler.js"
import type { ManagerTasksType } from "../../workers/managers/Manager.types.js"


export class WebsiteController {
  constructor(private readonly service: WebsiteService) {}

  // Returns the protected route payload.
  getProtected = (req: Request, res: Response) => {
    return res.json(this.service.getProtected(req.user ?? {}))
  }

  // Lists every website belonging to the authenticated user.
  getWebsiteForUser = asyncHandler(async (req : Request, res : Response) => {
    const userId = req.user.id
		const payload = await this.service.getWebsitesForUser(userId)
		return res.status(200).json(payload)
  })

  // get website by id
  getWebsiteByID = asyncHandler(async (req : Request, res : Response) => {
    const userId = req.user.id
    const {websiteID} = req.params
		const payload = await this.service.getWebsitesByID(userId, websiteID as string)
		return res.status(200).json(payload)
  })


  // Generates verification file for user to add to their domain
  generateVerificationFile = asyncHandler(async (req : Request, res : Response) => { 
    const userId = req.user.id
    const {websiteID} = req.body
    return res.status(200).json({
      msg : "Successfull generated file",
      data : await this.service.generateVerificationFileContent(websiteID, userId)
    })
  })

  // Verifies a website ownership token.
  verifyWebsite = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id
    const { websiteID, verificationURL } = req.body
    const result = await this.service.verifyWebsite(userId, websiteID, verificationURL)
    return res.status(200).json(result)
  })

  // Adds a website to the authenticated user.
  addWebsite = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id
    const result = await this.service.addWebsite({userId, ...req.body})
    return res.status(result.statusCode).json(result.body)
  })

  // Removes a website from the authenticated user.
  removeWebsite = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id
    const { websiteID } = req.body
    const result = await this.service.removeWebsite(userId, websiteID)
    return res.status(200).json(result)
  })

  // Queues a scan request for a website.
  scanWebsite = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id
    const { websiteID, force, task } = req.body as {
      websiteID: string
      force?: boolean
      task?: ManagerTasksType
    }
    const result = await this.service.scanWebsite(userId, websiteID, force, task)
    if ("statusCode" in result) {
      return res.status(result.statusCode).json(result.body)
    }
    return res.json(result)
  })

  // Reports the live scan state for a website.
  getScanStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id
    const { websiteID } = req.params
    const result = await this.service.getScanStatus(userId, websiteID as string)
    return res.status(200).json(result)
  })

  // Handles the development test route.
  testWebsite = asyncHandler(async (req: Request, res: Response) => {
    const { domain } = req.body as { domain: string }
    const result = await this.service.testWebsite(domain)
    return res.status(result.statusCode).json(result.body)
  })

  // Updates the scan frequency / mail subscription for a website.
  updateWebsiteSettings = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id
    const { websiteID } = req.params
    const result = await this.service.updateWebsiteSettings(userId, websiteID as string, req.body)
    return res.status(200).json(result)
  })

}
