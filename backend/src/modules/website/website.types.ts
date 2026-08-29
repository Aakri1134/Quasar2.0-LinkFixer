import type z from "zod"
import type { addWebsiteSchema, updateWebsiteSettingsSchema, verificationSchema } from "./website.schema.js"
import type { ManagerTasksType } from "../../workers/managers/Manager.types.js"

export type WebsiteQueueMessage = {
  id: string
  attempt: number
  task: ManagerTasksType
}

export type BrowserQueueMessage = {
  id: string
  failure: number
}

export type PopulatedWebsite = {
  domain: string
  updatedAt: Date
  id: string
}

export type WebsiteSummary = {
  domain: string
  updatedAt: Date
  id: string
}

export type AddWebsitePayload = z.infer<typeof addWebsiteSchema>["body"] & {userId : string}

export type VerificationPayload = z.infer<typeof verificationSchema>

// Vocabulary for a scan's lifecycle. "idle" and "queued" are derived by the API from the
// cancellation guard; the others are written into scan:meta:<domain> by the Manager, with
// "crawling" mirroring the scraper's own progress frames.
export const SCAN_PHASES = ["idle", "queued", "started", "crawling", "completed", "failed"] as const

export type ScanPhase = (typeof SCAN_PHASES)[number]

// Shape of the scan:meta:<domain> record. Every field is optional because the API reads what
// another process wrote: a partial or stale record must degrade, never break the response.
export type ScanMeta = {
  websiteID?: string
  domain?: string
  task?: ManagerTasksType
  phase?: ScanPhase
  startedAt?: number
  total?: number
}

// Response body of GET /api/website/:websiteID/scan/status.
export type ScanStatus = {
  websiteID: string
  domain: string
  phase: ScanPhase
  checked: number
  results: number
  queued: boolean
  startedAt: number | null
  task: ManagerTasksType | null
}

export type UpdateWebsiteSettingsInput = z.infer<typeof updateWebsiteSettingsSchema>["body"]
