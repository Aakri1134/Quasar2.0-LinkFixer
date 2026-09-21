import puppeteer from "puppeteer"
import { createPage } from "../init/linkHelpers.js"
import fs from "fs"
import path from "path"
import { browserOptions } from "../utils/browserOptions.js"
import { PageUtilities } from "../init/Utilities.js"
import { normalizeHostname } from "../utils/normalizeURLHostname.js"

async function checkUtilities() {
  const logsPath = path.join(process.cwd(), "src", "utils", "logs.json")
  console.log(logsPath)
  const visitedLinks = new Set()
  const finalResult: unknown[] = []
  const browser = await puppeteer.launch(browserOptions)
  const maxDepth = 2
  const testUrls = "https://www.ogcollege.io"
  const parsedURL = new URL(testUrls)

  function randomDelay(minMs: number, maxMs: number) {
    return new Promise((r) =>
      setTimeout(r, minMs + Math.random() * (maxMs - minMs)),
    )
  }

  const testFns = async (url: string, baseDomain: string, depth: number) => {
    if (depth >= maxDepth) return
    if (visitedLinks.has(url)) return

    const page = await createPage(browser)
    try {
      const utilities = new PageUtilities(page, ["visit"], normalizeHostname(parsedURL.hostname))
      const res = await utilities.handleLink(url, 0)

      visitedLinks.add(res.redirectedTo)
      finalResult.push(res)
      console.log("Visited url : " + url)

      if (!res.urlsToVisit) return
      for (const link of res.urlsToVisit) {
        // await randomDelay(1500, 4000) // stagger before each subsequent request
        await testFns(link, baseDomain, depth + 1)
      }
    } finally {
      await page.close()
    }
  }
  const start = Date.now()
  await testFns(testUrls, parsedURL.origin, 0)
  const end = Date.now()

  console.log(end - start)

  console.log(finalResult.length)

  fs.writeFileSync(logsPath, JSON.stringify({ data: finalResult }))
  process.exit(1)
}

console.log("Hello")
try {
  checkUtilities()
} catch (err) {
  console.error(err)
}
