import type { Redis } from "ioredis"
import type { AnyBulkWriteOperation } from "mongoose"
import { connectDB } from "../../database/connectdb.js"
import { env } from "../../config/env.js"
import * as amqp from "amqplib"
import { closeRedis, getRedis } from "../../database/connectRedis.js"
import { StatusSubscriber } from "./StatusSubscriber.js"
import type { BrowserQueueMessage, WebsiteQueueMessage } from "../../modules/website/website.types.js"
import { Website } from "../../models/website.js"
import { Checks } from "../../models/check.js"
import { Alert } from "../../models/alert.js"
import {
  MANAGER_TASK_CHAIN,
  MANAGER_TASK_TO_SCRAPER_UTILS_MAP,
  REPORT_GENERATION_QUEUE,
  SCAN_META_TTL_SECONDS,
  type ManagerQueueMessage,
  type ManagerTasksType,
  type ReportGenerationMessage,
  type ResultRecords,
  type ScanEvent,
  type ScanMeta,
} from "./Manager.types.js"
import {
  SCAN_EVENTS_CHANNEL,
  getActiveBrowsersKey,
  getCheckedLinksKey,
  getDurationKey,
  getPauseStatusKey,
  getQueuedKey,
  getResultKey,
  getScanMetaKey,
  getScraperCommandChannel,
} from "../../utils/redisKeys.js"
import enqueue from "../../utils/scheduler/enqueue.js"

// Structured failure reports for the (still unbuilt) admin portal. utils/redisKeys.ts has no builder
// for this one because nothing outside the Manager touches it; add one there if that ever changes.
const REPORTS_KEY = "reports"

// The `reports` list has no consumer and had no bound, so it grew forever (REPORT.md 5.10). Every
// RPUSH is now followed by an LTRIM back to this many newest entries.
const REPORTS_KEY_MAX_ENTRIES = 1000

// The website currently being processed and the browsers leased to it. Held on the Manager instance
// as well as in websiteConsumer's closure so shutdown() can hand the work back instead of stranding
// it until a heartbeat timeout notices (plan.md 7.2).
type ActiveRun = {
  websiteMessage: amqp.ConsumeMessage
  browserBatch: amqp.ConsumeMessage[]
  browserConsumerTag?: string
  domain: string
}

export class Manager {
  private browserChannelQueue = "available_browsers"
  private websiteQueue: string = ""

  // Consumer tag of the website consumer, so shutdown can stop taking new work.
  private websiteConsumerTag: string | undefined

  private activeRun: ActiveRun | null = null

  private isShuttingDown = false

  // Flipped by the connection's close/error events; the /health listener reports it.
  private rabbitConnected = true

  private constructor(
    private readonly queue: string,
    private readonly nextQueue: string,
    private readonly instances: number, // number of srapers to be used
    private readonly maxLimit: number, // max number of links to be scraped
    private readonly maxAttempts: number, // how many times a single website may be attempted
    private readonly redis: Redis,
    private readonly linkChannel: amqp.Channel,
    private readonly browserChannel: amqp.Channel,
    private readonly channel: amqp.Channel,
    private readonly connection: Awaited<ReturnType<typeof amqp.connect>>,
  ) {
    this.websiteQueue = this.queue + "_domain"

    // amqplib throws on an unhandled "error" event, and a dead connection must not keep reporting
    // itself healthy, so both listeners are mandatory.
    this.connection.on("close", () => {
      this.rabbitConnected = false
    })
    this.connection.on("error", (err) => {
      this.rabbitConnected = false
      console.error("RabbitMQ connection error:", err)
    })

    console.log({
      queue,
      nextQueue,
      instances,
      maxLimit,
      maxAttempts,
    })
  }

  private static async createChannels() {
    const connection = await amqp.connect(env.RABBITMQ_URL)

    let linkChannel, browserChannel, channel
    ;[linkChannel, browserChannel, channel] = await Promise.all([
      connection.createChannel(),
      connection.createChannel(),
      connection.createChannel(),
    ])

    return { connection, linkChannel, browserChannel, channel }
  }

