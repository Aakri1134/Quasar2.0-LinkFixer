import { URL } from "url"
import amqp from "amqplib"
import { Redis } from "ioredis"
import puppeteer, { type Page } from "puppeteer"
import { config } from "../config/index.js"
import getRedisChannel, { getRedisCheckedLinksKey, getRedisDurationKey, getRedisHealthKey, getRedisPauseStatusKey, getRedisProgressChannel, getRedisResultKey } from "../utils/getRedisChannel.js"
import { createPage } from "./linkHelpers.js"
import type { CrawlSession, DomainAssignment, LinkMessage, LinkRecord, MergeUtilityResults, TimerHandle, Utility } from "./types.js"
import { connectRedis } from "../db/connectRedis.js"
import { browserOptions } from "../utils/browserOptions.js"
import { PageUtilities } from "./Utilities.js"
import { normalizeHostname, stripWww } from "../utils/normalizeURLHostname.js"
import { isRetryable, MAX_RETRIES } from "../utils/retryable.js"
import { isSharerLink } from "../utils/isSharerLink.js"
import { sleep } from "../utils/sleep.js"

export class Scraper {
  private interval: TimerHandle | null
  private scraperStatus: number
  private isActive: boolean
  private analytics: Record<any, any> = {}
  // Tracked so a SIGTERM can close the browser this scraper is currently holding.
  private activeSession: CrawlSession | null = null
  private isShuttingDown = false

  private constructor(
    private readonly channel: amqp.ConfirmChannel,
    private readonly pushBrowser: amqp.Channel,
    private readonly redis: Redis,
    private readonly subscriber: Redis,
  ) {
    this.interval = null
    this.scraperStatus = 0
    this.isActive = false
  }

  // Creates the scraper runtime and connects to RabbitMQ.
  static async init() {
    const connection = await amqp.connect(config.RabbitMQ_URL)
    const [channel, pushBrowser, redis, subscriber] = await Promise.all([connection.createConfirmChannel(), connection.createChannel(), connectRedis(), connectRedis()])
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
      console.log(
        `[${config.ID}] :: Error :: Another Domain assigned before completion\nAssigned :: ` +
          message,
      )
      return
    }

    if (this.isShuttingDown) {
      console.log(`[${config.ID}] :: Shutting down, refusing new domain assignment`)
      return
    }

    this.isActive = true
    this.scraperStatus = 1
    console.log(`[${config.ID}] :: Domain Assigned :: `, domainInfo)

