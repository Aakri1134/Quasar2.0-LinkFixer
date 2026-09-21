// Build/parse helpers for the domain-verification token file a site owner uploads to their server.
//
// The file is plain JSON, produced by WebsiteService.generateVerificationFileContent():
//   { "token": "makora_<websiteID>_<userID>", "issueDate": "<ISO date>", "domain": "<host>" }
//
// It travels through the user's filesystem and their web server before we read it back over the
// public internet, so everything in here treats the contents as untrusted input. The schema
// (modules/website/website.schema.ts) and the service both go through these helpers so the format
// is described in exactly one place.

import { isAfter } from "../date.js"
import { normalizeHostname } from "../normalizeHostname.js"

// Marks a verification file as ours; it is the first segment of every token.
export const VERIFICATION_TOKEN_PREFIX = "makora"

// A token older than this is refused, so a file left on a server cannot be replayed forever.
export const VERIFICATION_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

// Tolerance for clock skew between this process and whatever wrote the file.
const VERIFICATION_CLOCK_SKEW_MS = 5 * 60 * 1000

export type VerificationTokenParts = {
  websiteID: string
  userID: string
}

// Builds the token string written into a user's verification file.
export function buildVerificationToken(websiteID: string, userID: string) {
  return `${VERIFICATION_TOKEN_PREFIX}_${websiteID}_${userID}`
}

// Splits a token back into its parts, or returns null when it is not one of ours.
export function parseVerificationToken(token: string): VerificationTokenParts | null {
  const segments = token.split("_")
  if (segments.length !== 3) return null

  const [prefix, websiteID, userID] = segments
  if (prefix !== VERIFICATION_TOKEN_PREFIX || !websiteID || !userID) return null

  return { websiteID, userID }
}

// True when a token was issued in the past and is not older than VERIFICATION_TOKEN_MAX_AGE_MS.
export function isIssueDateValid(issueDate: Date | string) {
  const issuedAt = new Date(issueDate)
  if (Number.isNaN(issuedAt.getTime())) return false

  const now = Date.now()
  const latest = new Date(now + VERIFICATION_CLOCK_SKEW_MS)
  const earliest = new Date(now - VERIFICATION_TOKEN_MAX_AGE_MS)

  // isAfter(current, compare) answers "compare > current", so these read as
  // "issuedAt is before latest" and "issuedAt is after earliest".
  return isAfter(issuedAt, latest) && isAfter(earliest, issuedAt)
}

// Extracts a hostname from either a full URL or a bare host such as "example.com:8443".
export function hostnameOf(value: string) {
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`)
    return normalizeHostname(url.hostname).toLowerCase()
  } catch {
    return ""
  }
}

// True when two host-ish strings name the same host, ignoring scheme, port and a leading "www.".
export function isSameHost(a: string, b: string) {
  const left = hostnameOf(a)
  const right = hostnameOf(b)
  return left !== "" && left === right
}
