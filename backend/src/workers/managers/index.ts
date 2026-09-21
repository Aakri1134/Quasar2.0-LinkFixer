import { sleep } from "../../utils/sleep.js";
import { Manager } from "./Manager.js";

/**
 * Queues Used :---
 *
 * priority_low_domain / priority_mid_domain / priority_high_domain :
 * stores : website domains
 * format : message : {
 *              id : uid for the website in mongo
 *              attempt : number of tries given to current website, max 3
 *              task : which manager task to run (eval_sitemap / eval_links / eval_seo)
 *              next : optional follow-up task to chain once this one completes
 *          }
 *
 *
 * <domain>_links :
 * stores : internal and external links of domains currently being processed
 * format : link : {
 *              link : string,
 *              depth : smallest diff from a sitemap link
 *          }
 *
 *
 * available_browsers :
 * stores : stores links of puppeteer browser instances currently idle
 * format : browser : {
 *              id : unique
 *              failure
 *          }
 *
 *
 * report_generation :
 * stores : checks waiting for the reporter worker to summarise them
 * format : message : { checkID : id of the saved Check document }
 */

/**  Redis ->
 *
 *  queued:${websiteID}
 *      VALUE : 0 -> stop execution 1 -> continue execution
 *      status of website queue
 *
 *  <website_id>_active_browsers
 *      VALUE :: number
 *      number of browsers currently working on a website_id
 *
 *  SERVICES:DOWN
 *      1 -> all services down, no scraper available
 *
 *  reports
 *      value -> as needed by coder for admin portal
 *      capped by the Manager to its newest entries, since nothing consumes it
 *
 *  scan:meta:<domain> / scan:events
 *      per-scan metadata and lifecycle events for the live dashboard
 *
 *
*/

// This used to be a flat sleep(15000) to wait for rabbitmq to come up. Retrying is better -
// it starts as soon as rabbitmq answers, and actually fails if it never does.
const MAX_STARTUP_ATTEMPTS = 10
const INITIAL_BACKOFF_MS = 1000
const MAX_BACKOFF_MS = 30000

// Builds the Manager, retrying with exponential backoff while its dependencies come up.
async function initManagerWithRetry() {
  let backoff = INITIAL_BACKOFF_MS

  for (let attempt = 1; attempt <= MAX_STARTUP_ATTEMPTS; attempt++) {
    try {
      return await Manager.init()
    } catch (err) {
      console.error(
        `[Manager] Startup attempt ${attempt}/${MAX_STARTUP_ATTEMPTS} failed :: `,
        (err as Error).message,
      )
      if (attempt === MAX_STARTUP_ATTEMPTS) throw err
      console.log(`[Manager] Retrying in ${backoff}ms`)
      await sleep(backoff)
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
    }
  }

  throw new Error("Manager startup exhausted its retries")
}

const manager = await initManagerWithRetry().catch((err) => {
  console.error("[Manager] Could not start :: ", err)
  process.exit(1)
})

await manager.startWebsiteProcessing()

// Docker sends SIGTERM on restart. Without this the manager dies holding a website message and
// its leased browsers, so the crawl gets stranded and the browser pool shrinks each restart.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    void (async () => {
      try {
        await manager.shutdown(signal)
      } catch (err) {
        console.error("[Manager] Error during shutdown :: ", err)
      } finally {
        process.exit(0)
      }
    })()
  })
}

process.on("unhandledRejection", (reason) => {
  console.error("[Manager] Unhandled rejection :: ", reason)
})
