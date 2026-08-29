import express from "express"
import cors from "cors"
import helmet from "helmet"
import cookieParser from "cookie-parser"
import { connectDB } from "./database/connectdb.js"
import { getRedis } from "./database/connectRedis.js"
import { registerRoutes } from "./routes.js"
import { errorHandler } from "./middleware/errorHandler.js"
import { apiLimiter } from "./middleware/rateLimit.js"
import { env } from "./config/env.js"

export const createServer = async () => {
  await connectDB()

  // Redis is a hard dependency (scan state, SERVICES:DOWN, live tracking). Warm the shared client
  // here so a dead Redis is a startup failure, not a process exit in the middle of a request —
  // connectRedis() exits on a failed first connect. Skipped when unconfigured, which leaves the
  // pre-existing behaviour of `servicesOnline` answering 503 on the website routes.
  if (env.REDIS_URL) await getRedis()

  const app = express()

  // Behind a reverse proxy the real client IP arrives in X-Forwarded-For; without this every
  // request looks like it came from the proxy and the rate limiters bucket all users together.
  // Defaults to 0 — trust nothing — so a directly-exposed API cannot be spoofed.
  app.set("trust proxy", env.TRUST_PROXY)

  // Security headers. Only the resource policy is overridden: helmet's `same-origin` default is
  // aimed at served assets, and this process serves JSON to a browser SPA that may sit on another
  // origin. Helmet sets no CORS headers of its own, so the cors() config below is untouched.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  )

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
    }),
  )

  // After cors() so a 429 still carries the headers the browser needs to read it, and before the
  // body parsers so throttled requests are rejected without parsing their payload.
  app.use("/api", apiLimiter)

  app.use(cookieParser())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  registerRoutes(app)

  app.use(errorHandler)

  return app
}
