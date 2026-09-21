import { Router } from "express"
import { authMiddleware } from "../../middleware/auth.js"
import { validate } from "../../middleware/validate.js"
import { checkController } from "./check.container.js"
import { getCheckSchema, listChecksSchema } from "./check.schema.js"

const router = Router()

// Lists the scan history for one website.
router.get("/", authMiddleware, validate(listChecksSchema), checkController.listChecks)

// Serves one check with a paginated window over its checked links.
router.get("/:checkID", authMiddleware, validate(getCheckSchema), checkController.getCheck)

export default router
