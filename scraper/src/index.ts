import { config } from "./config/index.js"
import { Scraper } from "./init/Scraper.js"
import { logWrite } from "./utils/fileWrite.js"

if (!config.ID || !config.RabbitMQ_URL || !config.Redis_URL) {
  throw new Error("Missing required environment variables")
}

const scraper = await Scraper.init()
await scraper.setup()
// logWrite(`${config.ID}.json`, {hello : "hello"})

// Docker sends SIGTERM on stop/restart and waits ~10s before SIGKILL. Without these handlers the
// process died mid-crawl, orphaning its Chromium child and stranding the domain until the
// Manager's 30s heartbeat timeout noticed.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    void scraper
      .shutdown(signal)
      .catch((err) => console.error(`[${config.ID}] :: Error during shutdown :: `, err))
      .finally(() => process.exit(0))
  })
}

process.on("unhandledRejection", (reason) => {
  console.error(`[${config.ID}] :: Unhandled rejection :: `, reason)
})
