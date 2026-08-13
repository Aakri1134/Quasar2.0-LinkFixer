import { Router } from "express"
import { authMiddleware } from "../../middleware/auth.js"
import services from "../../middleware/services.js"
import { websiteController } from "./website.container.js"
import { addWebsiteSchema, deleteWebsiteSchema, generateVerificationWebsiteSchema } from "./website.schema.js"
import { validate } from "../../middleware/validate.js"

const router = Router()

// Serves the protected website route.
router.get("/protected", authMiddleware, websiteController.getProtected)

// Verifies a website ownership token.
router.post("/verify", authMiddleware, websiteController.verifyWebsite)

// Verifies a website ownership token.
router.post("/verify/generate", authMiddleware, validate(generateVerificationWebsiteSchema), websiteController.generateVerificationFile)

// Gets all websites for user
router.get("/", authMiddleware, websiteController.getWebsiteForUser)

// Adds a website to the current user.
router.post("/", authMiddleware, validate(addWebsiteSchema), websiteController.addWebsite)

// Removes a website from the current user.
router.delete("/", authMiddleware, validate(deleteWebsiteSchema), websiteController.removeWebsite)

// Queues a scan for a website.
router.post("/scan", authMiddleware, services, websiteController.scanWebsite)

// Development-only test route.
router.post("/test-aakri-1234", websiteController.testWebsite)

export default router
