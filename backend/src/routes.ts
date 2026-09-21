import type { Express } from "express"
import mongoose from "mongoose"
import amqp from "amqplib"
import authRoutes from "./modules/auth/auth.routes.js"
import websiteRoutes from "./modules/website/website.routes.js"
import userRoutes from "./modules/user/user.routes.js"
import alertRoutes from "./modules/alert/alert.routes.js"
import checkRoutes from "./modules/check/check.routes.js"
import { env } from "./config/env.js"
import { getRedis } from "./database/connectRedis.js"
import { asyncHandler } from "./utils/asyncHandler.js"

type DependencyState = "up" | "down" | "not_configured"

// One long-lived RabbitMQ connection kept purely for liveness reporting. A container HEALTHCHECK
// polls /health every few seconds, and an AMQP handshake per poll would be far from cheap, so the
// connection is opened once and only re-opened after it closes or errors.
let rabbitProbe: Awaited<ReturnType<typeof amqp.connect>> | null = null
let rabbitProbePending: Promise<void> | null = null

const probeRabbit = async (): Promise<DependencyState> => {
  if (!env.RABBITMQ_URL) return "not_configured"
  if (rabbitProbe) return "up"

  if (!rabbitProbePending) {
    rabbitProbePending = amqp
      .connect(env.RABBITMQ_URL)
      .then((connection) => {
        // amqplib throws on an unhandled "error" event, so both listeners are mandatory.
        connection.on("close", () => { rabbitProbe = null })
        connection.on("error", () => { rabbitProbe = null })
        rabbitProbe = connection
      })
      .catch(() => { rabbitProbe = null })
      .finally(() => { rabbitProbePending = null })
  }

  await rabbitProbePending
  return rabbitProbe ? "up" : "down"
}

const probeRedis = async (): Promise<DependencyState> => {
  if (!env.REDIS_URL) return "not_configured"
  try {
    const redis = await getRedis()
    // Checked before PING because ioredis queues commands while disconnected, which would leave
    // the health check hanging until the socket came back instead of reporting the outage.
    if (redis.status !== "ready") return "down"
    await redis.ping()
    return "up"
  } catch {
    return "down"
  }
}

// 1 === connected; anything else (connecting, disconnecting, disconnected) is not servable.
const probeMongo = (): DependencyState =>
  env.MONGO_URI ? (mongoose.connection.readyState === 1 ? "up" : "down") : "not_configured"

export const registerRoutes = (app: Express) => {

  // Liveness + readiness for the API: 200 only when Mongo, Redis and RabbitMQ are all reachable,
  // 503 otherwise. Mounted outside /api so the rate limiter never throttles HEALTHCHECK polling.
  app.get("/health", asyncHandler(async (req, res) => {
    const [redis, rabbitmq] = await Promise.all([probeRedis(), probeRabbit()])
    const dependencies = { mongo: probeMongo(), redis, rabbitmq }
    const healthy = Object.values(dependencies).every((state) => state === "up")

    res.status(healthy ? 200 : 503).json({
      status: healthy ? "ok" : "degraded",
      uptime: Math.floor(process.uptime()),
      dependencies,
    })
  }))

  app.use("/api/auth", authRoutes)
  app.use("/api/website", websiteRoutes)
  app.use("/api/user", userRoutes)
  app.use("/api/alert", alertRoutes)
  app.use("/api/check", checkRoutes)
}
