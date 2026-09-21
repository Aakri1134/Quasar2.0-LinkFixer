import type { WebsiteQueueMessage } from "../../modules/website/website.types.js"

export type ResultAnalytics =  {
  lcp?:     number  
  cls?:     number
  fcp?:     number  
  ttfb?:    number  
  domLoad?: number  
  loadTime?:number 
}

export type ResultMetadata = {
  title: string | null
  titleLength: number
  description: string | null
  descriptionLength: number
  canonical: string | null
  robots: string | null
  lang: string | null
  hasViewport: boolean
  h1: string[]
  imageCount: number
  imagesMissingAlt: number
  openGraph: Record<string, string>
  twitter: Record<string, string>
}

// Mirrors the scraper's StructuredDataBlock: one JSON-LD block and whether it parsed.
export type ResultStructuredDataBlock = {
  types: string[]
  valid: boolean
  error: string | null
}

// Mirrors the scraper's PageSchema: the structured data found on one page.
export type ResultSchema = {
  jsonLd: ResultStructuredDataBlock[]
  microdataTypes: string[]
}

// One crawled link as the scraper wrote it. Mirrors `LinkRecord` - read the header before editing.
export type ResultRecords = {
  url?: string
  redirectedTo?: string
  content?: string
  status?: number
  statusText?: string
  timestamp: number
  analytics?: ResultAnalytics 
  // Optional to match `LinkRecord.type`: a record whose retries were exhausted carries no type at
  // all, so requiring it here made every failure record violate this type at runtime (plan.md 3.7).
  type?: "sitemap" | "internal" | "external"
  metadata?: ResultMetadata | null
  schema?: ResultSchema | null
}

export const MANAGER_TASKS = ["eval_sitemap", "eval_links", "eval_seo"] as const
export const SCRAPER_UTILITIES = ["visit", "eval_metadata", "eval_schema", "analytics", "eval_sitemap"] as const

export type ManagerTasksType = typeof MANAGER_TASKS[number]
export type ScraperUtilityType = typeof SCRAPER_UTILITIES[number]

// What the Manager actually reads off `<queue>_domain`: the producer's message plus an optional
// follow-up task. `next` lets a producer describe a pipeline without the Manager hard-coding it -
// a full SEO scan is enqueued as { task: "eval_sitemap", next: "eval_seo" } so discovery runs first
// and the SEO pass consumes what it found. Absent -> MANAGER_TASK_CHAIN decides.
export type ManagerQueueMessage = WebsiteQueueMessage & { next?: ManagerTasksType }

// Which scraper utilities each manager task asks for.
//
// `eval_seo` must NOT list "eval_sitemap": the scraper's PageUtilities.handleLink short-circuits and
// returns the moment that utility is present, so an eval_seo run parsed sitemaps and never loaded a
// page, checked a link, or extracted schema (plan.md 1.13). Sitemap discovery is its own task and is
// chained through MANAGER_TASK_CHAIN instead. "eval_metadata" is listed here because nothing else
// requested it, leaving a fully implemented scraper utility unreachable (plan.md 1.14).
export const MANAGER_TASK_TO_SCRAPER_UTILS_MAP : Partial<Record<ManagerTasksType, ScraperUtilityType[]>> = {
    eval_sitemap : ["eval_sitemap"],
    eval_links : ["visit", "analytics"],
    eval_seo : ["visit", "analytics", "eval_metadata", "eval_schema"]
}

// Default follow-up run for a completed task. Discovery only records links; something has to check
// them, and before this nothing did - the pipeline simply stopped after the sitemap pass (P0-3).
// A producer can override the hand-off per scan with `ManagerQueueMessage.next`.
export const MANAGER_TASK_CHAIN : Partial<Record<ManagerTasksType, ManagerTasksType>> = {
    eval_sitemap : "eval_links"
}

// Queue the reporter worker (plan.md 6.1) consumes. The Manager enqueues onto it after saving a
// check and never generates a report inline - report generation must stay off the crawl hot path.
export const REPORT_GENERATION_QUEUE = "report_generation"

export type ReportGenerationMessage = {
  checkID: string
}

// Lifecycle of one scan, published on SCAN_EVENTS_CHANNEL for the realtime bridge (plan.md 4.9).
// "started" carries the task, "completed" the check it produced, "failed" the attempt it died on.
export type ScanEventType = "started" | "completed" | "failed"

export type ScanEvent = {
  websiteID: string
  domain: string
  type: ScanEventType
  task?: ManagerTasksType
  checkID?: string
  attempt?: number
  at: number
}

export type ScanPhase = "crawling" | "completed"

// Value stored at scan:meta:<domain>. The realtime bridge resolves domain -> websiteID through it,
// because the scraper's progress frames only ever know the domain.
export type ScanMeta = {
  websiteID: string
  domain: string
  task: ManagerTasksType
  startedAt: number
  phase: ScanPhase
}

// TTL on scan:meta:<domain>. Long enough to outlive any real crawl, short enough that a manager that
// dies mid-run cleans up after itself instead of leaving the dashboard showing a scan forever.
export const SCAN_META_TTL_SECONDS = 6 * 60 * 60
