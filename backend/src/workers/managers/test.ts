import { websiteRepository } from "../../modules/website/website.container.js"
import amqp from "amqplib"
import { connectDB } from "../../database/connectdb.js"
import { AppError } from "../../utils/AppError.js"
import type { WebsiteQueueMessage } from "../../modules/website/website.types.js"
import {Redis} from "ioredis"
import { env } from "../../config/env.js"
import { getQueuedKey } from "../../utils/redisKeys.js"

export async function connectRedis() {
    const redis = new Redis(process.env.REDIS_URL_LOCAL ?? "", {enableReadyCheck : false})
    await new Promise<void>((resolve, reject) => {
      const onConnect = () => {
        console.log("Connected to Redis")
        cleanup()
        resolve()
      }

      const onError = (error: Error) => {
        console.log("Error in connection to Redis")
        console.log(error)
        cleanup()
        reject(error)
      }

      const cleanup = () => {
        redis.off("connect", onConnect)
        redis.off("error", onError)
      }

      redis.once("connect", onConnect)
      redis.once("error", onError)
    }).catch(() => {
      process.exit(1)
    })

    try {
      await redis.config("SET", "maxmemory-policy", "allkeys-lfu")
      console.log("maxmemory-policy set to allkeys-lfu")
    } catch (error) {
      console.error("Failed to set maxmemory-policy:", (error as Error).message)
    }

    return redis
  }

async function testManager(domain: string, sitemap_links : string[]) {
  await connectDB()
  // env.NODE_ENV, not process.env.MODE_NODE: MODE_NODE is a deprecated alias that config/env.ts
  // resolves, and this harness must not be runnable against a non-dev environment by accident.
  if (env.NODE_ENV !== "dev") {
    return {
      statusCode: 420,
      body: { you: "naughty" },
    }
  }

  let website = await websiteRepository.findWebsiteByDomain(domain)
  if (!website) {
    website = websiteRepository.createWebsite({
      domain,
      sitemap_links,
      checkedLinks: [],
      checkedAt: Date.now(),
    })
    await websiteRepository.saveWebsite(website)
  }
  
  const redis = await connectRedis()
  await redis.set(getQueuedKey(domain), 1)
  if(!process.env.RABBITMQ_URL_LOCAL) return
  const connection = await amqp.connect(process.env.RABBITMQ_URL_LOCAL)
  const channel = await connection.createChannel()

  async function enqueue(queueName: string, data: string) {
    try {
      console.log(`Sending ${data} to queue`)
      await channel.assertQueue(queueName, {
        durable: true,
      })
      await channel.sendToQueue(queueName, Buffer.from(data), {
        persistent: true,
      })
      const ret = await channel.checkQueue(queueName)
      console.log(`${data} pushed to ${queueName}`)
      return ret.messageCount
    } catch (error) {
      console.error(
        "Error while enqueuing ::\nDestination : utils/scheduler/enqueue",
      )
      console.error(error)
      return -1
    }
  }

  await enqueue(
    "priority_high_domain",
    JSON.stringify({
      id: website.id,
      attempt: 0,
      task: "eval_links"
    } as WebsiteQueueMessage),
  )
  
  process.exit(1)
}

testManager("ogcollege.io", ["https://ogcollege.io/sitemap.xml"])
