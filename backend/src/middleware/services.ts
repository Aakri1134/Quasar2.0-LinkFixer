import { env } from "../config/env.js"
import { getRedis } from "../database/connectRedis.js"
import type { middlewareFn } from "./middleware.types.js"

const SERVICES_DOWN_KEY = "SERVICES:DOWN"

// Blocks requests when shared backend services are marked down.
const servicesOnline: middlewareFn = async (req, res, next) => {
  if (!env.REDIS_URL) {
    return res.status(503).json({
      error: "All services are currently down",
    })
  }

  let data: string | null = null
  try {
    const redis = await getRedis()
    data = await redis.get(SERVICES_DOWN_KEY)
  } catch (error) {
    // Redis is the only source of truth for service state — if it cannot be read we fail closed,
    // matching the behaviour when REDIS_URL is not configured at all.
    console.error("Failed to read SERVICES:DOWN:", (error as Error).message)
    return res.status(503).json({
      error: "All services are currently down",
    })
  }

  // Only the literal "1" means down. The previous `data !== null || ...` short-circuited on the
  // first clause, so the API returned 503 for every request the moment the key existed with any
  // value at all — including "0", which means up (REPORT P0-9).
  if (data === "1") {
    return res.status(503).json({
      error: "All services are currently down",
    })
  }

  return next()
}

export default servicesOnline
