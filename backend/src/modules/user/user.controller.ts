import type { Request, Response } from "express"
import type { UserService } from "./user.service.js"
import { asyncHandler } from "../../utils/asyncHandler.js"

type AuthenticatedRequest = Request & {
	user?: {
		id: string
	}
}

export class UserController {
	constructor(private readonly service: UserService) {}

	// Handles the websites lookup request for the current user.
	getWebsites = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
		
	})
}
