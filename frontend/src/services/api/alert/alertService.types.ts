// One broken link the crawler flagged. `check` is the list of scans that saw it, so an alert seen
// on three runs carries three ids rather than existing three times (backend dedupes on upsert).
export type Alert = {
  _id: string
  website: string
  check: string[]
  link: string
  error_code?: string
  // Whatever the scraper attached to the failure — status text, redirect chain, error name. It is
  // Mixed on the server, so the client must treat it as unknown and narrow before rendering.
  details?: unknown
  manager?: string
  // Alerts written by the Manager omit `solved` entirely, so absent means unresolved. Never test
  // `solved === false`; test `!solved`.
  solved?: boolean
  solvedAt?: string | null
  solvedBy?: string | null
  createdAt: string
  updatedAt: string
}

export type getAlertsPayload = {
  websiteID: string
  solved?: boolean
  error_code?: string
  page?: number
  limit?: number
}

export type getAlertsOutput = {
  success: boolean
  alerts: Alert[]
  total: number
  page: number
  limit: number
}

export type updateAlertPayload = {
  alertID: string
  solved?: boolean
  error_code?: string
  link?: string
  details?: unknown
}

export type alertMutationOutput = {
  success: boolean
  msg: string
  alert: Alert
}

export type deleteAlertPayload = {
  alertID: string
}
