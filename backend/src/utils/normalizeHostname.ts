export function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./i, "")
}