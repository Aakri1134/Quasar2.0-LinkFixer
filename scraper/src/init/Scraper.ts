import { URL } from "url"
import amqp from "amqplib"
import { Redis } from "ioredis"
import puppeteer, { type Browser, type Page } from "puppeteer"
import { config } from "../config/index.js"
import getRedisChannel, { getRedisCheckedLinksKey, getRedisHealthKey, getRedisPauseStatusKey } from "../utils/getRedisChannel.js"
import { createPage } from "./linkHelpers.js"
import type {
  CrawlSession,
  DomainAssignment,
  LinkMessage,
  LinkRecord,
  TimerHandle,
  VisitLinkResult,
} from "./types.js"
import { connectRedis } from "../db/connectRedis.js"
import { browserOptions } from "../utils/browserOptions.js"
import { PageUtilities } from "./Utilities.js"

export class Scraper {
  private interval: TimerHandle | null
  private scraperStatus: number
  private isActive: boolean

  private constructor(
    private readonly channel: amqp.Channel,
    private readonly pushBrowser: amqp.Channel,
    private readonly redis : Redis,
    private readonly subscriber : Redis,
  ) {
    this.interval = null
    this.scraperStatus = 0
    this.isActive = false
  }

  // Creates the scraper runtime and connects to RabbitMQ.
  static async init() {
    const connection = await amqp.connect(config.RabbitMQ_URL)
    const [channel, pushBrowser, redis, subscriber] = await Promise.all([connection.createChannel(), connection.createChannel(), connectRedis(), connectRedis()])
    return new Scraper(channel, pushBrowser, redis, subscriber)
  }

  // Sets up Redis, RabbitMQ, and the domain subscription loop.
  async setup() {

    // available_browsers : queue is supposed to store available scrapers, which will be picked by the Manager workers on other machines
    await this.pushBrowser.assertQueue("available_browsers")
    await this.pushBrowser.sendToQueue("available_browsers", Buffer.from(JSON.stringify({ id: config.ID })))

    console.log(`[${config.ID}] :: Browser pushed to queue`)

    // setting up a repeated status publisher to publish status to redis every 7 second (TODO time needs to be considered)
    this.setupScraperStatusPublisher()

    // when a scraper is picked from the pool to do certain task, it is informed about the task by pub-sub
    await this.subscriber.subscribe(getRedisChannel())
    this.subscriber.on("message", (domainInfo, message) => {
      void this.handleDomainAssignment(domainInfo, message)
    })
  }

  // Stops the periodic scraper status publisher.
  stopScraperStatusPublisher() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  // Handles incoming domain assignments from Redis.
  private async handleDomainAssignment(domainInfo: string, message: string) {
    if (domainInfo !== getRedisChannel()) {
      console.log(`[${config.ID}] :: Invalid Sucscriber`)
      return
    }
    if (this.isActive) {
      console.log(`[${config.ID}] :: Error :: Another Domain assigned before completion\nAssigned :: ` + domainInfo)
      return
    }

    this.isActive = true
    this.scraperStatus = 1
    console.log(`[${config.ID}] :: Domain Assigned :: `, domainInfo)

    const { domain, linkQueue, authentication, maxPages, limit } = JSON.parse(message) as DomainAssignment

    console.log("Domain assignment settings :: ")
    console.log( { domain, linkQueue, authentication, maxPages, limit } )

    try {
      await this.startConsumers( domain, linkQueue, authentication, maxPages, limit )
    } catch (err) {
      console.error( "Error in starting Consumer for Domain :: " + domain + "\nError :: " + err )
      this.scraperStatus = -1
      this.isActive = false
    }
  }

  // Publishes scraper status every few seconds.
  private setupScraperStatusPublisher() {
    console.log("Setup Scrapper Status to push status to ", getRedisHealthKey())
    this.interval = setInterval(async () => {
      console.log(`[${config.ID}] :: Sending scraper status = `, this.scraperStatus)
      await this.redis.publish(getRedisHealthKey(), this.scraperStatus.toString())
      if (this.scraperStatus === -1) {
        this.scraperStatus = 0
      }
    }, 7000)
  }

