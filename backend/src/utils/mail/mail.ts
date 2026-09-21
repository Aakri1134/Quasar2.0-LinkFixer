import nodemailer from "nodemailer"
import { env } from "../../config/env.js"
import { verificationMailHTMLTemplate } from "./composeMail/emailVerificationMail.js"
import { reportHTMLTemplate } from "./composeMail/reportMail.js"
import type { ReportSummary } from "./composeMail/reportMail.js"

export type { ReportErrorCode, ReportSummary } from "./composeMail/reportMail.js"

// Reuse a single transporter across calls instead of creating one per email.
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT ?? 587),
  secure: env.SMTP_PORT === "465",
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
})

const SENDER = { name: "LinkFixer", address: env.SMTP_USER }

// Trims, drops blanks, and de-duplicates case-insensitively, so a website that has the same
// address subscribed twice still receives exactly one email.
const normaliseRecipients = (recipients: string[]) => {
  const seen = new Set<string>()
  const unique: string[] = []

  for (const recipient of recipients) {
    const address = (recipient ?? "").trim()
    if (!address) continue

    const key = address.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    unique.push(address)
  }

  return unique
}

// Emails a signup verification link to a single address.
export const sendVerificationEmail = async (
  email: string,
  verificationToken: string,
) => {
  const verificationUrl = `${env.FRONTEND_URL}/verify-email/${verificationToken}`

  try {
    await transporter.sendMail({
      from: SENDER,
      to: email,
      subject: "LinkFixer Signup Email verification",
      html: verificationMailHTMLTemplate(verificationUrl),
    })
    console.log(`Verification email sent to ${email}`)
  } catch (error) {
    console.error("Error sending verification email:", error)
    console.log(env)
    throw new Error("Failed to send verification email")
  }
}

// Emails a finished scan's summary to a website's subscribers.
// Recipients are resolved by the caller (Website.mail_subscribers -> user emails); env.REPORT_EMAIL
// is only a fallback for deployments that want every report copied to one operations mailbox.
// With neither configured this warns and does nothing: a report must never go to an address that
// happens to be compiled into the source.
export const sendReport = async (
  recipients: string[],
  website: string,
  summary: ReportSummary,
): Promise<{ sent: boolean; recipients: string[] }> => {
  const to = normaliseRecipients(recipients.length > 0 ? recipients : [env.REPORT_EMAIL])

  if (to.length === 0) {
    console.warn(
      `No report recipients for ${website} - subscribe a user or set REPORT_EMAIL; skipping report email`,
    )
    return { sent: false, recipients: [] }
  }

  try {
    await transporter.sendMail({
      from: SENDER,
      to,
      subject: `LinkFixer report for ${website}`,
      html: reportHTMLTemplate(website, summary),
    })
    console.log(`Report email sent to ${to.length} recipient(s) for ${website}`)
    return { sent: true, recipients: to }
  } catch (error) {
    console.error("Error sending report:", error)
    throw new Error("Failed to send report")
  }
}