  // Records per-scan metadata for the realtime bridge, which only ever learns the domain from the
  // scraper's progress frames and resolves it to a website through this key.
  private async writeScanMeta(meta: ScanMeta) {
    try {
      await this.redis.set(getScanMetaKey(meta.domain), JSON.stringify(meta), "EX", SCAN_META_TTL_SECONDS)
    } catch (err) {
      console.error("Failed to write scan meta:", err)
    }
  }

  // Drops the per-scan metadata once the scan is over, so the dashboard stops showing it as live.
  private async clearScanMeta(domain: string) {
    try {
      await this.redis.del(getScanMetaKey(domain))
    } catch (err) {
      console.error("Failed to clear scan meta:", err)
    }
  }

  // Publishes one scan lifecycle event. Fire-and-forget on purpose: a crawl must never fail because
  // no dashboard happens to be listening.
  private async publishScanEvent(event: ScanEvent) {
    try {
      await this.redis.publish(SCAN_EVENTS_CHANNEL, JSON.stringify(event))
    } catch (err) {
      console.error("Failed to publish scan event:", err)
    }
  }

  // Hands a finished check to the reporter worker (plan.md 6.1/6.2). The queue simply buffers until
  // that consumer exists; generating the report inline would put an LLM call on the crawl hot path.
  private async requestReport(checkID: string) {
    try {
      await enqueue(REPORT_GENERATION_QUEUE, JSON.stringify({ checkID } satisfies ReportGenerationMessage))
    } catch (err) {
      console.error("Failed to enqueue report generation:", err)
    }
  }

  // Hands a run's bookkeeping back the moment its website message is settled. Called immediately
  // after every ack, because from that point on a shutdown must not nack the delivery again (the
  // broker would close the channel over the unknown delivery tag) and must not re-publish browsers
  // the completion path is already returning. Guarded on identity so a run that finishes after the
  // next one has started cannot detach its successor.
  private detachRun(batch: amqp.ConsumeMessage[]) {
    if (this.activeRun?.browserBatch === batch) this.activeRun = null
  }

  // Clears the in-flight bookkeeping for a finished run, once its browsers are back in the pool.
  private finishRun(batch: amqp.ConsumeMessage[]) {
    this.detachRun(batch)
    batch.length = 0
  }

