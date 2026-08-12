import z from "zod"

export const sitemapUrlFieldSchema = z.url({
  message: "Invalid sitemap URL",
})

export const addWebsiteSchema = z.object({
  body: z.object({
    baseURL: z.url({ message: "Enter a valid URL"}),
    sitemapURLs: sitemapUrlFieldSchema.array(),
    authentication_mode: z.enum(["cookie", "jwt"]).optional(),
    auth_session_tokens: z
      .array(z.object({ key: z.string().min(1), value: z.string().min(1) }))
      .optional(),
    mail_subscription: z.boolean(),
    agreeToTerms: z.boolean(),
    robots_txt_url: z.url().optional()
  })
})
