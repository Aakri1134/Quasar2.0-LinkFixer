import type { Request, Response } from "express"
import { type AuthService } from "./auth.service.js"
import { asyncHandler } from "../../utils/asyncHandler.js"
import type { AuthenticatedRequest } from "./auth.types.js"
import { CookieHandler } from "../../utils/cookieHandler.js"


export class AuthController {
    constructor(private readonly service: AuthService) {}

    // Handles user registration.
    register = asyncHandler(async (req: Request, res: Response) => {
        const { username, email, password } = req.body
        const result = await this.service.register({ username, email, password })
        return res.json(result)
    })

    // Handles the auth verification check.
    verifyAuth = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        if(!req.user?.id) {
            return res.status(404).json({
                error : "Invalid token",
                success : false
            })
        }
        const result = await this.service.verifyAuth(req.user?.id)
        return res.json(result)
    })

    // Clears the auth cookie.
    logout = asyncHandler(async (_req: Request, res: Response) => {
        CookieHandler.deleteAuthCookie(res)
        return res.json({
            success: true,
            msg: "Logged out successfully",
        })
    })

    // Handles login and sets the auth cookie.
    login = asyncHandler(async (req: Request, res: Response) => {
        const { email, password } = req.body as { email: string; password: string }
        const { user, success, token } = await this.service.login({ email, password })
        CookieHandler.setAuthCookie(res, token)

        return res.status(200).json({
            msg: "Login successful.",
            success: success,
            user: user
        })
    })

    // Verifies the email token and returns the success page.
    verifyEmail = asyncHandler(async (req: Request, res: Response) => {
        const token = typeof req.query.token === "string" ? req.query.token : ""
        const {authToken, user} = await this.service.verifyEmail({ token })
        CookieHandler.setAuthCookie(res, authToken)

        return res.status(200).json({
            msg : "Verification Successful",
            success : true,
            user
        })
    })

    // Resends the verification email.
    resendVerification = asyncHandler(async (req: Request, res: Response) => {
        const { email } = req.body as { email: string }
        const result = await this.service.resendVerification({ email })
        return res.status(200).json(result)
    })

    // Returns the current user.
    getUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await this.service.getUser(req.user?.id ?? "")
        return res.json(user)
    })
}