  private async websiteConsumer(msg: amqp.ConsumeMessage | null) {
    const msg_website = msg
    if (!msg_website) {
      console.log("Null msg_website received")
      return
    }

    // Anything delivered while we are draining belongs to whichever manager takes over, not to us.
    if (this.isShuttingDown) {
      this.channel.nack(msg_website, false, true)
      return
    }

    const message: ManagerQueueMessage = JSON.parse(msg_website.content.toString())

    if (message.id === undefined || message.attempt === undefined || message.task === undefined) {
      console.log("Invalid Queue Message :: ", message)
      this.channel.ack(msg_website)
      return
    }
    const currWebsite = await Website.findById(message.id)
    if (!currWebsite) {
      // log invalid request
      this.channel.ack(msg_website)
      return
    }

    const websiteID = currWebsite.id
    const domain = currWebsite.domain
    const sitemap_links = currWebsite.sitemap_links

    console.log("website ::::::: ", domain)

    const linkQueue = domain + "_links"
    const activeBrowserKey = getActiveBrowsersKey(websiteID)
    const queuedKey = getQueuedKey(domain)
    const resultKey = getResultKey(domain)
    console.log(queuedKey)

    console.log(`Recieved :: ${domain}, By :: ${this.queue}`)

    // checking if website execution cancelled after queuing
    const isCancelled = await this.redis.get(queuedKey)
    if (Number(isCancelled) !== 1) {
      console.log("WEBSITE EXECUTION CANCELLED")
      console.log("isCancelled ::: ", isCancelled)
      this.channel.ack(msg_website)
      return
    }

    // Job start. The dashboard opens its live view on this event, and the realtime bridge needs the
    // domain -> website mapping in place before the first progress frame arrives (plan.md 4.9).
    const startedAt = Date.now()
    await this.writeScanMeta({ websiteID, domain, task: message.task, startedAt, phase: "crawling" })
    await this.publishScanEvent({ websiteID, domain, type: "started", task: message.task, at: startedAt })

    // Initialize active browser counter for this domain
    await this.redis.set(activeBrowserKey, 0)

    // create a queue and push links into queue
    this.linkChannel.assertQueue(linkQueue, { durable: true })
    await this.linkChannel.purgeQueue(linkQueue)
    for (const link of sitemap_links) {
      this.linkChannel.sendToQueue(
        linkQueue,
        Buffer.from(JSON.stringify({ link, baseDomain: domain, depth: 0 })),
        { persistent: true },
      )
    }
    if(message.task !== "eval_sitemap"){
      for (const link of currWebsite.traced_links) {
        this.linkChannel.sendToQueue(
          linkQueue,
          Buffer.from(JSON.stringify({ link, baseDomain: domain, depth: 0 })),
          { persistent: true },
        )
      }
    }

    // Mutated in place rather than reassigned, so `activeRun` below always sees the live batch.
    const browser_message_batch: amqp.ConsumeMessage[] = []

    const activeRun: ActiveRun = {
      websiteMessage: msg_website,
      browserBatch: browser_message_batch,
      domain,
    }
    this.activeRun = activeRun

    // allocate queue to available vacant puppeteer instances
    this.browserChannel.assertQueue(this.browserChannelQueue, { durable: true })
    this.browserChannel.prefetch(this.instances)

    let browserConsumerTag: string | undefined

    await this.redis.set(getPauseStatusKey(domain), 0)
    await this.redis.del(getCheckedLinksKey(domain))
    await this.redis.del(resultKey)

    this.browserChannel.consume(this.browserChannelQueue,
        async (msg_browser: amqp.ConsumeMessage | null) => {
          if (!msg_browser) {
            throw new Error("")
          }
          const browser: BrowserQueueMessage = JSON.parse(msg_browser.content.toString())
          browser_message_batch.push(msg_browser)
          const uid = browser.id

          // Increment active browser count
          await this.redis.incr(activeBrowserKey)

          const authentication = currWebsite.options ? currWebsite.options.authentication : null,
            maxPages = 3,
            limit = this.maxLimit

          console.log(`Browser :::::::::::::::::::::::::::::::::::::: `, browser)
          console.log("Publishing through redis ::: ")
          console.log({ domain, limit, maxPages, linkQueue, authentication })

          await this.redis.publish(getScraperCommandChannel(uid), JSON.stringify({ domain, limit, maxPages, linkQueue, authentication, utilities : MANAGER_TASK_TO_SCRAPER_UTILS_MAP[message.task] }))

          // Watches this specific browser's health so we notice if it
          // dies, fails, or finishes. All the Redis pub/sub and timeout
          // plumbing lives inside StatusSubscriber now; we just supply
          // what should happen in each case.
          const statusSubscriber = await StatusSubscriber.create(uid)

          // Runs whenever the browser fails, either by reporting -1 or
          // by going silent for 30s. `shouldIncrementFailureCount` is
          // true only the very first time this browser has ever failed
          // (i.e. it never even sent a single "still working" message).
          const onFailure = async (shouldIncrementFailureCount: boolean) => {
            console.log("Handling Failure")
            const activeBrowsers = await this.redis.decr(activeBrowserKey)

            if (activeBrowsers <= 0) {
              console.log("Failure and 0 ACTIVE BROWSER\n")
              console.log(message)

              // `attempt` is 0-based, so the last permitted attempt is maxAttempts - 1.
              if (Number(message.attempt) >= this.maxAttempts - 1) {
                // Too many attempts already: log a fatal error and stop retrying this website.
                await this.redis.del(queuedKey)
                await this.redis.del(activeBrowserKey)
                console.log("[Manual] [1] Acking website, as max attempts reached for one website")
                this.channel.ack(msg_website)
                this.detachRun(browser_message_batch)
                console.log("[Manual] [2] Acked website, as max reached without error")

                const data =  JSON.stringify({
                    trace: `/backend/workers/index.js`,
                    level: `high`,
                    type: `worker`,
                    queue_name: this.queue,
                    caller: `onFailure()`,
                    message: `onFailure() called for ${browser.id}`,
                  })

                await this.redis.rpush(REPORTS_KEY, data)
                // Nothing drains this list, so cap it at its newest entries (plan.md 7.8).
                await this.redis.ltrim(REPORTS_KEY, -REPORTS_KEY_MAX_ENTRIES, -1)
                console.log(data)

                // The scan is over and produced no check, so say so rather than leaving the
                // dashboard spinning until its own timeout (plan.md 4.9).
                await this.publishScanEvent({
                  websiteID,
                  domain,
                  type: "failed",
                  attempt: Number(message.attempt),
                  at: Date.now(),
                })
                await this.clearScanMeta(domain)

                try {
                  if (browserConsumerTag) await this.browserChannel.cancel(browserConsumerTag)
                } catch (err) {
                  console.error("Error cancelling browser consumer:", err)
                }
                console.log("[Manual] [3] Adding the remaining browsers to Browser Queue")

                for (const temp_msg of browser_message_batch) {
                  try {
                    if (temp_msg === msg_browser) {
                      if (shouldIncrementFailureCount) browser.failure = Number(browser.failure) + 1
                      // if (browser.failure < 3) {
                        this.browserChannel.sendToQueue(
                          this.browserChannelQueue,
                          Buffer.from(JSON.stringify(browser)),
                        )
                      // } else {

                        // TODO Need to consider logic here to handle a browser failing multiple times consequtively

                        // const remaining_browsers = await this.browserChannel.checkQueue(this.browserChannelQueue)
                        // if (remaining_browsers.messageCount === 0) {
                        //   console.log(`!!! NO SCRAPERS WORKING !!!`)
                        //   await this.redis.set(`SERVICES:DOWN`, 1)
                        //   return
                        // }
                      // }
                    } else {
                      this.browserChannel.sendToQueue(this.browserChannelQueue, Buffer.from(temp_msg.content))
                    }
                    this.browserChannel.ack(temp_msg)
                  } catch (err) {
                    console.error("Error returning browser to pool:", err)
                  }
                }
                this.finishRun(browser_message_batch)
                return
              }

              // Still have attempts left: requeue the whole website to try again.
              message.attempt = Number(message.attempt) + 1
              this.channel.sendToQueue(this.websiteQueue, Buffer.from(JSON.stringify(message)))
              this.channel.ack(msg_website)
              this.detachRun(browser_message_batch)

              try {
                if (browserConsumerTag) await this.browserChannel.cancel(browserConsumerTag)
              } catch (err) {
                console.error("Error cancelling browser consumer:", err)
              }
              for (const temp_msg of browser_message_batch) {
                try {
                  this.browserChannel.sendToQueue(this.browserChannelQueue, Buffer.from(temp_msg.content))
                  this.browserChannel.ack(temp_msg)
                } catch (err) {
                  console.error("Error returning browser to pool:", err)
                }
              }
              this.finishRun(browser_message_batch)
              return
            }

            // Other browsers are still active for this website, just return this one to the pool.
            this.browserChannel.ack(msg_browser)
            const leasedIndex = browser_message_batch.indexOf(msg_browser)
            if (leasedIndex !== -1) browser_message_batch.splice(leasedIndex, 1)
          }

          // Runs when the browser finishes its work normally (status 0).
          const onComplete = async () => {
            const activeBrowsers = await this.redis.decr(activeBrowserKey)
            console.log(`Active Browsers for :: ${domain} :: ${activeBrowsers}`)

            if (activeBrowsers > 0) return

            // after completion confirmation check if links queue is empty, If not empty push to next priority_queue
            const info = await this.linkChannel.checkQueue(linkQueue)
            console.log("ACTIVE BROWSER 0")
            const resultsList = await this.redis.lrange(resultKey, 0, -1)

            console.log(resultsList.length)

            if (info.messageCount === 0 || resultsList.length >= this.maxLimit) {
              console.log(`EXECUTION COMPLETED :::: ${domain}`)
              await this.redis.del(resultKey)
              const results : ResultRecords[] = resultsList.map((item) => JSON.parse(item))
              console.log(`Length ::: ${results.length}`)

              // The scraper writes the crawl duration here. Read (and clear) it once, before the
              // switch: it is both the value Check.duration was never given (P0-4) and the value the
              // estimated-time average below is computed from.
              const rawDuration = await this.redis.getdel(getDurationKey(domain))
              const crawlDuration = rawDuration === null ? undefined : Number(rawDuration)

              const check = new Checks({
                website: websiteID,
                checkedLinks: results,
                manager: this.queue,
                task: message.task,
                duration: crawlDuration,
              })
              currWebsite.checks.push(check.id)

              // One upsert per broken link, collected here and written once the check is saved.
              const alertOps: AnyBulkWriteOperation[] = []
              let followUpTask: ManagerTasksType | undefined

              switch(message.task){
                case "eval_links":
                case "eval_seo": {
                  for(const res of results){
                    const status = Number.parseInt(String(res.status ?? "0"))
                    if(status >= 200 && status <= 299) continue;
                    if(!res.url) continue

                    // `details`, plural: AlertsSchema declares `details`, so the old singular
                    // `detail` was discarded by mongoose and every alert saved with no status text,
                    // no redirect target and no analytics (REPORT.md P0-5).
                    const {url : link, ...details} = res

                    // One alert per (website, link, error_code) - the compound index and the
                    // `check: [ObjectId]` array were always shaped for exactly this. insertMany
                    // created a fresh alert on every scan, so a persistently broken link collected
                    // one duplicate per run (plan.md 3.5); a recurrence now appends this check.
                    alertOps.push({
                      updateOne: {
                        filter: { website: websiteID, link, error_code: String(status) },
                        update: {
                          $addToSet: { check: check.id },
                          $set: { details, manager: this.queue, updatedAt: new Date() },
                          $setOnInsert: { createdAt: new Date(), solved: false },
                        },
                        upsert: true,
                      },
                    })
                  }

                  const estimatedTimeKey = this.queue as keyof NonNullable<typeof currWebsite.estimatedTime>
                  const currentEstimatedTime = currWebsite.estimatedTime?.[estimatedTimeKey] ?? 0
                  const newApproximateTime = (currentEstimatedTime + (crawlDuration ?? 0)) / 2
                  if (currWebsite.estimatedTime) {
                    currWebsite.estimatedTime[estimatedTimeKey] = newApproximateTime
                  }
                  break
                }
                case "eval_sitemap": {
                  // internal links that are detected during eval_sitemap execution only have one key url
                  const traced_links = new Set<string>(currWebsite.traced_links)
                  const sitemap_links = new Set<string>(currWebsite.sitemap_links)

                  for(const res of results){
                    if(!res.url) continue
                    if(res.type === "internal"){
                      traced_links.add(res.url)
                    }else if(res.type === "sitemap"){
                      sitemap_links.add(res.url)
                    }
                  }

                  currWebsite.traced_links = Array.from(traced_links)
                  currWebsite.sitemap_links = Array.from(sitemap_links)

                  // Discovery on its own checks nothing. Chain the run that consumes what it found,
                  // or the pipeline simply stops here and no link is ever checked (P0-3). `next`
                  // lets the producer pick the follow-up (eval_sitemap -> eval_seo for an SEO scan).
                  followUpTask = message.next ?? MANAGER_TASK_CHAIN.eval_sitemap
                  break
                }
              }

              await currWebsite.save()
              await check.save()

              // Written after the check is saved, so no alert can reference a check that never
              // persisted. A failure here is logged rather than thrown: the crawl is finished either
              // way and the website message still has to be acked.
              if (alertOps.length > 0) {
                try {
                  await Alert.bulkWrite(alertOps, { ordered: false })
                } catch (err) {
                  console.error("Error writing alerts:", err)
                }
              }

              // Hand the finished check to the reporter worker instead of generating the AI
              // report here. An LLM call takes seconds and can fail; doing it inline would hold
              // this browser lease open and make a crawl fail over a report. Queuing it keeps the
              // crawl path fast and lets the report retry on its own.
              try {
                await enqueue("report_generation", JSON.stringify({ checkID: check.id }))
              } catch (err) {
                console.error("Error queuing report generation:", err)
              }

              // The cancellation guard doubles as the "this run is still wanted" flag, so it has to
              // be re-armed before the follow-up is enqueued - otherwise the chained run reads an
              // unset key and immediately treats itself as cancelled.
              if (followUpTask) {
                await this.redis.set(queuedKey, 1)
                this.channel.sendToQueue(
                  this.websiteQueue,
                  Buffer.from(JSON.stringify({ id: websiteID, attempt: 0, task: followUpTask } satisfies WebsiteQueueMessage)),
                  { persistent: true },
                )
                console.log(`CHAINED :::: ${domain} :::: ${message.task} -> ${followUpTask}`)
              } else {
                await this.redis.del(queuedKey)
              }

              await this.redis.del(activeBrowserKey)
              this.channel.ack(msg_website)
              this.detachRun(browser_message_batch)

              // Both hand-offs run only once the check is durable, and neither may break a crawl.
              await this.publishScanEvent({
                websiteID,
                domain,
                type: "completed",
                task: message.task,
                checkID: String(check.id),
                at: Date.now(),
              })
              await this.clearScanMeta(domain)
              await this.requestReport(String(check.id))

              try {
                if (browserConsumerTag) await this.browserChannel.cancel(browserConsumerTag)
              } catch (err) {
                console.error("Error cancelling browser consumer:", err)
              }

              for (const temp_msg of browser_message_batch) {
                try {
                  const temp = JSON.parse(temp_msg.content.toString()).id
                  this.browserChannel.sendToQueue(this.browserChannelQueue, Buffer.from(temp_msg.content))
                  this.browserChannel.ack(temp_msg)
                  console.log(`Acked :: ${temp} :: sent in rotation`)
                } catch (err) {
                  console.error("Error returning browser to pool:", err)
                }
              }
              this.finishRun(browser_message_batch)
              return
            }

            if (this.queue === "priority_high" && info.messageCount !== 0) {
              console.log(`EXECUTION INCOMPLETE :::: ${domain} :::: ${this.queue}`)
              // log unexpected situation as high priority websites should be completed in full
              await this.redis.del(queuedKey)
              await this.redis.del(activeBrowserKey)
              await this.clearScanMeta(domain)
              this.channel.ack(msg_website)
              this.detachRun(browser_message_batch)
              try {
                if (browserConsumerTag) await this.browserChannel.cancel(browserConsumerTag)
              } catch (err) {
                console.error("Error cancelling browser consumer:", err)
              }
              for (const temp_msg of browser_message_batch) {
                try {
                  this.browserChannel.sendToQueue(this.browserChannelQueue, Buffer.from(temp_msg.content))
                  this.browserChannel.ack(temp_msg)
                } catch (err) {
                  console.error("Error returning browser to pool:", err)
                }
              }
              this.finishRun(browser_message_batch)
              return
            }

            console.log("INCOMPLETE EXECUTION")

            const currentTime = Number(await this.redis.getdel(getDurationKey(domain)))
            const queueKey = this.queue as keyof NonNullable<typeof currWebsite.estimatedTime>
            const estimatedTime = currWebsite.estimatedTime ?? {
              priority_low: currentTime,
              priority_mid: currentTime,
              priority_high: currentTime,
            }
            const newApproximateTime = (estimatedTime[queueKey] + currentTime) / 2
            estimatedTime[queueKey] = newApproximateTime
            currWebsite.estimatedTime = estimatedTime

            await currWebsite.save()

            // The lower tier picks the crawl up where this one left off. Two things this hand-off
            // used to get wrong: the message carried no `task`, so the next manager discarded it as
            // invalid, and the cancellation guard was deleted, so a message that did survive was
            // read as cancelled. A tier configured with NEXT_QUEUE=none has nothing below it, and
            // publishing into a queue no one consumes just grows without bound.
            const hasNextTier = Boolean(this.nextQueue) && this.nextQueue !== "none"
            if (hasNextTier) {
              await this.redis.set(queuedKey, 1)
              this.channel.sendToQueue(
                this.nextQueue + "_domain",
                Buffer.from(JSON.stringify({ id: websiteID, attempt: 0, task: message.task } satisfies WebsiteQueueMessage)),
                { persistent: true },
              )
            } else {
              console.log(`NO NEXT TIER :::: ${domain} :::: dropping the remainder of this crawl`)
              await this.redis.del(queuedKey)
              await this.clearScanMeta(domain)
            }

            await this.redis.del(activeBrowserKey)
            this.channel.ack(msg_website)

            for (const temp_msg of browser_message_batch) {
              try {
                this.browserChannel.sendToQueue(this.browserChannelQueue, Buffer.from(temp_msg.content))
                this.browserChannel.ack(temp_msg)
              } catch (err) {
                console.error("Error returning browser to pool:", err)
              }
            }
            this.finishRun(browser_message_batch)
          }

          const onWorking = () => {}

          statusSubscriber.subscribe(onWorking, onComplete, onFailure)
        },
        { noAck: false },
      )
      .then(({ consumerTag }) => {
        browserConsumerTag = consumerTag
        activeRun.browserConsumerTag = consumerTag
      })
  }

