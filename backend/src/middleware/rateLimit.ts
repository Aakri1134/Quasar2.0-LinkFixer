import { rateLimit } from "express-rate-limit"
import { AppError } from "../utils/AppError.js"

const FIFTEEN_MINUTES = 15 * 60 * 1000

// Both limiters hand a 429 to `next()` rather than writing a response, so `errorHandler` stays the
// only place in the codebase that shapes an error body.
// NOTE: bucketing is per client IP, which only works behind a proxy when `trust proxy` is set —
// server.ts does that from env.TRUST_PROXY.

// Broad limiter for the whole /api surface. Generous enough for a dashboard that polls, tight
// enough to blunt scripted scraping. /health is mounted outside /api so container HEALTHCHECK
// polling never consumes budget.
export const apiLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 500,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError("Too many requests, please try again later", 429))
  },
})

// Strict limiter for credential and email-sending endpoints — /auth/login, /auth/register and
// /auth/resend-verification. Successful requests are counted too: `resend-verification` succeeding
// repeatedly is the email-bomb primitive, so skipping successes would defeat the point.
export const authLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError("Too many attempts, please try again in 15 minutes", 429))
  },
})
