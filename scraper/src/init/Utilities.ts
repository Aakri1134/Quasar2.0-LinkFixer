import type { Page } from "puppeteer"
import { config } from "../config/index.js"
import type { CheckLinkResult, CrawlSession, VisitLinkResult } from "./types.js"

export class PageUtilities {
  // opens the link in the page for futher actions using the page

  constructor(private readonly page : Page, private readonly utilities : CrawlSession["utilities"], private readonly baseDomain : string | undefined){}

  private async openLinkInPage( link: string ): Promise<CheckLinkResult> {
    try {
      if (/\.(pdf|jpg|jpeg|png|gif|svg|mp4|mp3|zip|docx?)$/i.test(link)) {
        const response = await fetch(link, { method: "GET" })
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

      const openResult = await this.page.goto(link, {
        waitUntil: "networkidle2",
        timeout: 30000,
      })

      if (!openResult) {
        return {
          content: "site",
          url: link,
          status: 0,
          statusText: "Navigation returned no response",
          ok: false,
        }
      }

      return {
        redirectedTo: openResult.url(),
        content: "site",
        url: link,
        status: openResult.status(),
        statusText: openResult.statusText(),
        ok: openResult.ok(),
      }
    } catch (err: any) {
      console.log(`[${config.ID}] :: checkLink Failed Link : `, link)
      return {
        content: "site",
        url: link,
        status: 0,
        statusText: err.message,
        ok: false,
      }
    }
  }

  // Visits a link and collects any same-domain URLs found on the page.
  async visitLink( link: string, openResult : CheckLinkResult ): Promise<VisitLinkResult> {
    const parsedLink = new URL(link)
    
    if (parsedLink.hostname !== this.baseDomain) {
      console.log(`[${config.ID}] :: External Link : `, link)
      if (!openResult.ok) {
        console.log(`[${config.ID}] :: Link failed : `, link)
      }
      return { ...openResult, type: "external" }
    }
    
    if (!openResult.ok) {
      console.log(`[${config.ID}] :: Link failed : `, link)
      return { ...openResult, type: "internal" }
    }

    if (openResult.content === "file") {
      return { ...openResult, type: "internal" }
    }
    
    const links = await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll("a")).map((link) => link.href)
    })
    
    const urlsToVisit: string[] = []
    for (const candidate of links) {
      if (!candidate || candidate.trim() === "") {
        continue
      }
      if (!candidate.startsWith("http")) {
        continue
      }
      if (candidate.endsWith("#")) {
        continue
      }
      urlsToVisit.push(candidate)
    }
    
    return { ...openResult, urlsToVisit, type: "internal" }
  }
  
  async handleLink(link : string) : Promise<VisitLinkResult>{
    console.log(`[${config.ID}] :: Fetching Page :: ` + link)
    const openResult = await this.openLinkInPage(link)
    const res = this.visitLink(link, openResult)
    return res
  }
}
