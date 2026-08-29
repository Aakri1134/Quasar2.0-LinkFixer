import * as amqp from "amqplib"
import { env } from "../../config/env.js"
import { connectDB } from "../../database/connectdb.js"
import { closeRedis } from "../../database/connectRedis.js"
import { Checks } from "../../models/check.js"
import { Website } from "../../models/website.js"
import { User } from "../../models/user.js"
import { getReport } from "../../utils/genAI/getReport.js"
import { sendReport } from "../../utils/mail/mail.js"
import type { ReportSummary } from "../../utils/mail/composeMail/reportMail.js"
import type { ResultRecords } from "../managers/Manager.types.js"

const QUEUE = "report_generation"

// Only the broken links are worth sending to the model. Feeding it every 200 would blow the
// prompt up on a large crawl and bury the part that matters.
function summarise(results: ResultRecords[]): {
  broken: ResultRecords[]
  summary: ReportSummary
  durationMs: number
} {
  const broken = results.filter((record) => {
    const status = Number(record.status ?? 0)
    return !(status >= 200 && status <= 299)
  })

  const counts = new Map<string, number>()
  for (const record of broken) {
    const code = String(record.status ?? 0)
    counts.set(code, (counts.get(code) ?? 0) + 1)
  }

  const topErrorCodes = Array.from(counts.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    broken,
    durationMs: 0,
    summary: {
      totalLinks: results.length,
      brokenLinks: broken.length,
      durationMs: 0,
      topErrorCodes,
    },
  }
}

// Generates the AI report for one finished check and emails the website's subscribers.
async function handleCheck(checkID: string) {
  const check = await Checks.findById(checkID)
  if (!check) {
    console.log(`[Reporter] Check ${checkID} not found, dropping`)
    return
  }

  const results = (check.checkedLinks ?? []) as unknown as ResultRecords[]
  const { broken, summary } = summarise(results)
  summary.durationMs = (check.duration ?? 0) * 1000

  // Generate the report first. If the model fails we still want the email to go out with the
  // counts, so this is caught rather than allowed to abort the whole job.
  try {
    check.aiReport = await getReport(broken)
    await check.save()
    console.log(`[Reporter] Wrote aiReport for check ${checkID}`)
  } catch (err) {
    console.error(`[Reporter] AI report failed for ${checkID} :: `, (err as Error).message)
  }

  if (!check.website) {
    console.log(`[Reporter] Check ${checkID} has no website, skipping email`)
    return
  }

  const website = await Website.findById(check.website).select("domain mail_subscribers")
  if (!website || website.mail_subscribers.length === 0) {
    return
  }

  const subscribers = await User.find({ _id: { $in: website.mail_subscribers } }).select("email")
  const emails = subscribers.map((user) => user.email).filter(Boolean)

  await sendReport(emails, website.domain, summary)
}

await connectDB()

const connection = await amqp.connect(env.RABBITMQ_URL)
const channel = await connection.createChannel()
await channel.assertQueue(QUEUE, { durable: true })
// One report at a time: an LLM call is slow, and prefetching a batch would just hold messages
// hostage behind whichever one is stuck.
await channel.prefetch(1)

console.log("[Reporter] Waiting for checks to report on")

const { consumerTag } = await channel.consume(QUEUE, (msg) => {
  if (!msg) return

  void (async () => {
    try {
      const { checkID } = JSON.parse(msg.content.toString()) as { checkID?: string }
      if (!checkID) {
        console.log("[Reporter] Message with no checkID, dropping")
        channel.ack(msg)
        return
      }
      await handleCheck(checkID)
      channel.ack(msg)
    } catch (err) {
      console.error("[Reporter] Job failed :: ", err)
      // Do not requeue: a report that failed twice will keep failing, and an infinite retry loop
      // would block every later check behind it.
      channel.ack(msg)
    }
  })()
})

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    void (async () => {
      console.log(`[Reporter] ${signal} received, shutting down`)
      try {
        await channel.cancel(consumerTag)
        await channel.close()
        await connection.close()
        await closeRedis()
      } catch (err) {
        console.error("[Reporter] Error during shutdown :: ", err)
      } finally {
        process.exit(0)
      }
    })()
  })
}

process.on("unhandledRejection", (reason) => {
  console.error("[Reporter] Unhandled rejection :: ", reason)
})
