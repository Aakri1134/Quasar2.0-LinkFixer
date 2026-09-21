export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    // lowercase protocol + host, strip trailing slash from pathname
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/$/, "") || ""}${u.search}${u.hash}`
  } catch {
    return url.trim()
  }
}

export function isSameUrl(a: string, b: string): boolean {
  return normalizeUrl(a) === normalizeUrl(b)
}

export function isDuplicateUrl(url: string, list: string[]): boolean {
  return list.some((existing) => isSameUrl(existing, url))
}