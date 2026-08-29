import { Router } from "express"
import { authMiddleware } from "../../middleware/auth.js"
import { validate } from "../../middleware/validate.js"
import { userController } from "./user.container.js"
import { changePasswordSchema, getProfileSchema, updateProfileSchema } from "./user.schema.js"

const router = Router()

// GET /websites was removed: it duplicated GET /api/website, which is canonical and is what the
// frontend already consumes. Do not re-add it here - extend the website module instead.

// Serves the authenticated user profile.
router.get("/me", authMiddleware, validate(getProfileSchema), userController.getProfile)

// Updates the authenticated user profile.
router.patch("/me", authMiddleware, validate(updateProfileSchema), userController.updateProfile)

// Changes the authenticated user password.
router.post("/password", authMiddleware, validate(changePasswordSchema), userController.changePassword)

export default router
