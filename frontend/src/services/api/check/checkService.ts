import api from "../instance"
import type {
  getCheckByIdOutput,
  getCheckByIdPayload,
  getChecksOutput,
  getChecksPayload,
} from "./checkService.types"

export class CheckService {
  private static ENDPOINT = "/check"

  // Scan history for one website, newest first. The response carries no checkedLinks payload —
  // fetch a single check for that.
  static async getChecks(payload : getChecksPayload): Promise<getChecksOutput> {
    const { websiteID, page, limit } = payload
    return (
      await api.get(CheckService.ENDPOINT, {
        params: {
          websiteID,
          ...(page !== undefined ? { page } : {}),
          ...(limit !== undefined ? { limit } : {}),
        },
      })
    ).data
  }

  // One check with a $slice window over its links. linkPage/linkLimit page *inside* the document,
  // which is why they are named separately from the list endpoint's page/limit.
  static async getCheckById(payload : getCheckByIdPayload): Promise<getCheckByIdOutput> {
    const { checkID, linkPage, linkLimit } = payload
    return (
      await api.get(`${CheckService.ENDPOINT}/${checkID}`, {
        params: {
          ...(linkPage !== undefined ? { linkPage } : {}),
          ...(linkLimit !== undefined ? { linkLimit } : {}),
        },
      })
    ).data
  }
}
