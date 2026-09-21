const RETRYABLE_ERRORS = [
  'Navigation timeout',
  'ERR_CONNECTION_CLOSED',
  'ERR_CONNECTION_REFUSED',
  'ERR_EMPTY_RESPONSE',
  'Navigating frame was detached',
  'Navigation returned no response',
]

export const MAX_RETRIES = 3
export const RETRY_BASE_TIMEOUT_MS = 15000
export const RETRY_TIMEOUT_BACKOFF_MS = 10000

export function isRetryable(errMessage: string): boolean {
  return RETRYABLE_ERRORS.some(pattern => errMessage.includes(pattern))
}