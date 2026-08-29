import z from "zod"

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id")

const assignmentSchema = z.object({
	assignedTo: objectIdSchema.optional(),
	assignedBy: objectIdSchema.optional(),
})

export const createAlertSchema = z.object({
	body: z.object({
		website: objectIdSchema,
		check: z.array(objectIdSchema).min(1, "At least one check id is required"),
		link: z.string().min(1, "Invalid link"),
		error_code: z.string().optional(),
		details: z.unknown().optional(),
		manager: z.string().optional(),
		assignment: z.array(assignmentSchema).optional(),
		solved: z.boolean().optional(),
	}),
})

export const updateAlertSchema = z.object({
	params: z.object({
		alertID: objectIdSchema,
	}),
	body: z
		.object({
			check: z.array(objectIdSchema).min(1, "At least one check id is required").optional(),
			link: z.string().min(1, "Invalid link").optional(),
			error_code: z.string().optional(),
			details: z.unknown().optional(),
			manager: z.string().optional(),
			assignment: z.array(assignmentSchema).optional(),
			solved: z.boolean().optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "Provide at least one field to update",
		}),
})

export const deleteAlertSchema = z.object({
	params: z.object({
		alertID: objectIdSchema,
	}),
})

// Query params always arrive as strings, and an absent one is `undefined`. An empty value
// ("?page=") is treated as absent so it falls back to the server default rather than 400ing.
// The 7-digit ceiling keeps a hostile `?page=99999999999999` out of the .skip() stage.
const optionalPositiveInt = z
	.string()
	.trim()
	.optional()
	.refine((value) => value === undefined || value === "" || /^\d{1,7}$/.test(value), {
		message: "Must be a whole number",
	})
	.transform((value) => (value === undefined || value === "" ? undefined : Number(value)))
	.refine((value) => value === undefined || value >= 1, {
		message: "Must be at least 1",
	})

export const listAlertsQuerySchema = z.object({
	websiteID: objectIdSchema,
	solved: z
		.enum(["true", "false"])
		.transform((value) => value === "true")
		.optional(),
	error_code: z.string().trim().min(1, "Invalid error code").optional(),
	page: optionalPositiveInt,
	limit: optionalPositiveInt,
})

export const listAlertsSchema = z.object({
	query: listAlertsQuerySchema,
})
