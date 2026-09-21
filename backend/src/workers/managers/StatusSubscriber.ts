// StatusSubscriber.ts
import { Redis } from "ioredis"
import { connectRedis } from "../../database/connectRedis.js"
import { getScraperStatusKey } from "../../utils/redisKeys.js"

/**
 * Watches ONE browser's status channel in Redis and reports back whether
 * that browser is still working, finished normally, or failed.
 *
 * Each running Puppeteer browser publishes a number to its own channel
 * (`${uid}_status`) so we know it's still alive:
 *   1  -> still working (a "heartbeat")
 *   0  -> finished its job normally
 *  -1  -> reported its own failure
 *
 * If no heartbeat arrives within `timeoutMs`, we assume the browser died
 * silently and treat that the same as a failure.
 */
export class StatusSubscriber {
  // Timer that fires if we don't hear from the browser in time.
  private timeoutHandle: NodeJS.Timeout | null = null

  // Flips to true the first time we hear a "1" (working) heartbeat.
  // We need this because the very first silent timeout (before any
  // heartbeat at all) should count as a "fresh" failure, while every
  // later failure should NOT be counted as fresh. This mirrors the
  // original logic exactly.
  private hasReceivedHeartbeat = false

  // Prevents us from unsubscribing/quitting twice (e.g. if the timeout
  // fires at almost the same moment a message arrives).
  private isCleanedUp = false

  private constructor(
    private readonly subscriber: Redis,
    private readonly channelName: string,
  ) {}

  /**
   * Creates and connects a StatusSubscriber for a given browser id.
   * This is a static factory instead of an async constructor, because
   * constructors in JS/TS can't be async.
   */
  static async create(uid: string): Promise<StatusSubscriber> {
    // Its own connection, not the shared client: a Redis connection in subscriber mode cannot run
    // ordinary commands, so this one must stay separate from the Manager's.
    const subscriber = await connectRedis()
    // Built by the shared helper rather than inline - the scraper writes this exact key from
    // getRedisHealthKey(), and hand-maintaining the two strings is the P0-5 failure mode.
    return new StatusSubscriber(subscriber, getScraperStatusKey(uid))
  }

  /**
   * Starts listening for status updates from the browser.
   *
   * @param onWorking   called whenever the browser confirms it's alive (status 1)
   * @param onComplete  called when the browser finishes normally (status 0)
   * @param onFailure   called when the browser fails, either because it sent -1
   *                    itself or because it went silent for too long.
   *                    `shouldIncrementFailureCount` is true ONLY for the very
   *                    first timeout that happens before any heartbeat was
   *                    ever received (matches the original behaviour).
   * @param timeoutMs   how long to wait for a heartbeat before assuming failure
   */
  subscribe(
    onWorking: () => void,
    onComplete: () => void | Promise<void>,
    onFailure: (shouldIncrementFailureCount: boolean) => void | Promise<void>,
    timeoutMs = 30000,
  ) {
    // Start listening on this browser's dedicated channel.
    this.subscriber.subscribe(this.channelName)

    // Start the "did we ever hear back" countdown.
    this.startTimeout(() => {
      onFailure(false)
      console.log("Did not recieve status from Scraper")
    }, timeoutMs)

    console.log("Set timeout")
    console.log(this.channelName)

    this.subscriber.on("message", async (channel, msg) => {
      console.log("Receiving status = ", msg)

      if (channel !== this.channelName) {
        console.log("Message from an unexpected channel, ignoring")
        return
      }

      if (isNaN(Number(msg))) {
        console.log("Non-numeric message received :: ", msg)
        return
      }

      const status = Number(msg)

      console.log("Recieved status ::: " + msg)

      // 1 -> still working. Just reset the "no news" timer and let the
      // caller know, then keep listening for more messages.
      if (status === 1) {
        console.log("Scraper working nice :: Recieved 1")
        this.hasReceivedHeartbeat = true
        this.clearTimeoutHandle()
        this.startTimeout(onFailure, timeoutMs)
        onWorking()
        return
      }

      // -1 -> browser reported its own failure. We're done listening,
      // so clean up first, then tell the caller.
      if (status === -1) {
        console.log("Handling a failure signal from the scraper :: Recieved -1")
        this.clearTimeoutHandle()
        await this.cleanup()
        await onFailure(false) // an explicit failure report is never "fresh"
        return
      }

      // 0 -> finished normally.
      console.log("Scraper completed scraping without error :: Recieved 0")
      this.clearTimeoutHandle()
      await this.cleanup()
      await onComplete()
    })

    this.subscriber.on("error", (err) => {
      console.error(`[Manual Logging] Subscriber error for ${this.channelName}:`, err)
    })
  }

  // (Re)starts the countdown that treats silence as a failure.
  private startTimeout(
    onFailure: (shouldIncrementFailureCount: boolean) => void | Promise<void>,
    timeoutMs: number,
  ) {
    this.timeoutHandle = setTimeout(async () => {
      // Only "fresh" (counts toward browser.failure) if we've never
      // heard a heartbeat from this browser at all.
      const isFreshFailure = !this.hasReceivedHeartbeat
      await this.cleanup()
      await onFailure(isFreshFailure)
    }, timeoutMs)
  }

  private clearTimeoutHandle() {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle)
      this.timeoutHandle = null
    }
  }

  // Unsubscribes and closes the Redis connection. Safe to call more
  // than once; only actually runs the cleanup the first time.
  private async cleanup() {
    if (this.isCleanedUp) return
    this.isCleanedUp = true
    this.clearTimeoutHandle()
    await this.subscriber.unsubscribe(this.channelName).catch((err) => {
      console.error("Error unsubscribing:", err)
    })
    await this.subscriber.quit().catch((err) => {
      console.error("Error quitting status subscriber:", err)
    })
  }
}