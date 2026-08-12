import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { connectDB } from "./database/connectdb.js"
import { registerRoutes } from "./routes.js"
import { errorHandler } from "./middleware/errorHandler.js"
import { env } from "./config/env.js"

export const createServer = async () => {
  await connectDB()
  const app = express()

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
    }),
  )
  app.use(cookieParser())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  registerRoutes(app)

  app.use(errorHandler)

  return app
}
