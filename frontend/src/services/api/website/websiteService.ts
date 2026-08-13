import api from "../instance"
import type { addWebsitePayload, deleteWebsitePayload, generateVerificationFilePayload, getWebsiteForUserOutput } from "./websiteService.types"

export class WebsiteService {
  private static ENDPOINT = "/website"

  static async getWebsiteForUser(): Promise<getWebsiteForUserOutput> {
    return (await api.get(WebsiteService.ENDPOINT)).data
  }

  static async addWebsiteForUser(payload : addWebsitePayload): Promise<getWebsiteForUserOutput> {
    return (await api.post(WebsiteService.ENDPOINT, payload)).data
  }

  static async deleteWebsiteForUser(payload : deleteWebsitePayload): Promise<{msg : string}> {
    return (await api.delete(WebsiteService.ENDPOINT, { data: payload })).data
  }

  static async generateWebsiteVerification(payload : generateVerificationFilePayload): Promise<{msg : string, data : Record<string, string>}> {
    return (await api.post(`${WebsiteService.ENDPOINT}/verify/generate`, payload )).data
  }
}
