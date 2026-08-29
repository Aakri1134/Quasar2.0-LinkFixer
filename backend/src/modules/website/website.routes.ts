import { Router } from "express"
import { authMiddleware } from "../../middleware/auth.js"
import services from "../../middleware/services.js"
import { env } from "../../config/env.js"
import { websiteController } from "./website.container.js"
import {
  addWebsiteSchema,
  deleteWebsiteSchema,
  generateVerificationWebsiteSchema,
  getWebsiteByIDSchema,
  scanStatusSchema,
  scanWebsiteSchema,
  updateWebsiteSettingsSchema,
  verificationWebsiteSchema,
} from "./website.schema.js"
import { validate } from "../../middleware/validate.js"

const router = Router()

// Serves the protected website route.
router.get("/protected", authMiddleware, websiteController.getProtected)

// Verifies a website ownership token.
router.post("/verify", authMiddleware, validate(verificationWebsiteSchema), websiteController.verifyWebsite)

// Generates the ownership-proof file a user publishes on their domain.
router.post("/verify/generate", authMiddleware, validate(generateVerificationWebsiteSchema), websiteController.generateVerificationFile)

// Gets all websites for user
router.get("/", authMiddleware, websiteController.getWebsiteForUser)

// Reports the live scan state for a website: the REST fallback for the WebSocket feed.
router.get("/:websiteID/scan/status", authMiddleware, validate(scanStatusSchema), websiteController.getScanStatus)

// Get website by ID
router.get("/:websiteID", authMiddleware, validate(getWebsiteByIDSchema), websiteController.getWebsiteByID)

// Adds a website to the current user.
router.post("/", authMiddleware, validate(addWebsiteSchema), websiteController.addWebsite)

// Updates the scan frequency / mail subscription for a website.
router.patch("/:websiteID/settings", authMiddleware, validate(updateWebsiteSettingsSchema), websiteController.updateWebsiteSettings)

// Removes a website from the current user.
router.delete("/", authMiddleware, validate(deleteWebsiteSchema), websiteController.removeWebsite)

// Queues a scan for a website.
router.post("/scan", authMiddleware, services, validate(scanWebsiteSchema), websiteController.scanWebsite)

// Development-only test route. It is registered at all only in dev, and still sits behind
// authMiddleware: it used to be reachable unauthenticated in every environment (task 2.2).
if (env.NODE_ENV === "dev") {
  router.post("/test-aakri-1234", authMiddleware, websiteController.testWebsite)
}

export default router
