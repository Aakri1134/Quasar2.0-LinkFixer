import { connectDB } from "../../database/connectdb.js"
import { closeRedis } from "../../database/connectRedis.js"
import { startScheduler } from "../../utils/scheduler/schedule.js"

// Runs the cron in its own process rather than inside the API. Two API replicas would otherwise
// both tick, and while the Redis lock in schedule.ts stops the duplicate work, keeping the
// scheduler separate means restarting the API does not skip a dispatch.
await connectDB()

const task = startScheduler()

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    void (async () => {
      console.log(`[Scheduler] ${signal} received, stopping`)
      task.stop()
      await closeRedis().catch(() => undefined)
      process.exit(0)
    })()
  })
}

process.on("unhandledRejection", (reason) => {
  console.error("[Scheduler] Unhandled rejection :: ", reason)
})
