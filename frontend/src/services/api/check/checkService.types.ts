import type { ManagerTask } from "../website/websiteService.types"

// Core Web Vitals the scraper captured for one page. Mirrors ResultAnalytics on the backend.
export type CheckedLinkAnalytics = {
  lcp?: number
  cls?: number
  fcp?: number
  ttfb?: number
  domLoad?: number
  loadTime?: number
}

// Raw SEO metadata lifted off the DOM, deliberately unscored. Mirrors ResultMetadata.
export type CheckedLinkMetadata = {
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

export type CheckedLinkStructuredDataBlock = {
  types: string[]
  valid: boolean
  error: string | null
}

// Structured data found on one page. Mirrors ResultSchema.
export type CheckedLinkSchema = {
  jsonLd: CheckedLinkStructuredDataBlock[]
  microdataTypes: string[]
}

// One crawled link exactly as the scraper wrote it. Almost everything is optional: a record whose
// retries were exhausted carries a timestamp and little else.
export type CheckedLink = {
  url?: string
  redirectedTo?: string
  content?: string
  status?: number
  statusText?: string
  timestamp: number
  type?: "sitemap" | "internal" | "external"
  analytics?: CheckedLinkAnalytics
  metadata?: CheckedLinkMetadata | null
  schema?: CheckedLinkSchema | null
}

// One row of the scan history. `checkedLinks` is deliberately absent from the list response — it
// is an unbounded array, so only its length travels, as `linkCount`.
export type CheckSummary = {
  _id: string
  website: string | null
  task: ManagerTask
  manager?: string
  duration?: number
  aiReport?: string
  linkCount: number
  createdAt: string
  updatedAt: string
}

export type getChecksPayload = {
  websiteID: string
  page?: number
  limit?: number
}

export type getChecksOutput = {
  success: boolean
  checks: CheckSummary[]
  total: number
  page: number
  limit: number
}

export type getCheckByIdPayload = {
  checkID: string
  linkPage?: number
  linkLimit?: number
}

// One check plus a bounded window over its links. `totalLinks` is the untruncated length, so the
// UI can page without ever receiving the whole array.
export type getCheckByIdOutput = {
  success: boolean
  check: Omit<CheckSummary, "linkCount"> & { totalLinks: number }
  checkedLinks: CheckedLink[]
  totalLinks: number
  linkPage: number
  linkLimit: number
}
