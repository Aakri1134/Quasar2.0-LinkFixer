import axios from "axios"
import jwt from "jsonwebtoken"
import { Website } from "../../models/website.js"

type VerificationResult = {
  success: boolean
  error?: string
}

// Verifies a website ownership file and updates the owner when valid.
export default async function verifyWebsite(
  link: string,
  userID: string,
  replace = false,
): Promise<VerificationResult> {
  try {
    const url = new URL(link)
    const domain = url.hostname

    const response = await axios.get(link, {
      timeout: 10000,
      headers: { "User-Agent": "LinkFixerBot/1.0" },
      responseType: "text",
      validateStatus: (status) => status === 200,
    })

    let jwtToken = response.data
    if (typeof jwtToken !== "string") {
      return {
        success: false,
        error: "Verification file must contain plain text JWT token",
      }
    }

    jwtToken = jwtToken
      .trim()
      .replace(/\n/g, "")
      .replace(/\r/g, "")
      .replace(/\s+/g, "")
      .replace(/^\uFEFF/, "")

    if ((jwtToken.match(/\./g) || []).length !== 2) {
      return {
        success: false,
        error: "Invalid JWT format. Token must have format: header.payload.signature",
      }
    }

    if (jwtToken.includes("<") || jwtToken.includes(">")) {
      return {
        success: false,
        error:
          "Verification file contains HTML. Please ensure it contains only the JWT token.",
      }
    }

    const secret = process.env.JWT_VERIFICATION_SECRET
    if (!secret) {
      return {
        success: false,
        error: "Verification secret is not configured",
      }
    }

    const decoded = jwt.verify(jwtToken, secret) as {
      domain?: string
      websiteID?: string
      owner?: string
    }

    const normalizedDomain = domain.replace(/^www\./, "")
    const normalizedJWTDomain = (decoded.domain ?? "").replace(/^www\./, "")

    if (normalizedJWTDomain !== normalizedDomain) {
      return {
        success: false,
        error: `Domain mismatch: JWT is for ${decoded.domain}, but file is hosted on ${domain}`,
      }
    }

    const website = await Website.findById(decoded.websiteID)
    if (!website) {
      return {
        success: false,
        error: `Website not found in database`,
      }
    }

    if (!website.userID.includes(userID as any) || decoded.owner !== userID) {
      return {
        success: false,
        error: `Invalid user`,
      }
    }

    if (!replace && website.ownerID) {
      return {
        success: false,
        error: `Website already has a owner`,
      }
    }

    if (!website.ownerID) {
      website.ownerID = userID as any
      website.verifiedUsers.push(userID as any)
      await website.save()
      return { success: true }
    }

    if (replace && website.verifiedUsers.includes(userID as any)) {
      website.ownerID = userID as any
      await website.save()
      return { success: true }
    }

    return {
      success: false,
      error: `New owner must be verified by previous owner`,
    }
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      return {
        success: false,
        error: `Invalid JWT token. Please ensure the file contains a valid token.`,
      }
    }

    if (error.name === "TokenExpiredError") {
      return {
        success: false,
        error: `JWT token has expired. Please generate a new verification token.`,
      }
    }

    if (error.code === "ENOTFOUND") {
      return {
        success: false,
        error: `Cannot reach the URL: ${link}`,
      }
    }

    if (error.code === "ECONNREFUSED") {
      return {
        success: false,
        error: `Connection refused to ${link}`,
      }
    }

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return {
          success: false,
          error: `Verification file not found at ${link}`,
        }
      }

      if (error.response?.status === 403) {
        return {
          success: false,
          error: `Access forbidden to ${link}`,
        }
      }

      return {
        success: false,
        error: `Failed to fetch verification file (HTTP ${error.response?.status})`,
      }
    }

    if (error.message?.includes("Invalid URL")) {
      return {
        success: false,
        error: `Invalid URL format: ${link}`,
      }
    }

    console.error("Verification error:", error)
    return {
      success: false,
      error: `Verification failed: ${error.message}`,
    }
  }
}