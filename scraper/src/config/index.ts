import dotenv from "dotenv"

dotenv.config()

export const config = {
  RabbitMQ_URL: process.env.RABBITMQ_URL ?? "",
  Redis_URL: process.env.REDIS_PUBLIC_URL ?? "",
  ID: process.env.INSTANCE_ID ?? "",
  MODE : process.env.MODE ?? "development"
}
