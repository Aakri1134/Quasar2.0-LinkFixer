import type { changePasswordSchema, updateProfileSchema } from "@/utils/schemas/user"
import type z from "zod"

export type UserProfile = {
  id: string
  username: string
  email: string
  emailVerified: boolean
  createdAt: string
}

export type getMeOutput = {
  success: boolean
  user: UserProfile
}

export type updateProfilePayload = z.infer<typeof updateProfileSchema>

export type updateProfileOutput = {
  success: boolean
  msg: string
  user: UserProfile
}

// The confirmation field never leaves the form — the API takes currentPassword/newPassword only.
export type changePasswordPayload = Omit<
  z.infer<typeof changePasswordSchema>,
  "confirmPassword"
>

export type changePasswordOutput = {
  success: boolean
  msg: string
}
