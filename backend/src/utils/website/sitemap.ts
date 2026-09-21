import axios from "axios"
import { parseStringPromise } from "xml2js"
import { webHandler } from "../../service/webHandler.js"
import { normalizeHostname } from "../normalizeHostname.js"

// Whole-of-discovery budget. resolveSitemapFromRobots runs on the POST /api/website path, so a
// slow or dead third-party robots.txt must degrade to the conventional /sitemap.xml rather than
// hold the response open. webHandler.visit() already caps a single fetch at 5s; this caps the sum.
const DISCOVERY_BUDGET_MS = 6000

// Only the first N lines of robots.txt are inspected — some servers answer it with a whole SPA.
const MAX_ROBOTS_LINES = 2000

// Upper bound on seeds handed to the crawler; eval_sitemap expands each one anyway.
const MAX_SEED_SITEMAPS = 25

export type SitemapSeedSource = "robots" | "sitemap-index" | "default"

export type SitemapSeed = {
  robotsTxtUrl: string
  sitemapLinks: string[]
  source: SitemapSeedSource
}

// Parses a sitemap XML document and returns the discovered URLs.
export async function parseSitemap(sitemapUrl: string, timeoutMs = 10000): Promise<string[]> {
  try {
    const { data: xml } = await axios.get<string>(sitemapUrl, {
      timeout: timeoutMs,
      headers: { "User-Agent": "LinkFixerBot/1.0" },
    })

    const result = await parseStringPromise(xml)
    let links: string[] = []

    if (result.urlset) {
      const urls = result.urlset.url || []
      links = urls.map((entry: { loc?: string[] }) => entry.loc?.[0]).filter(Boolean)
    }

    if (result.sitemapindex) {
      const sitemaps = result.sitemapindex.sitemap || []
      links = sitemaps
        .map((entry: { loc?: string[] }) => entry.loc?.[0])
        .filter(Boolean)
    }

    return links
  } catch (error: any) {
    console.error("Sitemap parse error:", error.message)
    return []
  }
}

// Discovers the sitemaps to seed a new website with: robots.txt "Sitemap:" directives first,
// then the conventional /sitemap.xml. Never throws and never returns an empty list.
export async function resolveSitemapFromRobots(origin: string): Promise<SitemapSeed> {
  const robotsTxtUrl = `${origin}/robots.txt`
  const defaultSitemap = `${origin}/sitemap.xml`
  const fallback: SitemapSeed = {
    robotsTxtUrl,
    sitemapLinks: [defaultSitemap],
    source: "default",
  }

  let originHost: string
  try {
    originHost = normalizeHostname(new URL(origin).hostname)
  } catch {
    return fallback
  }

  const startedAt = Date.now()
  const remaining = () => DISCOVERY_BUDGET_MS - (Date.now() - startedAt)

  try {
    const robotsTxt = await webHandler.visitTxt(robotsTxtUrl)
    const declared = readSitemapDirectives(robotsTxt, origin, originHost)
    if (declared.length > 0) {
      return { robotsTxtUrl, sitemapLinks: declared, source: "robots" }
    }
  } catch (error) {
    // No robots.txt, a redirect loop, a timeout, an HTML error page — all mean the same thing here:
    // nothing was declared, so fall through to the conventional location.
    console.warn(`robots.txt unavailable for ${origin}:`, (error as Error).message)
  }

  // robots.txt told us nothing. Probe the conventional location: parseSitemap follows a
  // <sitemapindex> one level down, so a site whose /sitemap.xml is an index gives us its children
  // and we can seed those directly. A plain <urlset> yields page URLs instead — those are not
  // sitemaps, so they are discarded and /sitemap.xml itself is seeded for eval_sitemap to expand.
  const budget = remaining()
  if (budget > 500) {
    const discovered = await parseSitemap(defaultSitemap, Math.min(budget, 3000))
    const nested = discovered
      .filter((link) => isSameOriginSitemap(link, origin, originHost))
      .slice(0, MAX_SEED_SITEMAPS)

    if (nested.length > 0) {
      return { robotsTxtUrl, sitemapLinks: nested, source: "sitemap-index" }
    }
  }

  return fallback
}

// Reads the "Sitemap:" directives out of a robots.txt body, keeping only same-origin XML sitemaps.
function readSitemapDirectives(robotsTxt: string, origin: string, originHost: string): string[] {
  const found: string[] = []

  for (const line of robotsTxt.split(/\r?\n/).slice(0, MAX_ROBOTS_LINES)) {
    const match = /^\s*sitemap\s*:\s*(\S+)\s*$/i.exec(line)
    const value = match?.[1]
    if (!value) continue

    const resolved = toSameOriginUrl(value, origin, originHost)
    if (resolved && !found.includes(resolved)) {
      found.push(resolved)
    }
    if (found.length >= MAX_SEED_SITEMAPS) break
  }

  return found
}

// Resolves a directive value against the origin, rejecting anything that leaves that origin.
function toSameOriginUrl(value: string, origin: string, originHost: string): string | null {
  let url: URL
  try {
    url = new URL(value, origin)
  } catch {
    return null
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null
  // A robots.txt can legally name a sitemap on another host. We refuse those: the seed goes
  // straight into the crawl queue, so honouring it would let any added domain aim our scrapers at
  // a third party.
  if (normalizeHostname(url.hostname) !== originHost) return null

  return url.toString()
}

// True when a link is a same-origin URL that looks like a sitemap document rather than a page.
function isSameOriginSitemap(link: string, origin: string, originHost: string) {
  const resolved = toSameOriginUrl(link, origin, originHost)
  if (!resolved) return false

  const path = new URL(resolved).pathname.toLowerCase()
  return path.endsWith(".xml") || path.endsWith(".xml.gz") || path.includes("sitemap")
}
