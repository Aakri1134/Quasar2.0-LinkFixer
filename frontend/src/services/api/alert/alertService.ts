import api from "../instance"
import type {
  alertMutationOutput,
  deleteAlertPayload,
  getAlertsOutput,
  getAlertsPayload,
  updateAlertPayload,
} from "./alertService.types"

export class AlertService {
  private static ENDPOINT = "/alert"

  // Lists the alerts raised for one website. Every filter is optional except websiteID; the
  // server rejects an absent or malformed id with 404 rather than leaking whether it exists.
  static async getAlerts(payload : getAlertsPayload): Promise<getAlertsOutput> {
    const { websiteID, solved, error_code, page, limit } = payload
    return (
      await api.get(AlertService.ENDPOINT, {
        params: {
          websiteID,
          // Express serialises booleans to "true"/"false", which is exactly what the query schema
          // parses. Skipping the key entirely is what "no filter" means — not sending "undefined".
          ...(solved !== undefined ? { solved } : {}),
          ...(error_code ? { error_code } : {}),
          ...(page !== undefined ? { page } : {}),
          ...(limit !== undefined ? { limit } : {}),
        },
      })
    ).data
  }

  // Patches one alert. Used for the resolve toggle; the server stamps solvedAt/solvedBy itself.
  static async updateAlert(payload : updateAlertPayload): Promise<alertMutationOutput> {
    const { alertID, ...body } = payload
    return (await api.patch(`${AlertService.ENDPOINT}/${alertID}`, body)).data
  }

  // Permanently removes an alert.
  static async deleteAlert(payload : deleteAlertPayload): Promise<alertMutationOutput> {
    return (await api.delete(`${AlertService.ENDPOINT}/${payload.alertID}`)).data
  }
}
