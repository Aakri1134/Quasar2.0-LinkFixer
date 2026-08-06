import type { Browser, Page } from "puppeteer"

export type DomainAssignment = {
  domain: string
  linkQueue: string
  authentication?: string
  maxPages?: number
  limit?: number
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
}

/**
 * visit : visit a page and check for dead links(internal and external)
 * eval_metadata : visit a page and check validity of metadata for a page using AI LLM parser
 * eval_schema : visit a page and check validity of metadata for a page using AI LLM parser
 * response_time : visit a page and record the response_times for the page, to five a value for the frontend latencies
 */
export const SCRAPER_UTILITIES = ["visit", "eval_metadata", "eval_schema", "analytics"] as const

export type Utility = typeof SCRAPER_UTILITIES[number]

// Maps each utility to the extra fields it contributes to the result
export interface UtilityResultMap {
  visit: VisitLinkResult
  analytics: { analytics: PageMetrics | null }
  eval_metadata: { metadata: any | null }  // define these as you build them
  eval_schema: { schema: any | null }
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
export type MergeUtilityResults<U extends Utility[]> =
  UnionToIntersection<UtilityResultMap[U[number]]>

type UnionToIntersection<U> = 
  (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never