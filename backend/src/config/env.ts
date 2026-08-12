import dotenv from "dotenv"

dotenv.config()

export const env = {
    // state awareness for the backend
    PORT : process.env.PORT || 5000,
    BACKEND_URL : process.env.BACKEND_URL || "http://localhost:5000",
    FRONTEND_URL : process.env.FRONTEND_URL || "http://localhost:5173",
    NODE_ENV : process.env.NODE_ENV || "dev",

    // db and message queue links
    MONGO_URI : process.env.MONGO_URI ?? "",
    REDIS_URL : process.env.REDIS_URL ?? "",
    RABBITMQ_URL : process.env.RABBITMQ_URL ?? "",

    // JWT Secrets
    JWT_SECRET : process.env.JWT_SECRET ?? "",
    EMAIL_SECRET : process.env.EMAIL_SECRET ?? "",

    // manager configs
    LINK_LIMIT : Number.parseInt(process.env.LINK_LIMIT ?? "5"),
    INSTANCES : Number.parseInt(process.env.INSTANCES ?? "1"),
    QUEUE : process.env.QUEUE ?? "priority_low",
    NEXT_QUEUE : process.env.NEXT_QUEUE ?? "priority_medium",

    // mailing credentials for nodemailer
    SMTP_USER : process.env.SMTP_USER ?? "",
    SMTP_PASS : process.env.SMTP_PASS ?? "",
    SMTP_PORT : process.env.SMTP_PORT ?? 587,
    SMTP_HOST : process.env.SMTP_HOST ?? "smtp.gmail.com",
}