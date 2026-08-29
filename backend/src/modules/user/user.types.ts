import type z from "zod"
import type { changePasswordSchema, updateProfileSchema } from "./user.schema.js"

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>["body"]

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>["body"]

export type UserProfile = {
	id: string
	username: string
	email: string
	emailVerified: boolean
	createdAt: Date
}

// Shape of a website document once User.websites has been populated.
export type PopulatedUserWebsite = {
	domain: string
	updatedAt: Date
	id: string
}