    // JSON.parse used to sit outside this try. A malformed assignment threw past the handler
    // with isActive still true and scraperStatus still 1, so the scraper rejected every future
    // assignment while its heartbeat kept telling the Manager it was healthy — a permanent,
    // silent wedge. Everything that can throw now resets the flags and reports the failure.
    let domain = ""
    try {
      const assignment = JSON.parse(message) as DomainAssignment
      const { linkQueue, authentication, maxPages, limit, utilities } = assignment
      domain = assignment.domain

      console.log("Domain assignment settings :: ")
      console.log({ domain, linkQueue, authentication, maxPages, limit, utilities })

      if (!domain || !linkQueue) {
        throw new Error("Assignment missing domain or linkQueue")
      }

      await this.startConsumers(domain, linkQueue, utilities, authentication, maxPages, limit)
    } catch (err) {
      console.error("Error in starting Consumer for Domain :: " + domain + "\nError :: " + err)
      // startConsumers may have already launched a browser before failing; without this the
      // Chromium process leaked for the lifetime of the container.
      await this.discardActiveSession()
      this.scraperStatus = -1
      this.isActive = false
    }
  }

  // Tears down a session that never reached a normal cleanup, so the browser cannot leak.
  private async discardActiveSession() {
    const session = this.activeSession
    if (!session) {
      return
    }
    this.activeSession = null

    if (session.setPauseTimeout) clearTimeout(session.setPauseTimeout)
    if (session.pauseStatusTimeout) clearTimeout(session.pauseStatusTimeout)

    try {
      if (session.consumerTag) await this.channel.cancel(session.consumerTag)
    } catch (err) {
      console.error(`[${config.ID}] :: Error cancelling consumer during discard :: `, err)
    }
    await session.browser.close().catch(() => undefined)
  }

  // Publishes scraper status every few seconds.
  private setupScraperStatusPublisher() {
    // console.log("Setup Scrapper Status to push status to ", getRedisHealthKey())
    this.interval = setInterval(async () => {
      // console.log(
      //   `[${config.ID}] :: Sending scraper status = `,
      //   this.scraperStatus,
      // )
      await this.redis.publish(getRedisHealthKey(), this.scraperStatus.toString())
      if (this.scraperStatus === -1) {
        this.scraperStatus = 0
      }
    }, 7000)
  }

  // Opens the browser and prepares the page pool.
  async createSession(domain: string, linkQueue: string, authentication: string | undefined, maxPages: number, limit: number | undefined, utilities: Utility[]): Promise<CrawlSession> {
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
      baseDomain : domain, // for now I have removed all the https:// and www.  from domains, and this i am directly assigning baseDomain as domain
      utilities,
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
    // logWrite(`${config.ID}.json`, this.analytics)

    const durationKey = getRedisDurationKey(session.domain)
    const tempTime = await this.redis.get(durationKey)
    if (tempTime === null) {
      await this.redis.set(durationKey, completionTime)
    } else {
      await this.redis.set(
        durationKey,
        Math.max(completionTime, Number(tempTime)),
      )
    }
    this.isActive = false
    this.activeSession = null

    // Previously this pulled every checked link and every result document out of Redis, JSON
    // parsed all of them, and built a brokenLinks array that was then never read — megabytes of
    // transfer and parsing at the end of every crawl, purely to log two counts. SCARD/LLEN give
    // the same two numbers in O(1) without moving the payload.
    const [finalCheckedLinks, finalDataCount] = await Promise.all([
      this.redis.scard(session.checkedLinksKey),
      this.redis.llen(getRedisResultKey(session.domain)),
    ])

    console.log(`[${config.ID}] :: Checked Links : `, finalCheckedLinks)
    console.log(`[${config.ID}] :: Checked Links Data : `, finalDataCount)

    await this.publishProgress(session, "completed")

    console.log(`[${config.ID}] :: Completed Scraping for Domain :: ${session.domain} in ${completionTime} seconds`)
  }

  // Publishes a progress frame for the dashboard's live scan view. Fire-and-forget: the crawl
  // must never fail because nothing is listening, so errors are swallowed after logging.
  private async publishProgress(session: CrawlSession, phase: "crawling" | "completed", lastLink?: string) {
    try {
      await this.redis.publish(
        getRedisProgressChannel(session.domain),
        JSON.stringify({
          scraper: config.ID,
          domain: session.domain,
          phase,
          checked: session.checkedLinks.size,
          ...(lastLink ? { lastLink } : {}),
          at: Date.now(),
        }),
      )
    } catch (err) {
      console.error(`[${config.ID}] :: Failed to publish progress :: `, (err as Error).message)
    }
  }

  // Pauses the crawler when no page is active.
  private async pauseSession(session: CrawlSession) {
    if (!session.isPaused) {
      session.pauseTimeStart = Date.now()
      session.isPaused = true
      const pausedSemaphore = await this.redis.decr(session.pauseStatusKey)
      
      if (pausedSemaphore <= 0) {
        try {
          await this.cleanupSession(session)
        } catch (err) {
          console.error(`[${config.ID}] :: Error in cleanup :: `, err)
          this.scraperStatus = -1
        }
      }
    }
    // Was assigned without clearing first, so re-entering pauseSession stacked a second
    // checkPauseStatus loop on top of the existing one (checkPauseStatus already clears).
    // Also stop scheduling once the session is done, or the timers outlive the crawl.
    if (session.pauseStatusTimeout) {
      clearTimeout(session.pauseStatusTimeout)
      session.pauseStatusTimeout = null
    }
    if (session.hasCleaned) {
      return
    }
    session.pauseStatusTimeout = setTimeout(() => {
      void this.checkPauseStatus(session)
    }, 10000)
  }

  // Checks whether the crawler should remain paused.
  private async checkPauseStatus(session: CrawlSession) {
    if (!this.isActive || session.hasCleaned) {
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
      session.pauseStatusTimeout = null
    }
    if (session.hasCleaned) {
      return
    }
    session.pauseStatusTimeout = setTimeout(() => {
      void this.checkPauseStatus(session)
    }, 10000)
  }

  // Gets a page from the pool and clears pause timers.
  private async fetchPage(session: CrawlSession) {
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
    // console.log(`[${config.ID}] :: Page Completed and returned to pool`)
    session.pages.push(page)
    if (session.setPauseTimeout) {
      clearTimeout(session.setPauseTimeout)
    }
    session.setPauseTimeout = setTimeout(() => {
      void this.pauseSession(session)
    }, 10000)
  }

  // Rebuilds a browser page after a navigation failure.
  // Currently unreferenced — kept as the recovery path for a wedged browser. It used to inline
  // a second copy of browserOptions, which would silently drift from the real one; it now shares
  // the same const so a flag added in one place applies here too.
  private async refreshPage(session: CrawlSession) {
    await session.browser.close().catch(() => undefined)
    session.browser = await puppeteer.launch(browserOptions)
    session.pages = await Promise.all(
      Array(session.maxPages)
        .fill(null)
        .map(() => createPage(session.browser, session.authentication)),
    )
  }

  // Stores the current link result and enqueues discovered URLs.
  private async persistLinkResult(session: CrawlSession, linkInfo: MergeUtilityResults<typeof session.utilities>, depth: number, linkQueue: string) {
    const { urlsToVisit, redirectedTo, status: linkStatus, url, content, statusText, recordedInternalLinks, type } = linkInfo

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
    if(session.utilities.includes("analytics") && linkInfo.analytics){
      linkData.analytics = linkInfo.analytics
    }
    if(session.utilities.includes("eval_metadata")){
      linkData.metadata = linkInfo.metadata
    }
    if(session.utilities.includes("eval_schema")){
      linkData.schema = linkInfo.schema
    }
    if(session.utilities.includes("eval_sitemap")){
      linkData.type = "sitemap"
    }else if(type !== undefined){
      linkData.type = type
    }

    // Guards the literal string "undefined" being written as a checked link if a utility path
    // ever returns a result without a url (eval_sitemap only avoids this because handleLink
    // sets result.url explicitly).
    if (!url) {
      console.error(`[${config.ID}] :: persistLinkResult called without a url, skipping dedup write`)
      return
    }

    // These two writes used to be awaited one after the other, then followed by a full SMEMBERS
    // of the domain's checked-link set on EVERY link — an O(n) transfer per link, so O(n^2) over
    // a crawl (a 10k page site moved ~50M strings through Redis for no benefit). The local set is
    // already kept warm incrementally here and on the L2 hit path in processQueueMessage, and
    // cross-scraper freshness comes from the sismember check, which is O(1).
    await this.redis
      .multi()
      .sadd(session.checkedLinksKey, url)
      .rpush(getRedisResultKey(session.domain), JSON.stringify(linkData))
      .exec()

    session.checkedLinks.add(url)

    await this.publishProgress(session, "crawling", url)

    if (urlsToVisit !== undefined && urlsToVisit.length !== 0) {
      let queued = 0
      let skippedLocal = 0

      for (const nextUrl of urlsToVisit) {
        if(isSharerLink(nextUrl)) continue
        if (!session.checkedLinks.has(nextUrl)) {
          queued++
          this.channel.sendToQueue(
            linkQueue,
            Buffer.from(
              JSON.stringify({
                link: nextUrl,
                depth: depth + 1,
              }),
            ),
          )
        } else {
          skippedLocal++
        }
      }

      console.log(`[${config.ID}] :: ${url} :: DISCOVERED=${urlsToVisit.length} QUEUED=${queued} SKIPPED_LOCAL=${skippedLocal}`)
    }

    if(recordedInternalLinks && recordedInternalLinks.length > 0 && session.utilities.includes("eval_sitemap")){
      // assuming only internal links are present in a sitemap
      // if assumption is wrong, there is already a check for base domain before scraping, so non-permitted external links are not scraped for more links
      //
      // This was one awaited RPUSH per link plus a console.log per link. A single <urlset> can
      // carry 50k entries, which meant 50k sequential round trips to Redis for one sitemap file.
      // Chunked so it is a handful of calls instead, and the per-link log is now a count.
      const resultKey = getRedisResultKey(session.domain)
      const CHUNK = 1000
      for (let i = 0; i < recordedInternalLinks.length; i += CHUNK) {
        const batch = recordedInternalLinks
          .slice(i, i + CHUNK)
          .map((link) => JSON.stringify({ url: link, type: "internal" }))
        await this.redis.rpush(resultKey, ...batch)
      }
      console.log(`[${config.ID}] :: Recorded ${recordedInternalLinks.length} internal links from sitemap`)
    }
  }

  // Processes a single queue message.
  private bumpAnalytics(key: string, amount = 1) {
    this.analytics[key] = (this.analytics[key] || 0) + amount
  }

  private recordDuration(key: string, durationMs: number) {
    // keep count + sum for cheap running average; store raw values too if you want percentiles later
    this.analytics[`${key}Count`] = (this.analytics[`${key}Count`] || 0) + 1
    this.analytics[`${key}TotalMs`] = (this.analytics[`${key}TotalMs`] || 0) + durationMs
    
    if (!this.analytics[`${key}Samples`]) this.analytics[`${key}Samples`] = []
    this.analytics[`${key}Samples`].push(durationMs)
  }

  private async processQueueMessage(session: CrawlSession, msg: any) {
    const startedAt = Date.now()
    try {
      const page = await this.fetchPage(session)
      if (!page) {
        // impossible condition due to prefetch limitation on the channel
        throw new Error("No page available")
      }

      const data = JSON.parse(msg.content.toString()) as LinkMessage
      if (data.link === undefined || data.depth === undefined) {
        console.error(`[${config.ID}] :: ERROR :: Invalid type of data found in LinkChannel in Puppeteer`,)
        console.log(`[${config.ID}] :: DATA :: `, data)

        this.bumpAnalytics("invalidMessages")
        this.completedPage(session, page)
        this.channel.ack(msg)
        return
      }

      // console.log(`[${config.ID}] :: Processing Link :: ${data.link} at Depth :: ${data.depth}`,)

      this.bumpAnalytics("linksHandeled")

      const linkToScrape = stripWww(data.link)

      // to check if current browser has already checked this link
      if (session.checkedLinks.has(linkToScrape)) {
        // console.log(`[${config.ID}] :: Link already checked :: NO REDIS :: ` + linkToScrape,)
        this.bumpAnalytics("l1CacheHits")
        this.recordDuration("l1Hit", Date.now() - startedAt)
        this.completedPage(session, page)
        this.channel.ack(msg)
        return
      }

      // to check if another browser has already checked this link
      if (await this.redis.sismember(session.checkedLinksKey, linkToScrape)) {
        // console.log(`[${config.ID}] :: Link already checked :: REDIS :: ` + linkToScrape,)
        this.bumpAnalytics("redisCacheHits")
        this.recordDuration("l2Hit", Date.now() - startedAt)
        session.checkedLinks.add(linkToScrape)
        this.completedPage(session, page)
        this.channel.ack(msg)
        return
      }

      let linkInfo: MergeUtilityResults<typeof session.utilities>
      try {
        const utilities = new PageUtilities( page, session.utilities, session.baseDomain )
        linkInfo = await utilities.handleLink<typeof session.utilities>(linkToScrape, data.retryCount ?? 0)
        // console.log(`[${config.ID}] :: Link Info Recieved for :: ` + linkToScrape,)
      } catch (err) {
        const errMessage = String(err)
        this.bumpAnalytics("visitErrors")
        this.recordDuration("errored", Date.now() - startedAt)

        const attempt = (data.retryCount || 0) + 1

        if (isRetryable(errMessage) && attempt <= MAX_RETRIES) {
          // console.log(`[${config.ID}] :: Retrying (attempt ${attempt}) :: ${linkToScrape}`,)
          this.bumpAnalytics("retriesScheduled")
          this.channel.sendToQueue(
            session.linkQueue,
            Buffer.from(
              JSON.stringify({
                link: data.link,
                depth: data.depth,
                retryCount: attempt,
              }),
            ),
          )
        } else {
          // terminal — record as a genuine broken link so it shows up in your report
          await this.redis.rpush(
            getRedisResultKey(session.domain),
            JSON.stringify({
              url: linkToScrape,
              status: 0,
              statusText: errMessage,
              timestamp: Date.now(),
            }),
          )
          this.bumpAnalytics("permanentFailures")
        }

        await page.close()
        session.pages.push(
          await createPage(session.browser, session.authentication),
        )
        this.channel.ack(msg)
        return
      }

      this.bumpAnalytics("cacheMisses")
      this.recordDuration("scrape", Date.now() - startedAt)

      await this.persistLinkResult(session, linkInfo, Number(data.depth), session.linkQueue)

      // Politeness pause between real fetches. Cache hits skip it — they never touched the
      // remote host. Defaults to 0, so behaviour is unchanged unless CRAWL_DELAY_MS is set.
      if (config.CRAWL_DELAY_MS > 0) {
        await sleep(config.CRAWL_DELAY_MS)
      }

      this.completedPage(session, page)

      // Ack before cleanup, not after returning. This link's result is already persisted, so
      // the message is genuinely done; the old code returned without acking, and since
      // channel.cancel() does not release unacked messages, that message stayed invisible
      // until the whole connection dropped.
      this.channel.ack(msg)

      if (session.limit && session.checkedLinks.size > session.limit) {
        try {
          await this.cleanupSession(session)
        } catch (err) {
          console.error(`[${config.ID}] :: Error in cleanup: `, err)
          this.scraperStatus = -1
        }
        return
      }
    } catch (err) {
      this.bumpAnalytics("processingErrors")
      while (session.pages.length < session.maxPages) {
        session.pages.push(
          await createPage(session.browser, session.authentication),
        )
      }
      console.error(`[${config.ID}] :: ERROR IN SCRAPING PAGE :: ` + err)
      this.channel.ack(msg)
    }
  }

  // Runs the crawl for a single domain assignment.
  private async startConsumers( domain: string, linkQueue: string, utilities: Utility[], authentication?: string, maxPages = 3, limit?: number ) {
    console.log(
      `[${config.ID}] :: Starting Consumer for Domain :: ${domain}, Queue :: ${linkQueue}, MaxPages :: ${maxPages}, Limit :: ${limit}\n\n`,
    )

    this.scraperStatus = 1

    // Validated before createSession rather than after it. Launching Chromium first meant a bad
    // queue name threw with a live browser already running and no reference held to close it.
    if (!linkQueue.includes("_links")) {
      throw new Error(`Invalid Queue name`)
    }

    const session = await this.createSession( domain, linkQueue, authentication, maxPages, limit, utilities)
    // Held so shutdown() and the assignment error path can close this browser.
    this.activeSession = session

    session.setPauseTimeout = setTimeout(() => {
      void this.pauseSession(session)
    }, 10000)

    await this.redis.incr(session.pauseStatusKey)

    try {
      await this.channel.checkQueue(linkQueue)
    } catch (err) {
      console.log(
        `[${config.ID}] :: Error Ocurred, Queue does not exist in RabbitMQ server\nQueue :: ` +
          linkQueue,
      )
    }

    await this.channel.prefetch(maxPages)

    const consumeResult = await this.channel.consume(
      linkQueue,
      async (msg: any) => {
        if (!msg) {
          return
        }
        console.log("Getting message")
        await this.processQueueMessage(session, msg)
      },
    )

    session.consumerTag = consumeResult.consumerTag
  }

  // Stops accepting work, lets the in-flight link finish, then closes the browser and
  // connections. Without this every container restart orphaned a Chromium process and left the
  // domain stranded — the Manager only noticed 30s later via the heartbeat timeout.
  async shutdown(signal: string) {
    if (this.isShuttingDown) {
      return
    }
    this.isShuttingDown = true
    console.log(`[${config.ID}] :: ${signal} received, shutting down`)

    // Tell the Manager we are going away so it can re-lease the domain immediately instead of
    // waiting out the silence timeout.
    this.scraperStatus = -1
    await this.redis.publish(getRedisHealthKey(), "-1").catch(() => undefined)
    this.stopScraperStatusPublisher()

    const session = this.activeSession
    if (session) {
      // Stop pulling new links first, so the grace window drains rather than refills.
      try {
        if (session.consumerTag) await this.channel.cancel(session.consumerTag)
      } catch (err) {
        console.error(`[${config.ID}] :: Error cancelling consumer on shutdown :: `, err)
      }

      // Give the current link a bounded chance to finish and be acked.
      const deadline = Date.now() + config.SHUTDOWN_GRACE_MS
      while (session.pages.length < session.maxPages && Date.now() < deadline) {
        await sleep(200)
      }

      // Release this scraper's hold on the shared pause semaphore, otherwise the remaining
      // scrapers on this domain never see it reach zero and the crawl hangs until the Manager
      // times out.
      if (!session.isPaused && !session.hasCleaned) {
        await this.redis.decr(session.pauseStatusKey).catch(() => undefined)
      }

      await this.discardActiveSession()
    }

    await Promise.allSettled([
      this.subscriber.unsubscribe(getRedisChannel()),
      this.subscriber.quit(),
      this.redis.quit(),
      this.channel.close(),
      this.pushBrowser.close(),
    ])

    console.log(`[${config.ID}] :: Shutdown complete`)
  }
}
