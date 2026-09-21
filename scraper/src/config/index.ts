import dotenv from "dotenv"
import { v4 } from "uuid"

dotenv.config()

export const config = {
  RabbitMQ_URL: process.env.RABBITMQ_URL ?? "",
  Redis_URL: process.env.REDIS_PUBLIC_URL ?? "",
  // INSTANCE_ID is what the makefile / compose actually passes per container. Falling back to a
  // fresh uuid meant every restart changed this scraper's Redis channel and made logs unattributable.
  ID: process.env.INSTANCE_ID || v4(),
  MODE : process.env.MODE ?? "development",

  // Politeness delay between page fetches on the same scraper. 0 keeps the previous
  // behaviour (fetch as fast as the page pool allows).
  CRAWL_DELAY_MS: Number.parseInt(process.env.CRAWL_DELAY_MS ?? "0"),

  // How long a browser is given to finish its current link before shutdown force-closes it.
  SHUTDOWN_GRACE_MS: Number.parseInt(process.env.SHUTDOWN_GRACE_MS ?? "10000"),
}
