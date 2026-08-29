import {Redis} from "ioredis"
import { env } from "../config/env.js"

export async function connectRedis() {
    const redis = new Redis(env.REDIS_URL, {enableReadyCheck : false})
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

// The API process must share one Redis socket. `new Redis()` per request leaks a TCP connection
// and exhausts `maxclients` under load (REPORT P0-8), so every consumer goes through getRedis().
// Memoised on the in-flight promise, not just the resolved client, so concurrent first callers
// share a single connection instead of racing to open several.
let sharedRedis: Redis | null = null
let sharedRedisPromise: Promise<Redis> | null = null

// Returns the process-wide Redis client, connecting on first use.
export async function getRedis() {
  if (sharedRedis) return sharedRedis
  if (!sharedRedisPromise) {
    sharedRedisPromise = connectRedis().then((redis) => {
      sharedRedis = redis
      return redis
    })
  }
  return sharedRedisPromise
}

// Quits the shared client and clears it, so a later getRedis() reconnects. Used by graceful shutdown.
export async function closeRedis() {
  const pending = sharedRedisPromise
  sharedRedis = null
  sharedRedisPromise = null
  if (!pending) return
  try {
    const redis = await pending
    await redis.quit()
  } catch (error) {
    console.error("Failed to close Redis:", (error as Error).message)
  }
}
