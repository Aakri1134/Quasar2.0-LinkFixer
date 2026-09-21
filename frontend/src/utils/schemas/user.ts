import { z } from "zod"

// Mirrors updateProfileSchema on the backend (3-50 chars). Kept in sync deliberately: a client
// rule looser than the server's turns a fixable inline error into a 400 toast.
export const updateProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters"),
})

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>

// The server enforces min 6 and "must differ from current"; confirmPassword exists only here,
// because the API never sees it.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      })
    }
    if (data.currentPassword && data.currentPassword === data.newPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "New password must be different from the current password",
      })
    }
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
