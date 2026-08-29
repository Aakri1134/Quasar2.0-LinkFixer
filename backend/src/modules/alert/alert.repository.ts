import { Alert } from "../../models/alert.js"
import { Website } from "../../models/website.js"
import type { AlertListFilter, AlertWebsiteRef, CreateAlertInput, UpdateAlertRepositoryInput } from "./alert.types.js"

export class AlertRepository {
  // Creates an alert document instance.
  createAlert(data: CreateAlertInput) {
    return new Alert(data)
  }

  // Loads an alert document by id.
  findAlertById(alertID: string) {
    return Alert.findById(alertID)
  }

  // Loads an alert only if the requesting user is attached to its website.
  // The match runs inside populate, so an alert belonging to someone else comes back with
  // website === null instead of being filtered out — callers treat that as "not found".
  findAlertForUser(alertID: string, userId: string) {
    return Alert.findById(alertID).populate<{ website: AlertWebsiteRef | null }>({
      path: "website",
      match: { userID: userId },
    })
  }

  // Loads a website by id only if the requesting user is attached to it.
  findWebsiteForUser(websiteID: string, userId: string) {
    return Website.findOne({ _id: websiteID, userID: userId }).select("_id").lean()
  }

  // Lists alerts matching a filter, newest-updated first.
  findAlerts(filter: AlertListFilter, skip: number, limit: number) {
    return Alert.find(filter).sort({ updatedAt: -1, _id: -1 }).skip(skip).limit(limit).lean()
  }

  // Counts alerts matching a filter, for the pagination total.
  countAlerts(filter: AlertListFilter) {
    return Alert.countDocuments(filter)
  }

  // Applies partial updates on an alert and returns the updated document.
  updateAlertById(alertID: string, updates: UpdateAlertRepositoryInput) {
    return Alert.findByIdAndUpdate(alertID, updates, { new: true })
  }

  // Deletes an alert by id and returns the deleted document.
  deleteAlertById(alertID: string) {
    return Alert.findByIdAndDelete(alertID)
  }

  // Persists an alert document.
  saveAlert(alert: InstanceType<typeof Alert>) {
    return alert.save()
  }

}