  // Was a non-static instance method before, which meant it could never
  // actually be called (you'd need a Manager instance to build a Manager
  // instance). Made static so it works as an actual factory function.
  static async init() {
    await connectDB()
    const redis = await getRedis()
    const { connection, linkChannel, browserChannel, channel } = await this.createChannels()
    return new Manager( env.QUEUE, env.NEXT_QUEUE, env.INSTANCES, env.LINK_LIMIT, env.MAX_SCAN_ATTEMPTS, redis, linkChannel, browserChannel, channel, connection )
  }

  // gets the website from the amqp queue and starts pushing its starting links into the link queues
  async startWebsiteProcessing() {
    await this.channel.assertQueue(this.websiteQueue, { durable: true })
    await this.channel.prefetch(1)

    // Bound with an arrow function so `this` inside websiteConsumer still
    // refers to this Manager instance (a bare method reference loses `this`).
    const { consumerTag } = await this.channel.consume(
      this.websiteQueue,
      (msg) => {
        void this.websiteConsumer(msg).catch((err) => {
          console.error("Error handling website message:", err)
        })
      },
      { noAck: false },
    )
    this.websiteConsumerTag = consumerTag
  }

  // Reports whether this manager's RabbitMQ connection is currently usable (read by /health).
  isRabbitConnected() {
    return this.rabbitConnected && !this.isShuttingDown
  }

