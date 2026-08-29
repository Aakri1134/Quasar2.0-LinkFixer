import dotenv from "dotenv"

dotenv.config()

export const env = {
    // state awareness for the backend
    PORT : process.env.PORT || 5000,
    BACKEND_URL : process.env.BACKEND_URL || "http://localhost:5000",
    FRONTEND_URL : process.env.FRONTEND_URL || "http://localhost:5173",
    // MODE_NODE is a deprecated alias kept so existing compose files keep working — NODE_ENV wins.
    // `||` not `??` on purpose: compose passes NODE_ENV through as "" when the host has not set it,
    // and an empty string would satisfy `??` and defeat the alias.
    NODE_ENV : process.env.NODE_ENV || process.env.MODE_NODE || "dev",
    // hops of reverse proxy to trust for client IPs (rate limiting); 0 = trust nothing
    TRUST_PROXY : Number.parseInt(process.env.TRUST_PROXY ?? "0"),

    // db and message queue links
    MONGO_URI : process.env.MONGO_URI ?? "",
    REDIS_URL : process.env.REDIS_URL ?? "",
    RABBITMQ_URL : process.env.RABBITMQ_URL ?? "",

    // JWT Secrets
    JWT_SECRET : process.env.JWT_SECRET ?? "",
    EMAIL_SECRET : process.env.EMAIL_SECRET ?? "",

    // manager configs
    LINK_LIMIT : Number.parseInt(process.env.LINK_LIMIT ?? "10"),
    INSTANCES : Number.parseInt(process.env.INSTANCES ?? "1"),
    QUEUE : process.env.QUEUE ?? "priority_low",
    // must match the tiers named in models/website.ts — "priority_mid", never "priority_medium"
    NEXT_QUEUE : process.env.NEXT_QUEUE ?? "priority_mid",
    MAX_SCAN_ATTEMPTS : Number.parseInt(process.env.MAX_SCAN_ATTEMPTS ?? "2"),

    // live scan tracking over websockets
    WS_PATH : process.env.WS_PATH ?? "/socket.io",
    SCAN_PROGRESS_THROTTLE_MS : Number.parseInt(process.env.SCAN_PROGRESS_THROTTLE_MS ?? "1000"),

    // read API paging
    LINK_RESULT_PAGE_SIZE : Number.parseInt(process.env.LINK_RESULT_PAGE_SIZE ?? "100"),

    // AI + email reporting
    AI_API_KEY : process.env.AI_API_KEY ?? "",
    AI_MODEL : process.env.AI_MODEL ?? "gemini-2.0-flash",
    REPORT_EMAIL : process.env.REPORT_EMAIL ?? "",

    // mailing credentials for nodemailer
    SMTP_USER : process.env.SMTP_USER ?? "",
    SMTP_PASS : process.env.SMTP_PASS ?? "",
    SMTP_PORT : process.env.SMTP_PORT ?? 587,
    SMTP_HOST : process.env.SMTP_HOST ?? "smtp.gmail.com",
}
