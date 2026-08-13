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
