import type { loginSchema, registerSchema } from "@/utils/schemas/auth"
import type z from "zod"

export type RegisterInput = z.infer<typeof registerSchema>

type RegisterOutput = {
  msg: string
  success: boolean
  user: {
    email: string
    emailVerified: boolean
    id: string
    username: string
  }
}
export type SignUpUser = (x: RegisterInput) => Promise<RegisterOutput | null>

export type LoginInput = z.infer<typeof loginSchema>

type LoginOutput = {
  msg: string
  success: boolean
  user: {
    email: string
    emailVerified: boolean
    id: string
    username: string
  }
}
export type SignInUser = (p: LoginInput) => Promise<LoginOutput | null>

export type VerifyAuthOutput = {
  authenticated: boolean,
      user: {
        id: string,
        username: string,
        email : string,
        emailVerified: boolean,
      }
}

export type VerifyAuth = () => Promise<VerifyAuthOutput | null>

export type VerifyMail = (token: string) => Promise<any>
export type LogOutOutput = {
  success: boolean
  msg: string
}

export type LogOutUser = () => Promise<LogOutOutput>
