import { config } from "../config/index.js"
import { connectRedis } from "../db/connectRedis.js"
import { Scraper } from "../init/Scraper.js"
import getRedisChannel, { getRedisCheckedLinksKey, getRedisPauseStatusKey, getRedisResultKey } from "../utils/getRedisChannel.js"
import amqp from "amqplib"
import { normalizeHostname } from "../utils/normalizeURLHostname.js"

async function startScraper() {
  const scraper = await Scraper.init()
  await scraper.setup()
}

async function checkQueueWorking() {
  await startScraper()
  console.log(`Current Scraper :: ${config.ID}`)

  const linksChannel = getRedisChannel()
  const redis = await connectRedis()

  const initialLink = "https://iiitranchi.ac.in"
  const url = new URL(initialLink)
  const domain = normalizeHostname(url.hostname)
  const limit = 100
  const maxPages = 3
  const linkQueue = domain + "_links"


  const connection = await amqp.connect(config.RabbitMQ_URL)
  const channel = await connection.createChannel()

  
  // Resetting all Redis statuses to default / starting values
  await redis.set(getRedisPauseStatusKey(domain), 0)
  await redis.del(getRedisCheckedLinksKey(domain))
  await redis.del(getRedisResultKey(domain))
  
  // deleting all the previous incomplete / failed attempt links before starting the test
  await channel.purgeQueue(linkQueue)
  await channel.assertQueue(linkQueue)

  // pushing into RabbitMQ Queue before publishing via pub-sub to the scraper
  await channel.sendToQueue(
    linkQueue,
    Buffer.from(
      JSON.stringify({
        link: url.href,
        depth: 0,
      }),
    ),
  )

  // checking without authentication
  // using pub-sub to contact with the scraper, NOTE that the linkQueue should exist already before publising to the scraper
  await redis.publish(
    linksChannel,
    JSON.stringify({ domain, limit, maxPages, linkQueue }),
  )

  const subscriber = await connectRedis()

  await subscriber.subscribe()
}

checkQueueWorking()
