import { env } from "../../config/env.js"
import { websiteRepository } from "../../modules/website/website.container.js"
import { connectRedis } from "../../database/connectRedis.js"
import { WebsiteError } from "../../modules/website/website.service.js"
import amqp from "amqplib"
import { connectDB } from "../../database/connectdb.js"

async function testManager(domain: string) {
  await connectDB()
  if (process.env.MODE_NODE !== "dev") {
    return {
      statusCode: 420,
      body: { you: "naughty" },
    }
  }

  let website = await websiteRepository.findWebsiteByDomain(domain)
  if (!website) {
    website = websiteRepository.createWebsite({
      domain,
      sitemapLinks: [domain],
      checkedLinks: [],
      checkedAt: Date.now(),
    })
    await websiteRepository.saveWebsite(website)
  }

  if (!env.REDIS_URL) {
    throw new WebsiteError("Redis URL is not configured", 500)
  }
  const redis = await connectRedis()
  await redis.set(`queued:${domain}`, 1)
  if(!process.env.RABBITMQ_URL_LOCAL) return
  const connection = await amqp.connect(process.env.RABBITMQ_URL_LOCAL)
  const channel = await connection.createChannel()

  async function enqueue(queueName: string, data: string) {
    try {
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
    }),
  )
  
  process.exit(1)
}

testManager("https://iiitranchi.ac.in")
