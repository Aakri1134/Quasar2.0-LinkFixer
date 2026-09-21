import type { AddWebsiteFormValues } from "@/utils/schemas/website"

export type getWebsiteForUserOutput = {
  website: {
    domain: string
    updatedAt: Date
    id: string
  }[]
  user: string
  success: boolean
}

export type addWebsitePayload = Omit<
  AddWebsiteFormValues,
  "enableAuthentication"
>

export type deleteWebsitePayload = {
  websiteID: string
}

export type generateVerificationFilePayload = {
  websiteID: string
}

// What POST /website/verify/generate hands back. `issueDate` is a Date on the server and an ISO
// string by the time it crosses the wire.
export type generateVerificationFileOutput = {
  msg: string
  data: {
    token: string
    issueDate: string
    domain: string
  }
}

export type verifyWebsitePayload = {
  websiteID: string
  verificationURL: string
}

export type verifyWebsiteOutput = {
  success: boolean
  msg: string
}

export type getWebsiteByIDPayload = {
  website: Website
  user: string
  success: boolean
}

// The three scans the Manager knows how to run. Mirrors MANAGER_TASKS in
// backend/src/workers/managers/Manager.types.ts.
export const MANAGER_TASKS = ["eval_sitemap", "eval_links", "eval_seo"] as const

export type ManagerTask = (typeof MANAGER_TASKS)[number]

export type scanWebsitePayload = {
  websiteID: string
  task?: ManagerTask
  force?: boolean
}

// POST /website/scan answers 200 in two shapes: the queued one below, and a bare
// { msg: "website already in queue" } when the cancellation guard is still set.
export type scanWebsiteOutput = {
  msg: string
  size?: number
  task?: ManagerTask
  success?: boolean
}

// Lifecycle of one scan. "idle"/"queued" are derived by the API from the cancellation guard; the
// rest are written into scan:meta:<domain> by the Manager. Mirrors SCAN_PHASES on the backend.
export const SCAN_PHASES = [
  "idle",
  "queued",
  "started",
  "crawling",
  "completed",
  "failed",
] as const

export type ScanPhase = (typeof SCAN_PHASES)[number]

// Response body of GET /website/:websiteID/scan/status — the REST mirror of the socket feed, and
// the graceful-degrade path when WebSockets are blocked.
export type ScanStatus = {
  websiteID: string
  domain: string
  phase: ScanPhase
  checked: number
  results: number
  queued: boolean
  startedAt: number | null
  task: ManagerTask | null
}

export type Checks = {

}

export type Agreement = {
    agreement : boolean
    userId : string
    updatedAt : string
    createdAt : string
}

// One key/value pair the crawler replays on every request to an authenticated site.
export type CrawlCredential = {
  key: string
  value: string
}

export type WebsiteAuthentication = {
  cookies?: CrawlCredential[]
  headers?: CrawlCredential[]
}

// How often the scheduler should re-run a site. Mirrors the enum on WebsiteSchema.
export const SCAN_FREQUENCIES = ["off", "daily", "weekly", "monthly"] as const

export type ScanFrequency = (typeof SCAN_FREQUENCIES)[number]

export type Website = {
  estimatedTime: {
    priority_low: number
    priority_mid: number
    priority_high: number
  }
  _id: string
  userID: string[]
  ownerID?: string
  mail_subscribers: string[]
  // Fields below are optional because documents created before the schema grew them simply do not
  // carry the key — reading them off an older website must yield undefined, not crash.
  mail_subscription?: boolean
  scan_frequency?: ScanFrequency
  last_scanned_at?: string | null
  robots_txt_url?: string
  domain: string
  sitemap_links: string[]
  traced_links?: string[]
  options?: {
    authentication?: WebsiteAuthentication
  }
  agree_to_terms: Agreement[]
  checks: Checks[]
  updatedAt: string
  createdAt: string
}

export type ScanFrequencyValue = "off" | "daily" | "weekly" | "monthly"

export type updateWebsiteSettingsPayload = {
  websiteID: string
  scan_frequency?: ScanFrequencyValue
  mail_subscription?: boolean
}

export type updateWebsiteSettingsOutput = {
  success: boolean
  msg: string
  settings: {
    scan_frequency?: ScanFrequencyValue
    mail_subscription: boolean
  }
}
