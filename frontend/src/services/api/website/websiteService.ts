import api from "../instance"
import type { addWebsitePayload, getWebsiteForUserOutput } from "./websiteService.types"

export class WebsiteService {
  private static ENDPOINT = "/website"

  static async getWebsiteForUser(): Promise<getWebsiteForUserOutput> {
    return (await api.get(WebsiteService.ENDPOINT)).data
  }

  static async addWebsiteForUser(payload : addWebsitePayload): Promise<getWebsiteForUserOutput> {
    return (await api.post(WebsiteService.ENDPOINT, payload)).data
  }
}
