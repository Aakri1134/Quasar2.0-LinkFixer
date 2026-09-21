import z from "zod"

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id")

// Query params always arrive as strings, and an absent one is `undefined`. An empty value
// ("?page=") is treated as absent so it falls back to the server default rather than 400ing.
// The 7-digit ceiling keeps a hostile `?page=99999999999999` out of the $skip stage.
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

export const listChecksQuerySchema = z.object({
  websiteID: objectIdSchema,
  page: optionalPositiveInt,
  limit: optionalPositiveInt,
})

export const listChecksSchema = z.object({
  query: listChecksQuerySchema,
})

export const getCheckQuerySchema = z.object({
  linkPage: optionalPositiveInt,
  linkLimit: optionalPositiveInt,
})

export const getCheckSchema = z.object({
  params: z.object({
    checkID: objectIdSchema,
  }),
  query: getCheckQuerySchema,
})
