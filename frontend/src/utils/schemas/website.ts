import { z } from "zod"

export const sitemapUrlFieldSchema = z.url({
  message: "Enter a valid sitemap URL",
})

export const addWebsiteSchema = z
  .object({
    baseURL: z.url({ message: "Enter a valid URL, e.g. https://example.com" }),
    mail_subscription: z.boolean(),
    agreeToTerms: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.agreeToTerms) {
      ctx.addIssue({
        code: "custom",
        path: ["agreeToTerms"],
        message: "You must accept the Terms and Conditions to continue",
      })
    }
  })

export type AddWebsiteFormValues = z.infer<typeof addWebsiteSchema>

export const websiteVerificationFormSchema = z.object({
    websiteID: z.string(),
    verificationURL : z.url()
  })

export type WebsiteVerificationFormValues = z.infer<
  typeof websiteVerificationFormSchema
>

// One header or cookie the crawler replays on every request to an authenticated site.
export const crawlCredentialSchema = z.object({
  key: z.string().trim().min(1, "Name cannot be empty"),
  value: z.string().min(1, "Value cannot be empty"),
})

export type CrawlCredentialFormValues = z.infer<typeof crawlCredentialSchema>

// Mirrors the scan_frequency enum on WebsiteSchema.
export const scanFrequencySchema = z.enum(["off", "daily", "weekly", "monthly"])

export type ScanFrequencyValue = z.infer<typeof scanFrequencySchema>

// Shape of the Settings tab form. There is no PATCH /website endpoint yet, so this describes the
// form only — wire it up once the backend exposes one.
export const websiteSettingsSchema = z.object({
  mail_subscription: z.boolean(),
  scan_frequency: scanFrequencySchema,
  cookies: z.array(crawlCredentialSchema).default([]),
  headers: z.array(crawlCredentialSchema).default([]),
})

export type WebsiteSettingsFormValues = z.infer<typeof websiteSettingsSchema>

// The three scans that can be triggered from the UI. Mirrors MANAGER_TASKS on the backend.
export const managerTaskSchema = z.enum([
  "eval_sitemap",
  "eval_links",
  "eval_seo",
])

export const scanWebsiteSchema = z.object({
  websiteID: z.string().min(1),
  task: managerTaskSchema.optional(),
  force: z.boolean().optional(),
})

export type ScanWebsiteFormValues = z.infer<typeof scanWebsiteSchema>
