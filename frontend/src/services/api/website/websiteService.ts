import api from "../instance"
import type {
  addWebsitePayload,
  deleteWebsitePayload,
  generateVerificationFileOutput,
  generateVerificationFilePayload,
  getWebsiteByIDPayload,
  getWebsiteForUserOutput,
  ScanStatus,
  scanWebsiteOutput,
  updateWebsiteSettingsOutput,
  updateWebsiteSettingsPayload,
  scanWebsitePayload,
  verifyWebsiteOutput,
  verifyWebsitePayload,
} from "./websiteService.types"

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

  static async generateWebsiteVerification(payload : generateVerificationFilePayload): Promise<generateVerificationFileOutput> {
    return (await api.post(`${WebsiteService.ENDPOINT}/verify/generate`, payload )).data
  }

  // Submits the URL the user uploaded the verification file to, so the server can fetch it back.
  static async verifyWebsite(payload : verifyWebsitePayload): Promise<verifyWebsiteOutput> {
    return (await api.post(`${WebsiteService.ENDPOINT}/verify`, payload)).data
  }

  static async getWebsiteByID(websiteID : string) : Promise<getWebsiteByIDPayload>{
    return (await api.get(`${WebsiteService.ENDPOINT}/${websiteID}`)).data
  }

  // Queues a crawl. Returns { msg: "website already in queue" } rather than erroring when a scan
  // is already in flight — pass force to push past a guard a crashed run left behind.
  static async scanWebsite(payload : scanWebsitePayload): Promise<scanWebsiteOutput> {
    return (await api.post(`${WebsiteService.ENDPOINT}/scan`, payload)).data
  }

  // Point-in-time scan state, read straight out of Redis. Seeds the realtime UI on mount and is
  // the whole story when WebSockets cannot connect.
  static async getScanStatus(websiteID : string): Promise<ScanStatus> {
    return (await api.get(`${WebsiteService.ENDPOINT}/${websiteID}/scan/status`)).data
  }

  // Updates scan frequency / mail subscription. mail_subscription is per-user on the server: it
  // adds or removes the caller from the website's mail_subscribers list.
  static async updateSettings(payload : updateWebsiteSettingsPayload): Promise<updateWebsiteSettingsOutput> {
    const { websiteID, ...body } = payload
    return (await api.patch(`${WebsiteService.ENDPOINT}/${websiteID}/settings`, body)).data
  }

}
