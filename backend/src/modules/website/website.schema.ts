import z from "zod"
import { MANAGER_TASKS } from "../../workers/managers/Manager.types.js"
import { isIssueDateValid, parseVerificationToken } from "../../utils/website/verification.js"

export const addWebsiteSchema = z.object({
  body: z.object({
    baseURL: z.url({ message: "Enter a valid URL" }),
    mail_subscription: z.boolean(),
    agreeToTerms: z.boolean(),
  }),
})

export const deleteWebsiteSchema = z.object({
  body: z.object({
    websiteID: z.string(),
  }),
})

// POST /verify/generate carries the id in the body — it has no :websiteID segment, so requiring
// one in params made the middleware 400 every call (REPORT P0-6). Matches deleteWebsiteSchema.
export const generateVerificationWebsiteSchema = z.object({
  body: z.object({
    websiteID: z.string(),
  }),
})

export const verificationWebsiteSchema = z.object({
  body: z.object({
    websiteID: z.string(),
    verificationURL : z.url()
  }),
})

export const getWebsiteByIDSchema = z.object({
  params: z.object({
    websiteID: z.string(),
  }),
})

export const scanWebsiteSchema = z.object({
  body: z.object({
    websiteID: z.string(),
    task: z.enum(MANAGER_TASKS).optional(),
    force: z.boolean().optional(),
  }),
})

export const scanStatusSchema = z.object({
  params: z.object({
    websiteID: z.string(),
  }),
})

// Shape of the JSON file a site owner uploads to prove ownership. Every field is untrusted input:
// it is fetched from a third-party server, so it is parsed here before anything reads it.
export const verificationSchema = z.object({
  token: z.string().refine((value) => parseVerificationToken(value) !== null, {
    message: "Malformed verification token",
  }),
  // The file is JSON.parse'd, so this arrives as a string and z.date() rejected every real token.
  // The age check lives in isIssueDateValid: issued in the past, and no older than 30 days.
  issueDate: z.coerce.date().refine((value) => isIssueDateValid(value), {
    message: "Verification token is expired or was issued in the future",
  }),
  // A bare host such as "example.com". Website.domain is url.host, not a URL, so z.url() here
  // rejected every file this API itself generated.
  domain: z.string().min(1, { message: "Missing domain" }),
})

// PATCH /website/:websiteID/settings. Both fields are optional so the UI can save one control at
// a time, but at least one must be present — an empty body is a no-op the caller did not intend.
export const updateWebsiteSettingsSchema = z.object({
  params: z.object({
    websiteID: z.string(),
  }),
  body: z
    .object({
      scan_frequency: z.enum(["off", "daily", "weekly", "monthly"]).optional(),
      mail_subscription: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one setting to update",
    }),
})