  // Opens the browser and prepares the page pool.
  async createSession(
    domain: string,
    linkQueue: string,
    authentication: string | undefined,
    maxPages: number,
    limit: number | undefined,
  ): Promise<CrawlSession> {
    const browser = await puppeteer.launch(browserOptions)

    const pages = await Promise.all(
      Array(maxPages)
        .fill(null)
        .map(() => createPage(browser, authentication)),
    )

    return {
      domain,
      linkQueue,
      authentication,
      maxPages,
      limit,
      startTime: Date.now(),
      checkedLinksKey: getRedisCheckedLinksKey(domain),
      pauseStatusKey: getRedisPauseStatusKey(domain),
      browser,
      pages,
      checkedLinks: new Set<string>(),
      hasCleaned: false,
      isPaused: false,
      pauseTimeStart: 0,
      totalPauseTime: 0,
      setPauseTimeout: null,
      pauseStatusTimeout: null,
      consumerTag: null,
      utilities : ["visit"]
    }
  }

  // Closes the browser and persists the crawl summary.
  private async cleanupSession(session: CrawlSession) {
    console.log(`[${config.ID}] :: Cleanup started`)
    if (session.hasCleaned) {
      return
    }

    session.hasCleaned = true
    if (session.setPauseTimeout) {
      clearTimeout(session.setPauseTimeout)
    }
    if (session.pauseStatusTimeout) {
      clearTimeout(session.pauseStatusTimeout)
    }
    this.scraperStatus = 0
    if (session.consumerTag) {
      await this.channel.cancel(session.consumerTag)
    }
    await session.browser.close()

    const endTime = Date.now()
    let pauseTime = 0
    if (session.pauseTimeStart !== 0) {
      pauseTime = Date.now() - session.pauseTimeStart
    }
    const completionTime = (endTime - session.startTime - pauseTime) / 1000
    const tempTime = await this.redis.get(`${session.domain}_duration`)
    if (tempTime === null) {
      await this.redis.set(`${session.domain}_duration`, completionTime)
    } else {
      await this.redis.set(
        `${session.domain}_duration`,
        Math.max(completionTime, Number(tempTime)),
      )
    }
    this.isActive = false

    const finalCheckedLinks = await this.redis.smembers(session.checkedLinksKey)
    const finalDataList = await this.redis.lrange(
      `${session.domain}_results`,
      0,
      -1,
    )
    const finalData = finalDataList.map((item) => JSON.parse(item) as LinkRecord)

    console.log(`[${config.ID}] :: Checked Links : `, finalCheckedLinks.length)
    console.log(`[${config.ID}] :: Checked Links Data : `, finalData.length)

    const brokenLinks: LinkRecord[] = []
    for (const data of finalData) {
      const stat = Number(data.status)
      if (stat >= 200 && stat < 300) {
        continue
      }
      brokenLinks.push(data)
    }

    console.log(
      `[${config.ID}] :: Completed Scraping for Domain :: ${session.domain} in ${completionTime} seconds`,
    )
    console.log(`Last pause time :::: ${pauseTime}`)
    console.log(`Total pause Time ::: ${session.totalPauseTime + pauseTime}`)
    console.log(`[${config.ID}] :: Broken Links  ::: ${brokenLinks.length}`)
    console.log(brokenLinks)
  }

  // Pauses the crawler when no page is active.
  private async pauseSession(session: CrawlSession) {
    if (!session.isPaused) {
      console.log(`[${config.ID}] :: Pausing Browser for Domain :: ` + session.domain)
      session.pauseTimeStart = Date.now()
      session.isPaused = true
      const pausedSemaphore = await this.redis.decr(session.pauseStatusKey)
      console.log(`[${config.ID}] :: pausedSemaphore ::: `, pausedSemaphore)
      if (pausedSemaphore <= 0) {
        try {
          await this.cleanupSession(session)
        } catch (err) {
          console.error(`[${config.ID}] :: Error in cleanup :: `, err)
          this.scraperStatus = -1
        }
      }
    }
    session.pauseStatusTimeout = setTimeout(() => {
      void this.checkPauseStatus(session)
    }, 10000)
  }

