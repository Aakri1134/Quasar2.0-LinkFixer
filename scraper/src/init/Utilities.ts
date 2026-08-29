import type { Page } from "puppeteer"
import { gunzip } from "node:zlib"
import { promisify } from "node:util"
import { config } from "../config/index.js"
import type {
  CheckLinkResult,
  CrawlSession,
  MergeUtilityResults,
  PageMetrics,
  SitemapScrapeResults,
  Utility,
  VisitLinkResult,
} from "./types.js"
import { normalizeHostname } from "../utils/normalizeURLHostname.js"
import {
  RETRY_BASE_TIMEOUT_MS,
  RETRY_TIMEOUT_BACKOFF_MS,
} from "../utils/retryable.js"

const perfHookInstalledPages = new WeakSet<Page>()
const gunzipAsync = promisify(gunzip)

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
   * eval_sitemap entry point. Fetches `link` as a single sitemap document
   * (index or urlset), transparently gunzipping .gz payloads, and
   * classifies what it finds by what the root element means for the
   * downstream queue — which re-runs every URL pulled from urlsToVisit
   * through handleLink with this same domain's utilities. Since the
   * domain here is configured with eval_sitemap, anything landing in
   * urlsToVisit gets re-parsed as XML. That constrains what's allowed in:
   *
   * - <sitemapindex>: each child <sitemap><loc> is itself another sitemap
   *   file, so re-running it through eval_sitemap is correct. Same-domain
   *   children go into urlsToVisit.
   * - <urlset>: each <url><loc> is an actual content page, not a sitemap.
   *   Putting these in urlsToVisit would send real HTML back through this
   *   XML parser on the next queue pass (the "UNRECOGNIZED root element"
   *   spam). So both the primary <loc> and any auxiliary same-domain
   *   locations (image/video namespaced <*:loc>, <xhtml:link> hreflang
   *   alternates) go into recordedInternalLinks instead — recorded, never
   *   requeued through this path.
   * - Anything off baseDomain is dropped either way.
   *
   * No recursion here: a <sitemapindex> only ever yields more urlsToVisit
   * entries, and the queue itself is what drives each child sitemap back
   * through this method (with CrawlSession.checkedLinks already guarding
   * against cycles/dupes at that level).
   */
  async verifySitemap(link: string): Promise<SitemapScrapeResults> {
    const urlsToVisit = new Set<string>()
    const recordedInternalLinks = new Set<string>()

    const xml = await this.fetchSitemapXml(link)
    if (!xml) {
      return { urlsToVisit: [], recordedInternalLinks: [] }
    }

    const isIndex = /<sitemapindex[\s>]/i.test(xml)
    const isUrlset = /<urlset[\s>]/i.test(xml)

    if (isIndex) {
      const sitemapBlocks = this.extractTagBlocks(xml, "sitemap")
      console.log(
        `[${config.ID}] :: Sitemap INDEX :: ${link} :: children=${sitemapBlocks.length}`,
      )

      for (const block of sitemapBlocks) {
        const childLoc = this.extractLoc(block)
        if (childLoc && this.isSameDomain(childLoc)) {
          urlsToVisit.add(childLoc)
        }
      }
    } else if (isUrlset) {
      const urlBlocks = this.extractTagBlocks(xml, "url")
      console.log(
        `[${config.ID}] :: Sitemap URLSET :: ${link} :: urls=${urlBlocks.length}`,
      )

      for (const block of urlBlocks) {
        const loc = this.extractLoc(block)
        if (loc && this.isSameDomain(loc)) {
          recordedInternalLinks.add(loc)
        }

        const auxLinks = [
          ...this.extractNamespacedLocs(block),
          ...this.extractHreflangLinks(block),
        ]

        for (const aux of auxLinks) {
          if (aux !== loc && this.isSameDomain(aux)) {
            recordedInternalLinks.add(aux)
          }
        }
      }
    } else {
      console.log(
        `[${config.ID}] :: Sitemap UNRECOGNIZED root element :: ${link}`,
      )
    }

    return {
      urlsToVisit: Array.from(urlsToVisit),
      recordedInternalLinks: Array.from(recordedInternalLinks),
    }
  }

  private async fetchSitemapXml(url: string): Promise<string | null> {
    try {
      const response = await fetch(url)

      if (!response.ok) {
        console.log(
          `[${config.ID}] :: Sitemap fetch FAILED :: ${url} :: ${response.status} ${response.statusText}`,
        )
        return null
      }

      let buf = Buffer.from(await response.arrayBuffer())

      if (this.isGzipBuffer(buf)) {
        buf = await gunzipAsync(buf)
      }

      return buf.toString("utf-8")
    } catch (err: any) {
      console.log(
        `[${config.ID}] :: Sitemap fetch ERROR :: ${url} :: ${err.message}`,
      )
      return null
    }
  }

  private isGzipBuffer(buf: Buffer): boolean {
    return buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b
  }

  private extractTagBlocks(xml: string, tag: string): string[] {
    const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "gi")
    const blocks: string[] = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(xml)) !== null) {
      if (match[1] !== undefined) {
        blocks.push(match[1])
      }
    }

    return blocks
  }

  private extractLoc(block: string): string | null {
    const match = /<loc(?:\s[^>]*)?>([\s\S]*?)<\/loc>/i.exec(block)
    return match && match[1] !== undefined ? this.cleanLocText(match[1]) : null
  }

  private extractNamespacedLocs(block: string): string[] {
    const regex = /<[\w-]+:loc(?:\s[^>]*)?>([\s\S]*?)<\/[\w-]+:loc>/gi
    const locs: string[] = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(block)) !== null) {
      const rawLoc = match[1]
      if (rawLoc !== undefined) {
        locs.push(this.cleanLocText(rawLoc))
      }
    }

    return locs
  }

  private extractHreflangLinks(block: string): string[] {
    const regex = /<xhtml:link\b[^>]*\bhref=["']([^"']+)["'][^>]*\/?>/gi
    const hrefs: string[] = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(block)) !== null) {
      const href = match[1]
      if (href !== undefined) {
        hrefs.push(this.decodeXmlEntities(href))
      }
    }

    return hrefs
  }

  private cleanLocText(raw: string): string {
    const trimmed = raw.trim()
    const cdataMatch = /^<!\[CDATA\[([\s\S]*)\]\]>$/.exec(trimmed)
    const unwrapped = cdataMatch?.[1] ? cdataMatch[1].trim() : trimmed
    return this.decodeXmlEntities(unwrapped)
  }

  private decodeXmlEntities(str: string): string {
    return str
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&")
  }

  private isSameDomain(url: string): boolean {
    if (!this.baseDomain) return true

    try {
      const parsed = new URL(url)
      return normalizeHostname(parsed.hostname) === this.baseDomain
    } catch {
      return false
    }
  }

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

  async handleLink<U extends Utility[]>(link: string,retryCount: number,utilities: U = this.utilities as unknown as U): Promise<MergeUtilityResults<U>> {
    console.log(
      `[${config.ID}] :: Fetching Page :: ${link} :: Retry=${retryCount}`,
    )

    const result: Record<string, unknown> = {}

    // Sitemap parsing is a plain HTTP/XML concern, never a browser one — it
    // never touches this.page, so it's a short-circuit path instead of
    // going through openLinkInPage.
    if (utilities.includes("eval_sitemap")) {
      Object.assign(result, await this.verifySitemap(link))
      // verifySitemap only returns {urlsToVisit, recordedInternalLinks} —
      // persistLinkResult destructures `url` off this result to sadd into
      // checkedLinksKey and to prefix its DISCOVERED/QUEUED log line.
      // Without this, that sadd stores the literal string "undefined"
      // instead of this sitemap's own URL, so it never actually gets
      // marked checked (visible as the "undefined ::" log prefix, and as
      // a latent cycle risk for sitemapindex files that reference each
      // other, since nothing then stops them being requeued forever).
      result.url = link
      return result as MergeUtilityResults<U>
    }

    // Ensure observers are armed before we ever navigate. Cheap no-op
    // on every call after the first (see WeakSet guard above).
    if (utilities.includes("analytics")) {
      await this.setupPerfObserverHook()
    }

    const openResult = await this.openLinkInPage(link, retryCount)

    // analytics must run first — before visitLink does its own page.evaluate()
    // and before any subsequent navigation can wipe the performance entries
    if ( utilities.includes("analytics") && openResult.ok && openResult.content === "site" ) {
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