import type { Response } from "express"
import { env } from "../config/env.js"

// env.NODE_ENV now falls back to the deprecated MODE_NODE alias (config/env.ts), so this no longer
// silently reads undefined in production and ships the auth cookie without Secure (REPORT §7.2).
// "prod" is this repo's spelling and "production" is the ecosystem's — accept both.
const isProduction = env.NODE_ENV === "prod" || env.NODE_ENV === "production"

export class CookieHandler {
  // Writes the signed session JWT into the httpOnly access_token cookie.
  static setAuthCookie = (res: Response, authToken: string) => {
    res.cookie("access_token", authToken, {
      httpOnly: true,
      secure: isProduction,        // only send over HTTPS in production
      sameSite: "lax",             // CSRF protection while allowing top-level navigation
      maxAge: 24 * 60 * 60 * 1000, // 1 day in ms — match your JWT expiresIn
      path: "/",
    })
  }

  // Clears the session cookie; the attributes must match setAuthCookie or the browser keeps it.
  static deleteAuthCookie = (res: Response) => {
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
    })
  }
}
