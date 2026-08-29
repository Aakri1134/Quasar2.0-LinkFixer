// View-model shapes for the alert / check / scan payloads this folder renders.
//
// These mirror the REST contract exactly. They are deliberately structural and read-only: the
// service + hook layer (services/api/alert, services/api/check, hooks/{queries,mutations,realtime})
// is owned by another agent, so these components narrow whatever those hooks return through
// `asAlertsPage` / `asChecksPage` / `asCheckDetail` instead of importing types across that seam.
// Once the service types land, these can be replaced by a re-export of them.

export type AlertRecord = {
  _id: string
  website: string
  // One entry per check that hit this link — its length is the occurrence count.
  check: string[]
  link: string
  error_code?: string | null
  details?: unknown
  manager?: string | null
  solved?: boolean | null
  solvedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type AlertsPage = {
  alerts: AlertRecord[]
  total: number
  page: number
  limit: number
}

export type CheckSummary = {
  _id: string
  website: string
  task?: string | null
  manager?: string | null
  duration?: number | null
  aiReport?: string | null
  linkCount?: number | null
  createdAt: string
  updatedAt: string
}

export type ChecksPage = {
  checks: CheckSummary[]
  total: number
  page: number
  limit: number
}

export type LinkAnalytics = {
  lcp?: number | null
  cls?: number | null
  fcp?: number | null
  ttfb?: number | null
  domLoad?: number | null
  loadTime?: number | null
}

export type LinkMetadata = {
  title?: string | null
  titleLength?: number | null
  description?: string | null
  descriptionLength?: number | null
  canonical?: string | null
  robots?: string | null
  lang?: string | null
  hasViewport?: boolean | null
  h1?: string[] | null
  imageCount?: number | null
  imagesMissingAlt?: number | null
  openGraph?: Record<string, string> | null
  twitter?: Record<string, string> | null
}

export type LinkSchema = {
  jsonLd?: { types?: string[]; valid?: boolean; error?: string | null }[] | null
  microdataTypes?: string[] | null
}

export type CheckedLink = {
  url: string
  redirectedTo?: string | null
  content?: string | null
  status?: number | null
  statusText?: string | null
  timestamp?: string | number | null
  type?: string | null
  analytics?: LinkAnalytics | null
  metadata?: LinkMetadata | null
  schema?: LinkSchema | null
}

export type CheckDetail = {
  check: CheckSummary
  checkedLinks: CheckedLink[]
  totalLinks: number
}

export type ScanPhase = "idle" | "queued" | "crawling" | "completed" | "failed"

export type ScanTask = "eval_links" | "eval_sitemap" | "eval_seo"

export type ScanStatus = {
  websiteID?: string
  domain?: string
  phase: ScanPhase
  // Links the crawl has finished. Authoritative count, not a per-scraper one.
  checked?: number
  // Known size of the crawl. Absent until the frontier is known — the bar must stay indeterminate then.
  total?: number
  // Links still waiting in the frontier; `checked + queued` is a lower bound on `total`.
  queued?: number
  // Broken links recorded so far this scan.
  results?: number
  lastLink?: string
  startedAt?: string | number | null
  task?: string | null
}

// Fields the Website document carries that websiteService.types.ts's `Website` does not model yet.
// Settings reads them through this widening rather than editing that file (not owned here).
export type WebsiteSettingsFields = {
  ownerID?: string | null
  mail_subscription?: boolean
  mail_subscribers?: string[]
  scan_frequency?: "off" | "daily" | "weekly" | "monthly"
  last_scanned_at?: string | null
  robots_txt_url?: string | null
  traced_links?: string[]
  options?: {
    authentication?: {
      cookies?: { key?: string; value?: string }[]
      headers?: { key?: string; value?: string }[]
    } | null
  } | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

// Narrows an alert list response, tolerating a hook that hasn't fetched yet.
export function asAlertsPage(value: unknown, fallbackLimit: number): AlertsPage {
  if (!isRecord(value) || !Array.isArray(value.alerts)) {
    return { alerts: [], total: 0, page: 1, limit: fallbackLimit }
  }
  return {
    alerts: value.alerts as AlertRecord[],
    total: toNumber(value.total, (value.alerts as unknown[]).length),
    page: toNumber(value.page, 1),
    limit: toNumber(value.limit, fallbackLimit),
  }
}

// Narrows a check list response, tolerating a hook that hasn't fetched yet.
export function asChecksPage(value: unknown, fallbackLimit: number): ChecksPage {
  if (!isRecord(value) || !Array.isArray(value.checks)) {
    return { checks: [], total: 0, page: 1, limit: fallbackLimit }
  }
  return {
    checks: value.checks as CheckSummary[],
    total: toNumber(value.total, (value.checks as unknown[]).length),
    page: toNumber(value.page, 1),
    limit: toNumber(value.limit, fallbackLimit),
  }
}

// Narrows a single-check response into { check, checkedLinks, totalLinks }.
export function asCheckDetail(value: unknown): CheckDetail | null {
  if (!isRecord(value) || !isRecord(value.check)) return null
  const links = Array.isArray(value.checkedLinks)
    ? (value.checkedLinks as CheckedLink[])
    : []
  return {
    check: value.check as unknown as CheckSummary,
    checkedLinks: links,
    totalLinks: toNumber(value.totalLinks, links.length),
  }
}

const PHASES: ScanPhase[] = [
  "idle",
  "queued",
  "crawling",
  "completed",
  "failed",
]

// Narrows whatever useScanStatus returns into a ScanStatus.
//
// The realtime hook is written by another agent and may hand back the status directly or wrap it in
// react-query's `{ data }`. Both are unwrapped here so a shape change on that side degrades to
// "idle" instead of throwing inside render.
export function asScanStatus(value: unknown): ScanStatus {
  let source: unknown = value
  if (isRecord(source) && !("phase" in source)) {
    if ("data" in source) source = source.data
    else if ("status" in source) source = source.status
  }
  if (!isRecord(source)) return { phase: "idle" }

  const phase = PHASES.includes(source.phase as ScanPhase)
    ? (source.phase as ScanPhase)
    : "idle"

  const status: ScanStatus = { phase }
  if (typeof source.websiteID === "string") status.websiteID = source.websiteID
  if (typeof source.domain === "string") status.domain = source.domain
  if (typeof source.checked === "number") status.checked = source.checked
  if (typeof source.total === "number") status.total = source.total
  if (typeof source.queued === "number") status.queued = source.queued
  if (typeof source.results === "number") status.results = source.results
  if (typeof source.lastLink === "string") status.lastLink = source.lastLink
  if (typeof source.task === "string") status.task = source.task
  if (typeof source.startedAt === "string" || typeof source.startedAt === "number") {
    status.startedAt = source.startedAt
  }
  return status
}

// True while the pipeline owns the website — the point of this is to lock the "Run scan" button.
export function isScanLive(status: ScanStatus): boolean {
  return status.phase === "queued" || status.phase === "crawling"
}
