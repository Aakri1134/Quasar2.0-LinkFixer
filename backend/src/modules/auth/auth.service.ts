import jwt from "jsonwebtoken"
import { env } from "../../config/env.js"
import { sendVerificationEmail } from "../../utils/mail/mail.js"
import { AppError } from "../../utils/AppError.js"
import type { AuthRepository } from "./auth.repository.js"
import type { AuthUserPayload, LoginInput, RegisterInput, ResendVerificationInput, VerifyEmailInput } from "./auth.types.js"

export class AuthService {
    constructor(private readonly repo: AuthRepository) {}

    // Registers a new user and sends the verification email.
    async register(input: RegisterInput) {
        const email = input.email.trim().toLowerCase()
        const username = input.username.trim()
        const password = input.password.trim()

        const existingUser = await this.repo.findUserByEmail(email)
        if (existingUser) {
            throw new AppError("User already exists", 400)
        }

        const user = this.repo.createUser({ username, email, password })
        const verificationToken = user.generateVerificationToken()

        await Promise.all([
            this.repo.saveUser(user),
            sendVerificationEmail(email, verificationToken),
        ])

        const token = user.generateAuthToken()

        return {
            token,
            user: this.formatUser(user),
            msg: "Registration successful. Please check your email to verify your account.",
        }
    }

    // Returns the authenticated user's profile state.
    async verifyAuth(userId: string) {
        const user = await this.repo.findUserByIdWithoutPassword(userId)

        if (!user) {
            throw new AppError("User not found", 404)
        }

        return {
            authenticated: true,
            user: this.formatUser(user),
        }
    }

    // Validates credentials and returns the login token.
    async login(input: LoginInput) {
        const email = input.email.trim().toLowerCase()
        const password = input.password

        const user = await this.repo.findUserByEmail(email)
        if (!user) {
            // Same message and status as a wrong password: never reveal whether an email is registered.
            throw new AppError("Invalid credentials", 400)
        }

        const isMatch = await user.comparePassword(password)
        if (!isMatch) {
            throw new AppError("Invalid credentials", 400)
        }

        if (!user.emailVerified) {
            throw new AppError("Login unsuccessful. Please verify your email.", 401)
        }

        const token = user.generateAuthToken()

        return {
            token,
            success: true,
            user: this.formatUser(user)
        }
    }

    // Verifies the email token and marks the user as verified.
    async verifyEmail(input: VerifyEmailInput) {
        if (!input.token) {
            throw new AppError("Invalid Link", 400)
        }

        let decoded: { id?: string }
        try {
            decoded = jwt.verify(input.token, env.EMAIL_SECRET) as { id?: string }
        } catch {
            // The verification token now carries its own 24h expiry, so a stale link fails here
            // rather than on the database column check below.
            throw new AppError("Verification token is invalid or has expired", 400)
        }

        if (!decoded.id) {
            throw new AppError("Invalid Link", 400)
        }

        const user = await this.repo.findUserById(decoded.id)
        if (!user) {
            throw new AppError("User not found", 404)
        }

        if (
            user.verificationToken !== input.token ||
            !user.verificationTokenExpires ||
            new Date(user.verificationTokenExpires).getTime() < Date.now()
        ) {
            throw new AppError("Verification token is invalid or has expired", 400)
        }

        user.emailVerified = true
        user.verificationToken = null
        user.verificationTokenExpires = null
        await this.repo.saveUser(user)

        return {
            authToken: user.generateAuthToken(),
            user : this.formatUser(user)
        }
    }

    // Resends the verification email for an unverified user.
    async resendVerification(input: ResendVerificationInput) {
        const email = input.email.trim().toLowerCase()
        const user = await this.repo.findUserByEmail(email)

        if (!user) {
            throw new AppError("User not found", 404)
        }

        if (user.emailVerified) {
            throw new AppError("Email already verified", 400)
        }

        const verificationToken = user.generateVerificationToken()
        await this.repo.saveUser(user)
        await sendVerificationEmail(email, verificationToken)

        return {
            msg: "Verification email resent",
        }
    }

    // Revokes the tokens tied to a session by bumping the user's token version.
    async logout(token?: string) {
        if (!token) {
            return {
                success: true,
                msg: "Logged out successfully",
            }
        }

        try {
            const decoded = jwt.verify(token, env.JWT_SECRET) as { id?: string }
            if (decoded.id) {
                await this.repo.incrementTokenVersion(decoded.id)
            }
        } catch {
            // An expired or forged cookie has nothing to revoke — logout stays idempotent.
        }

        return {
            success: true,
            msg: "Logged out successfully",
        }
    }

    // Returns the current user without the password field.
    async getUser(userId: string) {
        const user = await this.repo.findUserByIdWithoutPassword(userId)

        if (!user) {
            throw new AppError("User not found", 404)
        }

        return user
    }

    private formatUser(user: { _id: unknown; username: string; email: string; emailVerified: boolean }) {
        return {
            id: String(user._id),
            username: user.username,
            email: user.email,
            emailVerified: user.emailVerified,
        } satisfies AuthUserPayload
    }
}