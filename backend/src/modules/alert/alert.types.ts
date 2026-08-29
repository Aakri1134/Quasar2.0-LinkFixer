import type z from "zod"
import type { createAlertSchema, deleteAlertSchema, listAlertsQuerySchema, updateAlertSchema } from "./alert.schema.js"

export type CreateAlertInput = z.infer<typeof createAlertSchema>["body"]

export type UpdateAlertBody = z.infer<typeof updateAlertSchema>["body"]

export type UpdateAlertInput = UpdateAlertBody &
	z.infer<typeof updateAlertSchema>["params"]

export type UpdateAlertRepositoryInput = UpdateAlertBody & {
	solvedAt?: Date | null
	solvedBy?: string | null
}

export type DeleteAlertInput = z.infer<typeof deleteAlertSchema>["params"]

export type ListAlertsQuery = z.infer<typeof listAlertsQuerySchema>

// Mongo filter built from ListAlertsQuery. `solved` widens to a $ne because alerts written by the
// Manager omit the field entirely, so "unsolved" cannot mean `=== false`.
export type AlertListFilter = {
	website: string
	solved?: boolean | { $ne: true }
	error_code?: string
}

// Shape of Alert.website once populate({ match: { userID } }) has run: the document when the
// requesting user is attached to the website, and null when they are not.
export type AlertWebsiteRef = {
	_id: unknown
}
