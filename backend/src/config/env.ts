import dotenv from "dotenv"

dotenv.config()

export const env = {
    PORT : process.env.PORT || 5000,
    MONGO_URI : process.env.MONGO_URI ?? "",
    JWT_SECRET : process.env.JWT_SECRET ?? "",
    EMAIL_SECRET : process.env.EMAIL_SECRET ?? "",
    RABBITMQ_URL : process.env.RABBITMQ_URL ?? "",
    REDIS_URL : process.env.REDIS_URL ?? "",
    LINK_LIMIT : Number.parseInt(process.env.LINK_LIMIT ?? "5"),
    INSTANCES : Number.parseInt(process.env.INSTANCES ?? "1"),
    QUEUE : process.env.QUEUE ?? "priority_low",
    NEXT_QUEUE : process.env.NEXT_QUEUE ?? "priority_medium"
}