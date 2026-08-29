import cron from "node-cron"
import { Website } from "../../models/website.js"
import { getRedis } from "../../database/connectRedis.js"
import { getQueuedKey } from "../redisKeys.js"
import enqueue from "./enqueue.js"
import type { WebsiteQueueMessage } from "../../modules/website/website.types.js"

// How long a website waits between automatic scans.
const INTERVAL_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
}

// Only one process may dispatch. If two run the cron at the same minute they would both find the
// same due websites and enqueue each twice, so whoever takes this Redis lock does the round and
// everyone else skips it. The TTL is short - it only has to cover one dispatch, and expiring is
// better than a crashed scheduler holding the lock forever.
const LOCK_KEY = "scheduler:lock"
const LOCK_TTL_SECONDS = 300

async function acquireLock() {
  const redis = await getRedis()
  const won = await redis.set(LOCK_KEY, "1", "EX", LOCK_TTL_SECONDS, "NX")
  return won === "OK"
}

// Finds websites whose next scan is due and queues them at the lowest priority, so a scheduled
// crawl never competes with one a user just asked for.
export async function dispatchDueScans() {
  if (!(await acquireLock())) {
    return { dispatched: 0, skipped: true }
  }

  const now = Date.now()
  const candidates = await Website.find({
    scan_frequency: { $in: ["daily", "weekly", "monthly"] },
  }).select("domain scan_frequency last_scanned_at")

  const redis = await getRedis()
  let dispatched = 0

  for (const website of candidates) {
    const days = INTERVAL_DAYS[website.scan_frequency ?? "weekly"]
    if (!days) continue

    const last = website.last_scanned_at ? new Date(website.last_scanned_at).getTime() : 0
    if (last && now - last < days * 24 * 60 * 60 * 1000) continue

    // Do not pile a scheduled scan on top of one already running for this domain.
    const alreadyQueued = await redis.get(getQueuedKey(website.domain))
    if (alreadyQueued === "1") continue

    await redis.set(getQueuedKey(website.domain), 1)

    const queued = await enqueue(
      "priority_low_domain",
      JSON.stringify({
        id: website.id,
        attempt: 0,
        task: "eval_sitemap",
      } satisfies WebsiteQueueMessage),
    )

    if (queued === -1) {
      // Enqueue failed, so release the guard rather than leaving the domain permanently blocked.
      await redis.del(getQueuedKey(website.domain))
      continue
    }

    website.last_scanned_at = new Date()
    await website.save()
    dispatched++
  }

  console.log(`[Scheduler] Dispatched ${dispatched} scheduled scan(s)`)
  return { dispatched, skipped: false }
}

// Runs every day at midnight. Websites are only dispatched when their own interval has elapsed,
// so a daily tick is enough to serve daily, weekly and monthly alike.
export function startScheduler() {
  console.log("[Scheduler] Started - checking for due scans daily at midnight")
  return cron.schedule("0 0 * * *", () => {
    void dispatchDueScans().catch((err) => {
      console.error("[Scheduler] Dispatch failed :: ", err)
    })
  })
}
