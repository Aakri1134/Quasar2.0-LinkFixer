import type { AlertRepository } from "./alert.repository.js";
import { AppError } from "../../utils/AppError.js";
import type { AlertListFilter, CreateAlertInput, DeleteAlertInput, ListAlertsQuery, UpdateAlertInput, UpdateAlertRepositoryInput } from "./alert.types.js";

const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 100

export class AlertService {
  constructor(private readonly repo: AlertRepository) {}

  // Lists the alerts raised for one website the caller has access to.
  async listAlerts(userID: string, query: ListAlertsQuery) {
    await this.assertWebsiteAccess(userID, query.websiteID)

    const page = this.resolvePage(query.page)
    const limit = this.resolveLimit(query.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)

    const filter: AlertListFilter = { website: query.websiteID }

    if (query.solved !== undefined) {
      // Alerts written by the Manager never set `solved`, so "unsolved" has to mean
      // "not explicitly true" — an equality test on false would match nothing.
      filter.solved = query.solved ? true : { $ne: true }
    }

    if (query.error_code !== undefined) {
      filter.error_code = query.error_code
    }

    const [alerts, total] = await Promise.all([
      this.repo.findAlerts(filter, (page - 1) * limit, limit),
      this.repo.countAlerts(filter),
    ])

    return {
      success: true,
      alerts,
      total,
      page,
      limit,
    }
  }

  // Creates a new alert on a website the caller has access to.
  async createAlert(input: CreateAlertInput, userID: string) {
    // The website id comes straight off the request body, so it is only trustworthy once it has
    // been matched against the caller's own websites.
    await this.assertWebsiteAccess(userID, input.website)

    const link = input.link.trim()
    const error_code = input.error_code?.trim()

    const alert = this.repo.createAlert({
      ...input,
      link,
      error_code,
    })

    await this.repo.saveAlert(alert)

    return {
      success: true,
      msg: "Alert created successfully",
      alert,
    }
  }

  // Updates an existing alert the caller has access to.
  async updateAlert(input: UpdateAlertInput, userID: string) {
    const existingAlert = await this.repo.findAlertForUser(input.alertID, userID)
    if (!existingAlert || !existingAlert.website) {
      throw new AppError("Alert not found", 404)
    }

    const updates: UpdateAlertRepositoryInput = { ...input }
    delete (updates as { alertID?: string }).alertID

    if (typeof updates.solved === "boolean") {
      updates.solvedAt = updates.solved ? new Date() : null
      updates.solvedBy = updates.solved ? userID : null
    }

    const updatedAlert = await this.repo.updateAlertById(input.alertID, updates)

    if (!updatedAlert) {
      throw new AppError("Alert not found", 404)
    }

    return {
      success: true,
      msg: "Alert updated successfully",
      alert: updatedAlert,
    }
  }

  // Deletes an alert the caller has access to.
  async deleteAlert(input: DeleteAlertInput, userID: string) {
    const existingAlert = await this.repo.findAlertForUser(input.alertID, userID)
    if (!existingAlert || !existingAlert.website) {
      throw new AppError("Alert not found", 404)
    }

    const deletedAlert = await this.repo.deleteAlertById(input.alertID)
    if (!deletedAlert) {
      throw new AppError("Alert not found", 404)
    }

    return {
      success: true,
      msg: "Alert deleted successfully",
      alert: deletedAlert,
    }
  }

  // Throws 404 unless the user is attached to the website. 404 rather than 403 on purpose:
  // a 403 confirms the record exists and so leaks its existence to anyone guessing ids.
  private async assertWebsiteAccess(userID: string, websiteID: string, message = "Website not found") {
    const website = await this.repo.findWebsiteForUser(websiteID, userID)

    if (!website) {
      throw new AppError(message, 404)
    }
  }

  // Normalises a requested page number to a whole number of at least 1.
  private resolvePage(requested: number | undefined) {
    return requested !== undefined && Number.isInteger(requested) && requested > 0 ? requested : 1
  }

  // Clamps a requested page size into [1, max], falling back when it is absent or unusable.
  private resolveLimit(requested: number | undefined, fallback: number, max: number) {
    const candidate =
      requested !== undefined && Number.isInteger(requested) && requested > 0 ? requested : fallback
    const safe = Number.isInteger(candidate) && candidate > 0 ? candidate : 1

    return Math.min(safe, max)
  }

}
