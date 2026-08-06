// Manager.ts
import { Redis } from "ioredis"
import { connectDB } from "../../database/connectdb.js"
import { env } from "../../config/env.js"
import * as amqp from "amqplib"
import { connectRedis } from "../../database/connectRedis.js"
import { StatusSubscriber } from "./StatusSubscriber.js"
import type { BrowserQueueMessage, WebsiteQueueMessage } from "../../modules/website/website.types.js"
import { Website } from "../../models/website.js"
import { Checks } from "../../models/check.js"

export class Manager {
  private browserChannelQueue = "available_browsers"
  private websiteQueue: string = ""

  private constructor(
    private readonly queue: string,
    private readonly nextQueue: string,
    private readonly instances: number, // number of srapers to be used
    private readonly maxLimit: number, // max number of links to be scraped 
    private readonly redis: Redis,
    private readonly linkChannel: amqp.Channel,
    private readonly browserChannel: amqp.Channel,
    private readonly channel: amqp.Channel,
  ) {
    this.websiteQueue = this.queue + "_domain"
    console.log({
      queue, 
      nextQueue, 
      instances, 
      maxLimit, 
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

    return { linkChannel, browserChannel, channel }
  }

  private async websiteConsumer(msg: amqp.ConsumeMessage | null) {
    const msg_website = msg
    if (!msg_website) {
      console.log("Null msg_website received")
      return
    }
    const message: WebsiteQueueMessage = JSON.parse(msg_website.content.toString())

    if (message.id === undefined || message.attempt === undefined) {
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
    const sitemapLinks = currWebsite.sitemapLinks

    console.log("website ::::::: ", domain)

    const linkQueue = domain + "_links"
    const activeBrowserKey = `${websiteID}_active_browsers`
    const queuedKey = `queued:${domain}`
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
    
    // Initialize active browser counter for this domain
    await this.redis.set(activeBrowserKey, 0)

    // create a queue and push links into queue
    this.linkChannel.assertQueue(linkQueue, { durable: true })
    await this.linkChannel.purgeQueue(linkQueue)

    for (const link of sitemapLinks) {
      this.linkChannel.sendToQueue(
        linkQueue,
        Buffer.from(JSON.stringify({ link, baseDomain: domain, depth: 0 })),
        { persistent: true },
      )
    }

    let browser_message_batch: amqp.ConsumeMessage[] = []

    // allocate queue to available vacant puppeteer instances
    this.browserChannel.assertQueue(this.browserChannelQueue, { durable: true })
    this.browserChannel.prefetch(this.instances)

    let browserConsumerTag: string | undefined

    await this.redis.set(`${domain}_pause_status`, 0)
    await this.redis.del(`${domain}_checkedLinks`)
    await this.redis.del(`${domain}_results`)

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

          await this.redis.publish(
            `${uid}_domain`,
            JSON.stringify({ domain, limit, maxPages, linkQueue, authentication }),
          )

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

              if (Number(message.attempt) >= 1) { // TODO make max attempts a global variable
                // Too many attempts already: log a fatal error and stop retrying this website.
                await this.redis.del(queuedKey)
                await this.redis.del(activeBrowserKey)
                console.log("[Manual] [1] Acking website, as max attempts reached for one website")
                this.channel.ack(msg_website)
                console.log("[Manual] [2] Acked website, as max reached without error")

                const data =  JSON.stringify({
                    trace: `/backend/workers/index.js`,
                    level: `high`,
                    type: `worker`,
                    queue_name: this.queue,
                    caller: `onFailure()`,
                    message: `onFailure() called for ${browser.id}`,
                  })

                await this.redis.rpush(`reports`,data)
                console.log(data)
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
                browser_message_batch = []
                return
              }

              // Still have attempts left: requeue the whole website to try again.
              message.attempt = Number(message.attempt) + 1
              this.channel.sendToQueue(this.websiteQueue, Buffer.from(JSON.stringify(message)))
              this.channel.ack(msg_website)

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
              browser_message_batch = []
              return
            }

            // Other browsers are still active for this website, just return this one to the pool.
            this.browserChannel.ack(msg_browser)
            browser_message_batch = browser_message_batch.filter((x) => x !== msg_browser)
          }

          // Runs when the browser finishes its work normally (status 0).
          const onComplete = async () => {
            const activeBrowsers = await this.redis.decr(activeBrowserKey)
            console.log(`Active Browsers for :: ${domain} :: ${activeBrowsers}`)

            if (activeBrowsers > 0) return

            // after completion confirmation check if links queue is empty, If not empty push to next priority_queue
            const info = await this.linkChannel.checkQueue(linkQueue)
            console.log("ACTIVE BROWSER 0")
            const resultsList = await this.redis.lrange(`${domain}_results`, 0, -1)

            if (info.messageCount === 0 || resultsList.length >= this.maxLimit) {
              console.log(`EXECUTION COMPLETED :::: ${domain}`)
              await this.redis.del(`${domain}_results`)
              const results = resultsList.map((item) => JSON.parse(item))
              const check = new Checks({ checkedLinks: results, checkedAt: new Date(), manager : this.queue})
              currWebsite.checks.push(check.id)

              console.log(results)

              const currentCompletionTime = await this.redis.getdel(`${domain}_duration`)
              const estimatedTimeKey = this.queue as keyof NonNullable<typeof currWebsite.estimatedTime>
              const currentEstimatedTime = currWebsite.estimatedTime?.[estimatedTimeKey] ?? 0
              const newApproximateTime = (currentEstimatedTime + Number(currentCompletionTime)) / 2
              if (currWebsite.estimatedTime) {
                currWebsite.estimatedTime[estimatedTimeKey] = newApproximateTime
              }

              const isCancelled = await this.redis.getdel(queuedKey)
              if (Number(isCancelled) === 1 || isCancelled === "1") {
                await check.save()
                await currWebsite.save()
              }

              await this.redis.del(activeBrowserKey)
              this.channel.ack(msg_website)

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
              browser_message_batch = []
              return
            }

            if (this.queue === "priority_high" && info.messageCount !== 0) {
              console.log(`EXECUTION INCOMPLETE :::: ${domain} :::: ${this.queue}`)
              // log unexpected situation as high priority websites should be completed in full
              await this.redis.del(queuedKey)
              await this.redis.del(activeBrowserKey)
              this.channel.ack(msg_website)
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
              browser_message_batch = []
              return
            }

            console.log("INCOMPLETE EXECUTION")

            const currentTime = Number(await this.redis.getdel(`${domain}_duration`))
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
            this.channel.sendToQueue(
              this.nextQueue + "_domain",
              Buffer.from(JSON.stringify({ id: currWebsite.id, attempt: 1 })),
            )
            await this.redis.del(queuedKey)
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
            browser_message_batch = []
          }

          const onWorking = () => {}

          statusSubscriber.subscribe(onWorking, onComplete, onFailure)
        },
        { noAck: false },
      )
      .then(({ consumerTag }) => {
        browserConsumerTag = consumerTag
      })
  }

  // Was a non-static instance method before, which meant it could never
  // actually be called (you'd need a Manager instance to build a Manager
  // instance). Made static so it works as an actual factory function.
  static async init() {
    await connectDB()
    const redis = await connectRedis()
    const { linkChannel, browserChannel, channel } = await this.createChannels()
    return new Manager( env.QUEUE, env.NEXT_QUEUE, env.INSTANCES, env.LINK_LIMIT, redis, linkChannel, browserChannel, channel )
  }

  // gets the website from the amqp queue and starts pushing its starting links into the link queues
  async startWebsiteProcessing() {
    this.channel.assertQueue(this.websiteQueue, { durable: true })
    this.channel.prefetch(1)

    // Bound with an arrow function so `this` inside websiteConsumer still
    // refers to this Manager instance (a bare method reference loses `this`).
    this.channel.consume(this.websiteQueue, (msg) => this.websiteConsumer(msg), {
      noAck: false,
    })
  }
}