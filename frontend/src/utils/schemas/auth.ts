import z from "zod"

export const registerSchema = z.object({
    username : z.string().min(1, "Username cannot be empty"),
    email : z.email("Invalid email").min(1, "Email cannot be empty"),
    password : z.string().min(1, "Password should be minimum 6 characters"),
})

export const loginSchema = z.object({
  email: z.email().min(1, "Email cannot be empty"),
  password: z.string().min(1, "Password should be minimum 6 characters"),
})
