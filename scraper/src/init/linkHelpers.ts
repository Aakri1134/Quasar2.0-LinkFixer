import type { Browser, Page } from "puppeteer"

// Creates a preconfigured Puppeteer page.
export async function createPage(browser: Browser, authentication?: string) {
  const page = await browser.newPage()
  await Promise.all([
    page.setViewport({ width: 1280, height: 800 }),
    page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://www.google.com/",
      "Upgrade-Insecure-Requests": "1",
      ...(authentication ? { Authorization: `Bearer ${authentication}` } : {}),
    }),
    page.setUserAgent({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36",
    }),
  ])
  await page.setCacheEnabled(false)
  return page
}
