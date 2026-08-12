import { Router } from "express"
import { authMiddleware } from "../../middleware/auth.js"
import { validate } from "../../middleware/validate.js"
import { authLoginSchema, authRegisterSchema, authResendVerificationSchema, authVerifyEmailSchema } from "./auth.schema.js"
import { authController } from "./auth.container.js"

const router = Router()

// Auth routes keep middleware here and delegate work to the controller.
router.post("/register", validate(authRegisterSchema), authController.register)

router.get("/verifyAuth", authMiddleware, authController.verifyAuth)

router.post("/logout", authController.logout)

router.post("/login", validate(authLoginSchema), authController.login)

router.get("/verify-email", validate(authVerifyEmailSchema), authController.verifyEmail)

router.post("/resend-verification", validate(authResendVerificationSchema), authController.resendVerification)

router.get("/user", authMiddleware, authController.getUser)


export default router