  // Stops consuming, hands the in-flight website back to the queue so another manager picks it up,
  // returns every leased browser to the pool, then closes the channels, the connection and Redis.
  // Modelled on the scraper's Scraper.shutdown() (plan.md 7.1/7.2): before this, a manager restart
  // stranded the website it held and quietly shrank the browser pool by however many it had leased.
  async shutdown(signal: string) {
    if (this.isShuttingDown) return
    this.isShuttingDown = true
    console.log(`[Manager:${this.queue}] :: ${signal} received, shutting down`)

    // Stop taking new websites first, so nothing arrives while we hand back what we already hold.
    try {
      if (this.websiteConsumerTag) await this.channel.cancel(this.websiteConsumerTag)
    } catch (err) {
      console.error("Error cancelling website consumer:", err)
    }

    const run = this.activeRun
    this.activeRun = null

    if (run) {
      try {
        if (run.browserConsumerTag) await this.browserChannel.cancel(run.browserConsumerTag)
      } catch (err) {
        console.error("Error cancelling browser consumer:", err)
      }

      for (const temp_msg of run.browserBatch) {
        try {
          this.browserChannel.sendToQueue(this.browserChannelQueue, Buffer.from(temp_msg.content))
          this.browserChannel.ack(temp_msg)
        } catch (err) {
          console.error("Error returning browser to pool:", err)
        }
      }
      run.browserBatch.length = 0

      // requeue = true: the crawl is unfinished, so it goes back on the queue for another manager
      // rather than being dropped. Done last, once its browsers are already back in the pool.
      try {
        this.channel.nack(run.websiteMessage, false, true)
        console.log(`[Manager:${this.queue}] :: Requeued ${run.domain}`)
      } catch (err) {
        console.error("Error requeueing in-flight website:", err)
      }
    }

    await Promise.allSettled([
      this.linkChannel.close(),
      this.browserChannel.close(),
      this.channel.close(),
    ])
    await Promise.allSettled([this.connection.close(), closeRedis()])

    console.log(`[Manager:${this.queue}] :: Shutdown complete`)
  }
}
