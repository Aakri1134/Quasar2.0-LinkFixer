import type { Page } from "puppeteer"
import { config } from "../config/index.js"
import type {
  CheckLinkResult,
  CrawlSession,
  MergeUtilityResults,
  PageMetrics,
  Utility,
  VisitLinkResult,
} from "./types.js"
import { normalizeHostname } from "../utils/normalizeURLHostname.js"
import {
  RETRY_BASE_TIMEOUT_MS,
  RETRY_TIMEOUT_BACKOFF_MS,
} from "../utils/retryable.js"

const perfHookInstalledPages = new WeakSet<Page>()

export class PageUtilities {
  constructor(
    private readonly page: Page,
    private readonly utilities: Utility[],
    private readonly baseDomain: string | undefined,
  ) {}

  private async setupPerfObserverHook(): Promise<void> {
    if (perfHookInstalledPages.has(this.page)) return
    perfHookInstalledPages.add(this.page)

    await this.page.evaluateOnNewDocument(() => {
      ;(window as any).__perf = { lcp: 0, cls: 0, fcp: 0 }

      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.startTime > (window as any).__perf.lcp) {
            ;(window as any).__perf.lcp = entry.startTime
          }
        }
      })
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true })

      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            ;(window as any).__perf.cls += entry.value
          }
        }
      })
      clsObserver.observe({ type: "layout-shift", buffered: true })

      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === "first-contentful-paint") {
            ;(window as any).__perf.fcp = entry.startTime
          }
        }
      })
      paintObserver.observe({ type: "paint", buffered: true })
    })
  }

  private async openLinkInPage(
    link: string,
    retryCount: number,
  ): Promise<CheckLinkResult> {
    try {
      if (/\.(pdf|jpg|jpeg|png|gif|svg|mp4|mp3|zip|docx?)$/i.test(link)) {
        const response = await fetch(link, { method: "GET" })

        console.log(
          `[${config.ID}] :: FILE ${link} -> ${response.status} ${response.statusText}`,
        )

        if (response.ok) {
          return {
            content: "file",
            url: link,
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
          }
        }
      }
      const startTime = Date.now()
      const openResult = await this.page.goto(link, {
        waitUntil: "networkidle2",
        timeout: RETRY_BASE_TIMEOUT_MS + retryCount * RETRY_TIMEOUT_BACKOFF_MS,
      })
      const endTime = Date.now()
      if (!openResult) {
        console.log(`[${config.ID}] :: Navigation returned null :: ${link}`)

        return {
          content: "site",
          url: link,
          status: 0,
          statusText: "Navigation returned no response",
          ok: false,
          response_time: endTime - startTime,
        }
      }

      console.log(
        `[${config.ID}] :: OPEN ${link} -> ${openResult.status()} (${openResult.url()})`,
      )

      return {
        redirectedTo: openResult.url(),
        content: "site",
        url: link,
        status: openResult.status(),
        statusText: openResult.statusText(),
        ok: openResult.ok(),
        response_time: endTime - startTime,
      }
    } catch (err: any) {
      console.log(
        `[${config.ID}] :: Navigation FAILED :: ${link} :: Retry=${retryCount} :: ${err.message}`,
      )

      return {
        content: "site",
        url: link,
        status: 0,
        statusText: err.message,
        ok: false,
      }
    }
  }

  async visitLink(
    link: string,
    openResult: CheckLinkResult,
  ): Promise<VisitLinkResult> {
    const parsedLink = new URL(link)

    if (normalizeHostname(parsedLink.hostname) !== this.baseDomain) {
      console.log(
        `[${config.ID}] :: External Link
URL=${link}
parsed=${parsedLink.hostname}
normalized=${normalizeHostname(parsedLink.hostname)}
base=${this.baseDomain}`,
      )

      if (!openResult.ok) {
        console.log(`[${config.ID}] :: External link failed :: ${link}`)
      }

      return { ...openResult, type: "external" }
    }

    if (!openResult.ok) {
      console.log(`[${config.ID}] :: Internal link failed :: ${link}`)

      return { ...openResult, type: "internal" }
    }

    if (openResult.content === "file") {
      return { ...openResult, type: "internal" }
    }

    const links = await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll("a")).map((link) => link.href)
    })

    console.log(
      `[${config.ID}] :: ${link} :: Extracted ${links.length} raw links`,
    )

    const urlsToVisit: string[] = []

    let skippedEmpty = 0
    let skippedNonHttp = 0
    let skippedHash = 0

    for (const candidate of links) {
      if (!candidate || candidate.trim() === "") {
        skippedEmpty++
        continue
      }

      if (!candidate.startsWith("http")) {
        skippedNonHttp++
        continue
      }

      if (candidate.endsWith("#")) {
        skippedHash++
        continue
      }

      urlsToVisit.push(candidate)
    }

    console.log(
      `[${config.ID}] :: ${link} :: SUMMARY raw=${links.length} usable=${urlsToVisit.length} empty=${skippedEmpty} nonHttp=${skippedNonHttp} hash=${skippedHash}`,
    )

    return {
      ...openResult,
      urlsToVisit,
      type: "internal",
    }
  }

  async verifyMetadata() {}

  async verifySchema() {}

  /**
   * Reads back the metrics captured by the observers armed in
   * setupPerfObserverHook(). No observer setup happens here anymore —
   * doing it here (after page.goto() resolves) is what caused every
   * page after the first slow one to report zeroed-out lcp/cls/fcp.
   */
  async addAnalytics(): Promise<PageMetrics | null> {
    try {
      return await this.page.evaluate(() => {
        return new Promise<PageMetrics>((resolve) => {
          const finalize = () => {
            setTimeout(() => {
              const perf = (window as any).__perf ?? { lcp: 0, cls: 0, fcp: 0 }
              const metrics: PageMetrics = {
                lcp: perf.lcp,
                cls: perf.cls,
                fcp: perf.fcp,
              }

              const [nav] = performance.getEntriesByType(
                "navigation",
              ) as PerformanceNavigationTiming[]
              if (nav) {
                metrics.ttfb = nav.responseStart - nav.requestStart
                metrics.domLoad = nav.domContentLoadedEventEnd - nav.startTime
                metrics.loadTime = nav.loadEventEnd - nav.startTime
              }

              resolve(metrics)
            }, 500)
          }

          if (document.readyState === "complete") {
            finalize()
          } else {
            window.addEventListener("load", finalize, { once: true })
          }
        })
      })
    } catch (err: any) {
      console.log(`[${config.ID}] :: addAnalytics FAILED :: ${err.message}`)
      return null
    }
  }

  async handleLink<U extends Utility[]>(
    link: string,
    retryCount: number,
    utilities: U = this.utilities as unknown as U,
  ): Promise<MergeUtilityResults<U>> {
    console.log(
      `[${config.ID}] :: Fetching Page :: ${link} :: Retry=${retryCount}`,
    )

    // Ensure observers are armed before we ever navigate. Cheap no-op
    // on every call after the first (see WeakSet guard above).
    if (utilities.includes("analytics")) {
      await this.setupPerfObserverHook()
    }

    const openResult = await this.openLinkInPage(link, retryCount)

    const result: Record<string, unknown> = {}

    // analytics must run first — before visitLink does its own page.evaluate()
    // and before any subsequent navigation can wipe the performance entries
    if (
      utilities.includes("analytics") &&
      openResult.ok &&
      openResult.content === "site"
    ) {
      result.analytics = await this.addAnalytics()
    } else if (utilities.includes("analytics")) {
      result.analytics = null
    }

    if (utilities.includes("visit")) {
      const visitResult = await this.visitLink(link, openResult)
      Object.assign(result, visitResult)
    } else {
      Object.assign(result, openResult)
    }

    if (utilities.includes("eval_metadata")) {
      result.metadata = await this.verifyMetadata()
    }

    if (utilities.includes("eval_schema")) {
      result.schema = await this.verifySchema()
    }

    return result as MergeUtilityResults<U>
  }
}
