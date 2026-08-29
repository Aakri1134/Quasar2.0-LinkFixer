// The URL someone typed on the landing page before they had an account. It has to survive
// signup -> verification email -> login, which loses any query string on the way, so it is
// parked in localStorage until the dashboard can use it.
export const PENDING_URL_KEY = "linkfixer:pending-url"

export function readPendingURL(): string {
  try {
    return localStorage.getItem(PENDING_URL_KEY) ?? ""
  } catch {
    return ""
  }
}

export function clearPendingURL() {
  try {
    localStorage.removeItem(PENDING_URL_KEY)
  } catch {
    // nothing to do - a stale key is harmless, it is cleared on the next successful read
  }
}
