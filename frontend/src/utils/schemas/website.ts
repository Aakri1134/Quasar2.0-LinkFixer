import { z } from "zod"

export const sitemapUrlFieldSchema = z.url({
  message: "Enter a valid sitemap URL",
})

export const addWebsiteSchema = z
  .object({
    baseURL: z.url({ message: "Enter a valid URL, e.g. https://example.com" }),
    sitemapURLs: sitemapUrlFieldSchema.array(),
    enableAuthentication: z.boolean(),
    authentication_mode: z.enum(["cookie", "jwt"]).optional(),
    // In your schema file
    auth_session_tokens: z
      .array(z.object({ key: z.string().min(1), value: z.string().min(1) }))
      .optional(),
    mail_subscription: z.boolean(),
    agreeToTerms: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.enableAuthentication) {
      if (data.enableAuthentication) {
        if (!data.authentication_mode) {
          ctx.addIssue({
            code: "custom",
            path: ["authentication_mode"],
            message: "Select Cookie or JWT",
          })
        }
        if (
          !data.auth_session_tokens ||
          data.auth_session_tokens.length === 0
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["auth_session_tokens"],
            message: "Add at least one token",
          })
        }
      }
    }

    if (!data.agreeToTerms) {
      ctx.addIssue({
        code: "custom",
        path: ["agreeToTerms"],
        message: "You must accept the Terms and Conditions to continue",
      })
    }
  })

export type AddWebsiteFormValues = z.infer<typeof addWebsiteSchema>
