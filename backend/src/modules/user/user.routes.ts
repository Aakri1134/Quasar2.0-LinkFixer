import { Router } from "express"
import { userController } from "./user.container.js"
import { authMiddleware } from "../../middleware/auth.js"

const router = Router()

// Serves the authenticated user's websites.
router.get("/websites", authMiddleware, userController.getWebsites)

export default router
