// One error code and how many broken links carried it. `code` is a string on Alert.error_code but
// callers counting raw HTTP statuses may hand over numbers, so both are accepted.
export type ReportErrorCode = {
  code: string | number
  count: number
}

// Everything the report email renders. Built by the reporter worker from a finished Check.
export type ReportSummary = {
  totalLinks: number
  brokenLinks: number
  durationMs: number
  topErrorCodes: ReportErrorCode[]
}

// Escapes text before it is interpolated into the email HTML. Domains and error codes come from
// crawled pages, so they are untrusted input even though they end up in an email we send.
const escapeHtml = (value: string | number) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

// Renders a duration in the largest unit that keeps it readable.
const formatDuration = (durationMs: number) => {
  if (!Number.isFinite(durationMs) || durationMs < 0) return "unknown"
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`

  const totalSeconds = Math.round(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) return `${seconds}s`

  const hours = Math.floor(minutes / 60)
  if (hours === 0) return `${minutes}m ${seconds}s`

  return `${hours}h ${minutes % 60}m`
}

// One label/value line in the summary block.
const statRow = (label: string, value: string, valueColor: string) => `
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eef2ef; color:#4b5a52; font-size: 14px;">
                      ${escapeHtml(label)}
                    </td>
                    <td align="right" style="padding: 10px 0; border-bottom: 1px solid #eef2ef; color:${valueColor}; font-size: 14px; font-weight: bold;">
                      ${escapeHtml(value)}
                    </td>
                  </tr>`

// Renders the top error codes, or nothing at all when the scan found no broken links.
const errorCodeBlock = (topErrorCodes: ReportErrorCode[]) => {
  if (topErrorCodes.length === 0) return ""

  const rows = topErrorCodes
    .map(
      ({ code, count }) => `
                  <tr>
                    <td style="padding: 8px 0; color:#4b5a52; font-size: 14px;">
                      <code style="background:#f4f7f5; padding: 2px 8px; border-radius: 4px; color:#0f3d2a;">${escapeHtml(code)}</code>
                    </td>
                    <td align="right" style="padding: 8px 0; color:#4b5a52; font-size: 14px;">
                      ${escapeHtml(count)}
                    </td>
                  </tr>`,
    )
    .join("")

  return `
                <h2 style="margin: 32px 0 8px; color:#0f3d2a; font-size: 16px; font-weight: bold;">
                  Most common errors
                </h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
                </table>`
}

// Builds the scan report email body for a single website.
export const reportHTMLTemplate = (website: string, summary: ReportSummary) => {
  const { totalLinks, brokenLinks, durationMs, topErrorCodes } = summary
  const brokenColor = brokenLinks > 0 ? "#c0392b" : "#0f3d2a"
  const brokenShare =
    totalLinks > 0 ? ` (${Math.round((brokenLinks / totalLinks) * 100)}%)` : ""

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LinkFixer report</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f7f5; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f5; padding: 40px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">

            <!-- Header -->
            <tr>
              <td style="background-color:#0f3d2a; padding: 28px 32px;">
                <span style="color:#ffffff; font-size: 20px; font-weight: bold; letter-spacing: 1px;">
                  MAKORA
                </span>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 40px 32px;">
                <h1 style="margin: 0 0 16px; color:#0f3d2a; font-size: 24px; font-weight: bold;">
                  Scan report
                </h1>
                <p style="margin: 0 0 24px; color:#4b5a52; font-size: 15px; line-height: 1.6;">
                  Here are the results of the latest scan of
                  <strong style="color:#0f3d2a;">${escapeHtml(website)}</strong>.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${statRow("Links checked", String(totalLinks), "#0f3d2a")}${statRow("Broken links", `${brokenLinks}${brokenShare}`, brokenColor)}${statRow("Scan duration", formatDuration(durationMs), "#0f3d2a")}
                </table>
${errorCodeBlock(topErrorCodes)}
                <p style="margin: 32px 0 0; color:#8a978f; font-size: 13px; line-height: 1.6;">
                  Open your LinkFixer dashboard for the full list of affected links.
                  You are receiving this because you subscribed to reports for this website.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 20px 32px; background-color:#f4f7f5;">
                <p style="margin:0; color:#a3ada6; font-size: 12px;">
                  &copy; ${new Date().getFullYear()} Makora. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
