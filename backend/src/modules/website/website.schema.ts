import z from "zod"

export const addWebsiteSchema = z.object({
  body: z.object({
    baseURL: z.url({ message: "Enter a valid URL"}),
    mail_subscription: z.boolean(),
    agreeToTerms: z.boolean(),
  })
})

export const deleteWebsiteSchema = z.object({
  body: z.object({
    websiteID: z.string()
  })
})

export const generateVerificationWebsiteSchema = z.object({
  body: z.object({
    websiteID: z.string()
  })
})
