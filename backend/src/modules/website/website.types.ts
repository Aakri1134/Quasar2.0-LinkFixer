import type z from "zod"
import type { addWebsiteSchema } from "./website.schema.js"

export type WebsiteQueueMessage = {
  id: string
  attempt: number
}

export type BrowserQueueMessage = {
  id: string
  failure: number
}

export type PopulatedWebsite = {
  domain: string
  updatedAt: Date
  id: string
}

export type WebsiteSummary = {
  domain: string
  updatedAt: Date
  id: string
}

export type AddWebsitePayload = z.infer<typeof addWebsiteSchema>["body"] & {userId : string}
