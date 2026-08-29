// Redis key + channel builders for the backend (API and Manager workers).
//
// ⚠️ THIS FILE MUST STAY BYTE-FOR-BYTE IN SYNC WITH `scraper/src/utils/getRedisChannel.ts`.
// The two packages read and write the same keys, so a one-character difference does not fail
// loudly — the two services simply stop seeing each other's data. That is exactly the failure
// mode that produced REPORT.md P0-5 (`detail` vs `details`). If you change a key string here,
// change it there in the same commit, and vice versa.
//
// Backend callers must never build these strings inline (Manager.ts historically did).

// Redis SET of every link already checked for a domain — the L2 half of the crawl dedup.
export function getCheckedLinksKey(domain: string) {
  return `${domain}_checkedLinks`
}

// Shared pause semaphore for a domain: scrapers back off while it is non-zero.
export function getPauseStatusKey(domain: string) {
  return `${domain}_pause_status`
}

// Redis LIST the scrapers RPUSH link results onto; the Manager drains it on completion.
export function getResultKey(domain: string) {
  return `${domain}_results`
}

// Wall-clock duration of the last crawl of a domain, written by the scraper, read into Check.duration.
export function getDurationKey(domain: string) {
  return `${domain}_duration`
}

// Cancellation guard — set when a scan is enqueued, cleared to abort an in-flight run.
export function getQueuedKey(domain: string) {
  return `queued:${domain}`
}

// Count of browsers currently leased to one website by the Manager.
export function getActiveBrowsersKey(websiteID: string) {
  return `${websiteID}_active_browsers`
}

// Per-scan metadata (websiteID, task, startedAt, total) the realtime bridge uses to map domain → website.
export function getScanMetaKey(domain: string) {
  return `scan:meta:${domain}`
}

// Per-link progress feed for a domain. The API subscribes with PSUBSCRIBE scan:progress:*
// and fans each frame out to the dashboard over WebSockets; nothing else consumes it, so a
// missing subscriber is a no-op rather than an error.
export function getScanProgressChannel(domain: string) {
  return `scan:progress:${domain}`
}

// Command channel a single scraper listens on for its work assignment (scraper: getRedisChannel()).
export function getScraperCommandChannel(scraperID: string) {
  return `${scraperID}_domain`
}

// Heartbeat channel a single scraper publishes liveness on (scraper: getRedisHealthKey()).
export function getScraperStatusKey(scraperID: string) {
  return `${scraperID}_status`
}

// Lifecycle events for a whole scan (started / completed / failed), fanned out to the dashboard.
export const SCAN_EVENTS_CHANNEL = "scan:events"
