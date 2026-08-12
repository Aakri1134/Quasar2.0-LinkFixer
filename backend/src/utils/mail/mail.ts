import nodemailer from "nodemailer"
import { env } from "../../config/env.js"
import { verificationMailHTMLTemplate } from "./composeMail/emailVerificationMail.js"
import { reportHTMLTemplate } from "./composeMail/reportMail.js"

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
    throw new Error("Failed to send verification email")
  }
}

export const sendReport = async (data: string[]) => {
  const reportEmail = process.env.REPORT_EMAIL ?? "streamthread2206@gmail.com"

  try {
    await transporter.sendMail({
      from: SENDER,
      to: reportEmail,
      subject: "LinkFixer Report",
      html: reportHTMLTemplate(data),
    })
    console.log(`Report email sent to ${reportEmail}`)
  } catch (error) {
    console.error("Error sending report:", error)
    throw new Error("Failed to send report")
  }
}
