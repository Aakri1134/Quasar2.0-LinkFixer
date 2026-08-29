import type { Request, Response } from "express"
import type { UserService } from "./user.service.js"
import { asyncHandler } from "../../utils/asyncHandler.js"
import { CookieHandler } from "../../utils/cookieHandler.js"
import type { ChangePasswordInput, UpdateProfileInput } from "./user.types.js"

export class UserController {
	constructor(private readonly service: UserService) {}

	// Returns the websites belonging to the authenticated user.
	getWebsites = asyncHandler(async (req: Request, res: Response) => {
		const result = await this.service.getWebsites(req.user.id)
		return res.status(200).json(result)
	})

	// Returns the authenticated user profile.
	getProfile = asyncHandler(async (req: Request, res: Response) => {
		const result = await this.service.getProfile(req.user.id)
		return res.status(200).json(result)
	})

	// Updates the authenticated user profile.
	updateProfile = asyncHandler(async (req: Request, res: Response) => {
		const result = await this.service.updateProfile(req.user.id, req.body as UpdateProfileInput)
		return res.status(200).json(result)
	})

	// Changes the password and drops the cookie the token-version bump just invalidated.
	changePassword = asyncHandler(async (req: Request, res: Response) => {
		const result = await this.service.changePassword(req.user.id, req.body as ChangePasswordInput)
		CookieHandler.deleteAuthCookie(res)
		return res.status(200).json(result)
	})
}
