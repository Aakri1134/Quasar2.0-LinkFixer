import puppeteer from "puppeteer"

export const browserOptions: puppeteer.LaunchOptions = {
  headless: true,
  args: [
    "--disable-setuid-sandbox",
    "--no-sandbox",
    "--disable-features=BlockInsecurePrivateNetworkRequests",
    "--disable-blink-features=AutomationControlled",
    "--disable-http2",
    "--disable-back-forward-cache"
  ],
}