  // Checks whether the crawler should remain paused.
  private async checkPauseStatus(session: CrawlSession) {
    if (!this.isActive) {
      return
    }

    const pausedSemaphore = Number(await this.redis.get(session.pauseStatusKey))
    if (pausedSemaphore <= 0) {
      try {
        await this.cleanupSession(session)
      } catch (err) {
        console.error(`[${config.ID}] :: Error in cleanup :: `, err)
        this.scraperStatus = -1
      }
    }
    if (session.pauseStatusTimeout) {
      clearTimeout(session.pauseStatusTimeout)
    }
    session.pauseStatusTimeout = setTimeout(() => {
      void this.checkPauseStatus(session)
    }, 10000)
  }

  // Gets a page from the pool and clears pause timers.
  private async fetchPage(session: CrawlSession) {
    console.log(`[${config.ID}] :: Page fetched `)
    if (session.pages.length === 0) {
      throw new Error("Unexpected :: Pages more than maxPages fetched")
    }

    if (session.isPaused) {
      session.isPaused = false
      if (session.pauseTimeStart !== 0) {
        session.totalPauseTime += Date.now() - session.pauseTimeStart
        session.pauseTimeStart = 0
      }
      await this.redis.incr(session.pauseStatusKey)
    }
    if (session.setPauseTimeout) {
      clearTimeout(session.setPauseTimeout)
    }
    if (session.pauseStatusTimeout) {
      clearTimeout(session.pauseStatusTimeout)
    }
    return session.pages.pop()
  }

  // Returns a page to the pool and schedules the pause check.
  private completedPage(session: CrawlSession, page: Page) {
    if (session.pages.length >= session.maxPages) {
      // This should not happen, but keep the pool intact.
    }
    console.log(`[${config.ID}] :: Page Completed and returned to pool`)
    session.pages.push(page)
    if (session.setPauseTimeout) {
      clearTimeout(session.setPauseTimeout)
    }
    session.setPauseTimeout = setTimeout(() => {
      void this.pauseSession(session)
    }, 10000)
  }

