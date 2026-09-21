import z from "zod"

// The read routes take no input; the schemas exist so every route goes through validate().
export const getWebsitesSchema = z.object({
	query: z.object({}),
})

export const getProfileSchema = z.object({
	query: z.object({}),
})

export const updateProfileSchema = z.object({
	body: z.object({
		username: z
			.string({ error: "Invalid username" })
			.min(3, "Username must be at least 3 characters")
			.max(50, "Username must be at most 50 characters"),
	}),
})

export const changePasswordSchema = z.object({
	body: z
		.object({
			currentPassword: z.string({ error: "Invalid password" }).min(1, "Current password is required"),
			newPassword: z
				.string({ error: "Invalid password" })
				.min(6, "Password must be at least 6 characters"),
		})
		.refine((data) => data.currentPassword !== data.newPassword, {
			message: "New password must be different from the current password",
		}),
})
