import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/user.js";
import { AppError } from "../utils/AppError.js";
import type { middlewareFn } from "./middleware.types.js";

type AuthTokenClaims = NonNullable<Express.Request["user"]> & { tokenVersion?: number };

export const authMiddleware : middlewareFn = async (req, res, next) => {
  const token = req.cookies["access_token"];

  if (!token) {
    return res.status(403).json({ msg: "Unauthorized" });
  }

  let decoded: AuthTokenClaims;

  try {
    decoded = jwt.verify(token, env.JWT_SECRET) as AuthTokenClaims;
  } catch (err) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  if(!decoded.id || !decoded.email){
    return res.status(403).json({ error: "Unauthorized"})
  }

  // Logout and password change bump User.tokenVersion, which retires every token minted before them.
  // One lean read per authenticated request is the price of being able to revoke a 1-day token.
  let currentTokenVersion: number;

  try {
    const user = await User.findById(decoded.id).select("tokenVersion").lean();

    if (!user) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    currentTokenVersion = user.tokenVersion ?? 0;
  } catch (err) {
    return next(new AppError("Unable to verify your session", 503));
  }

  if ((decoded.tokenVersion ?? 0) !== currentTokenVersion) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  req.user = decoded;

  if (!decoded.emailVerified) {
    return res
      .status(403)
      .json({ error: "Email not verified, please verify your email" });
  }

  next();
};
