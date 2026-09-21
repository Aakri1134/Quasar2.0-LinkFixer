export function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./i, "")
}

export function stripWww(link: string): string {
  try {
    const url = new URL(link)
    url.hostname = url.hostname.replace(/^www\./i, '')
    return url.toString()
  } catch (err) {
    // fallback for malformed URLs / bare hostnames without a protocol
    return link.replace(/^(https?:\/\/)?www\./i, '$1')
  }
}