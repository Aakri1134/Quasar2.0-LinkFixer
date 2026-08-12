import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { middlewareFn } from "./middleware.types.js";

export const authMiddleware : middlewareFn = (req, res, next) => {
  const token = req.cookies["access_token"];

  if (!token) {
    return res.status(403).json({ msg: "Unauthorized" });
  }
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as NonNullable<typeof req.user>;

    if(!decoded.id || !decoded.email){
      return res.status(403).json({ error: "Unauthorized"})
    }

    req.user = decoded;

    if (!decoded.emailVerified) {
      return res
        .status(403)
        .json({ error: "Email not verified, please verify your email" });
    }
    next();
  } catch (err) {
    res.status(403).json({ error: "Unauthorized" });
  }
};
