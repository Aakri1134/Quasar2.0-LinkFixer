import type { Response } from "express"
import { env } from "../config/env.js"

const isProduction = env.NODE_ENV === "prod"

export class CookieHandler {
  static setAuthCookie = (res: Response, authToken: string) => {
    res.cookie("access_token", authToken, {
      httpOnly: true,
      secure: isProduction,        // only send over HTTPS in production
      sameSite: "lax",             // CSRF protection while allowing top-level navigation
      maxAge: 24 * 60 * 60 * 1000, // 1 day in ms — match your JWT expiresIn
      path: "/",
    })
  }

  static deleteAuthCookie = (res: Response) => {
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
    })
  }
}