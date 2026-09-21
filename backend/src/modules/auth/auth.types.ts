import type { Request, Response } from "express"
export type AuthUserPayload = {
    id: string
    username: string
    email: string
    emailVerified: boolean
}

export type RegisterInput = {
    username: string
    email: string
    password: string
}

export type LoginInput = {
    email: string
    password: string
}

export type ResendVerificationInput = {
    email: string
}

export type VerifyEmailInput = {
    token: string
}

export type AuthenticatedRequest = Request & {
    user?: {
        id: string
    }
}