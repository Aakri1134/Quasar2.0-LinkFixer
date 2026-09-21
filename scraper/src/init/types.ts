import type { Browser, Page } from "puppeteer"

export type DomainAssignment = {
  domain: string
  linkQueue: string
  authentication?: string
  maxPages?: number
  limit?: number
  utilities : Utility[]
}


export type TimerHandle = ReturnType<typeof setTimeout>

export type CrawlSession = {
  domain: string
  linkQueue: string
  authentication: string | undefined
  maxPages: number
  limit: number | undefined
  startTime: number
  checkedLinksKey: string
  pauseStatusKey: string
  browser: Browser
  pages: Page[]
  checkedLinks: Set<string>
  baseDomain?: string
  hasCleaned: boolean
  isPaused: boolean
  pauseTimeStart: number
  totalPauseTime: number
  setPauseTimeout: TimerHandle | null
  pauseStatusTimeout: TimerHandle | null
  consumerTag: string | null,
  utilities: typeof SCRAPER_UTILITIES[number][]
}

export type CheckLinkResult = {
  content: "site" | "file"
  url: string
  status: number
  statusText: string
  ok: boolean
  redirectedTo?: string
  response_time?: number
}

export type VisitLinkResult = CheckLinkResult & {
  type: "internal" | "external"
  urlsToVisit?: string[]
}

export type PageMetrics =  {
  lcp?:     number  
  cls?:     number
  fcp?:     number  
  ttfb?:    number  
  domLoad?: number  
  loadTime?:number 
}

export type LinkMessage = {
  link?: string
  depth?: number
  retryCount ?: number
}

export type LinkRecord = {
  url?: string
  redirectedTo?: string
  content?: string
  status?: number
  statusText?: string
  timestamp: number
  analytics?: PageMetrics
  type?: "sitemap" | "internal" | "external"
  metadata?: PageMetadata | null
  schema?: PageSchema | null
}

/**
 * Raw SEO-relevant metadata lifted straight off the DOM. Deliberately unscored — the scraper
 * only reports what the page contains; grading it (and any LLM involvement) belongs to the
 * backend reporter worker, which can see the whole crawl at once.
 */
export type PageMetadata = {
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

export type StructuredDataBlock = {
  types: string[]
  valid: boolean
  error: string | null
}

export type PageSchema = {
  jsonLd: StructuredDataBlock[]
  microdataTypes: string[]
}

/**
 * visit : visit a page and check for dead links(internal and external)
 * eval_metadata : extract the page's SEO metadata (title, description, canonical, OG/Twitter, headings)
 * eval_schema : extract the page's structured data (JSON-LD blocks and microdata itemtypes)
 * response_time : visit a page and record the response_times for the page, to five a value for the frontend latencies
 *
 * Note: eval_metadata/eval_schema only collect. No LLM runs in the scraper — the backend
 * reporter scores these once it can see the whole crawl.
 */
export const SCRAPER_UTILITIES = ["visit", "eval_metadata", "eval_schema", "analytics", "eval_sitemap"] as const

export type Utility = typeof SCRAPER_UTILITIES[number]

// Maps each utility to the extra fields it contributes to the result
export interface UtilityResultMap {
  visit: VisitLinkResult
  analytics: { analytics: PageMetrics | null }
  eval_metadata: { metadata: PageMetadata | null }
  eval_schema: { schema: PageSchema | null }
  eval_sitemap: SitemapScrapeResults
}

// Merges result types for all utilities in the array
export type HandleLinkResult<U extends Utility[]> =
  (U extends (infer T)[]
    ? T extends keyof UtilityResultMap
      ? UtilityResultMap[T]
      : never
    : never) extends infer R
  ? { [K in keyof R]: R[K] }  // flatten intersection to object
  : never

// More readable: explicit intersection builder
export type MergeUtilityResults<U extends Utility[]> = UnionToIntersection<UtilityResultMap[U[number]]>

export type SitemapScrapeResults = {
  urlsToVisit : string[],
  recordedInternalLinks : string[]
}

type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never