  // Rebuilds a browser page after a navigation failure.
  private async refreshPage(session: CrawlSession) {
    await session.browser.close().catch(() => undefined)
    session.browser = await puppeteer.launch({
      headless: true,
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--disable-features=BlockInsecurePrivateNetworkRequests",
        "--disable-blink-features=AutomationControlled",
        "--disable-http2",
      ],
    })
    session.pages = await Promise.all(
      Array(session.maxPages)
        .fill(null)
        .map(() => createPage(session.browser, session.authentication)),
    )
  }

  // Stores the current link result and enqueues discovered URLs.
  private async persistLinkResult(
    session: CrawlSession,
    linkInfo: VisitLinkResult,
    depth: number,
    linkQueue: string,
  ) {
    const { urlsToVisit, redirectedTo, status: linkStatus, url, content, statusText } =
      linkInfo

    const linkData: LinkRecord = {
      timestamp: Date.now(),
    }

    if (url !== undefined) {
      linkData.url = url
    }
    if (redirectedTo !== undefined) {
      linkData.redirectedTo = redirectedTo
    }
    if (content !== undefined) {
      linkData.content = content
    }
    if (linkStatus !== undefined) {
      linkData.status = linkStatus
    }
    if (statusText !== undefined) {
      linkData.statusText = statusText
    }

    await this.redis.sadd(session.checkedLinksKey, url)
    await this.redis.rpush(`${session.domain}_results`, JSON.stringify(linkData))
    const checkedLinksData = await this.redis.smembers(session.checkedLinksKey)
    session.checkedLinks.add(url)
    checkedLinksData.forEach((link) => {
      session.checkedLinks.add(link)
    })

    if (urlsToVisit !== undefined && urlsToVisit.length !== 0) {
      for (const nextUrl of urlsToVisit) {
        if (!session.checkedLinks.has(nextUrl)) {
          await this.channel.sendToQueue(
            linkQueue,
            Buffer.from(
              JSON.stringify({
                link: nextUrl,
                depth: depth + 1,
              }),
            ),
          )
        }
      }
    }
  }

  // Processes a single queue message.
  private async processQueueMessage(session: CrawlSession, msg: any) {
    try {
      const page = await this.fetchPage(session)
      if (!page) {
        // impossible condition due to prefetch limitation on the channel
        throw new Error("No page available")
      }
      const utilities = new PageUtilities(page, session.utilities, session.baseDomain)

      const data = JSON.parse(msg.content.toString()) as LinkMessage
      if (data.link === undefined || data.depth === undefined) {

        console.error(`[${config.ID}] :: ERROR :: Invalid type of data found in LinkChannel in Puppeteer`)
        console.log(`[${config.ID}] :: DATA :: `, data)

        this.completedPage(session, page)
        this.channel.ack(msg)
        return
      }

      console.log(`[${config.ID}] :: Processing Link :: ${data.link} at Depth :: ${data.depth}`)

      // to check if current browser has already checked this link
      if (session.checkedLinks.has(data.link)) {
        console.log(`[${config.ID}] :: Link already checked :: NO REDIS :: ` + data.link)
        this.completedPage(session, page)
        this.channel.ack(msg)
        return
      }

      // to check if another browser has already checked this link
      if (await this.redis.sismember(session.checkedLinksKey, data.link)) {
        console.log(`[${config.ID}] :: Link already checked :: REDIS :: ` + data.link)
        session.checkedLinks.add(data.link)
        this.completedPage(session, page)
        this.channel.ack(msg)
        return
      }

      let linkInfo: VisitLinkResult
      try {
        // if baseDomain has not yet been assigned for this session, then set this baseDomain
        if (session.baseDomain === undefined) {
          const parsedURL = new URL(data.link)
          session.baseDomain = parsedURL.hostname
          console.log(`[${config.ID}] :: Base Domain Set to :: ` + session.baseDomain)
        }

        linkInfo = await utilities.handleLink(data.link)
        console.log(`[${config.ID}] :: Link Info Recieved for :: ` + data.link)
      } catch (err) {
        console.error(`[${config.ID}] :: ERROR IN VISITING LINK :: ` + err)
        await page.close()
        session.pages.push(await createPage(session.browser, session.authentication))
        this.channel.ack(msg)
        return
      }

      await this.persistLinkResult(session, linkInfo, Number(data.depth), session.linkQueue)
      this.completedPage(session, page)

      if (session.limit && session.checkedLinks.size > session.limit) {
        try {
          await this.cleanupSession(session)
        } catch (err) {
          console.error(`[${config.ID}] :: Error in cleanup: `, err)
          this.scraperStatus = -1
        }
        return
      }
      this.channel.ack(msg)
    } catch (err) {
      while (session.pages.length < session.maxPages) {
        session.pages.push(await createPage(session.browser, session.authentication))
      }
      console.error(`[${config.ID}] :: ERROR IN SCRAPING PAGE :: ` + err)
      this.channel.ack(msg)
    }
  }

  // Runs the crawl for a single domain assignment.
  private async startConsumers( domain: string, linkQueue: string, authentication?: string, maxPages = 3, limit?: number ) {
    console.log(`[${config.ID}] :: Starting Consumer for Domain :: ${domain}, Queue :: ${linkQueue}, MaxPages :: ${maxPages}, Limit :: ${limit}\n\n`)

    this.scraperStatus = 1
    const session = await this.createSession( domain, linkQueue, authentication, maxPages, limit )

    await this.redis.incr(session.pauseStatusKey)

    if (!linkQueue.includes("_links")) {
      throw new Error(`Invalid Queue name`)
    }

    try {
      await this.channel.checkQueue(linkQueue)
    } catch (err) {
      console.log( `[${config.ID}] :: Error Ocurred, Queue does not exist in RabbitMQ server\nQueue :: ` + linkQueue)
    }

    await this.channel.prefetch(maxPages)

    const consumeResult = await this.channel.consume(linkQueue, async (msg: any) => {
      if (!msg) {
        return
      }
      await this.processQueueMessage(session, msg)
    })

    session.consumerTag = consumeResult.consumerTag
  }
}
