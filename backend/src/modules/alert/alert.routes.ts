import { Router } from "express"
import { authMiddleware } from "../../middleware/auth.js"
import { validate } from "../../middleware/validate.js"
import { alertController } from "./alert.container.js"
import { createAlertSchema, deleteAlertSchema, listAlertsSchema, updateAlertSchema } from "./alert.schema.js"

const router = Router()

// Lists the alerts raised for one website.
router.get("/", authMiddleware, validate(listAlertsSchema), alertController.listAlerts)

// Creates a new alert.
router.post("/", authMiddleware, validate(createAlertSchema), alertController.createAlert)

// Updates an alert.
router.patch("/:alertID", authMiddleware, validate(updateAlertSchema), alertController.updateAlert)

// Deletes an alert.
router.delete("/:alertID", authMiddleware, validate(deleteAlertSchema), alertController.deleteAlert)

export default router
