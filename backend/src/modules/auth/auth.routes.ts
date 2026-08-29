import { Router } from "express"
import { authMiddleware } from "../../middleware/auth.js"
import { validate } from "../../middleware/validate.js"
import { authLimiter } from "../../middleware/rateLimit.js"
import { authLoginSchema, authRegisterSchema, authResendVerificationSchema, authVerifyEmailSchema } from "./auth.schema.js"
import { authController } from "./auth.container.js"

const router = Router()

// Auth routes keep middleware here and delegate work to the controller.
// authLimiter runs first on the three unauthenticated, abusable endpoints: credential stuffing on
// /login and /register, and /resend-verification, which mails an arbitrary address on demand.
// It is imported here rather than in server.ts: server.ts -> routes.ts -> auth.routes.ts, so a
// server.ts import would be a temporal dead zone crash at startup.
router.post("/register", authLimiter, validate(authRegisterSchema), authController.register)

router.get("/verifyAuth", authMiddleware, authController.verifyAuth)

router.post("/logout", authController.logout)

router.post("/login", authLimiter, validate(authLoginSchema), authController.login)

router.get("/verify-email", validate(authVerifyEmailSchema), authController.verifyEmail)

router.post("/resend-verification", authLimiter, validate(authResendVerificationSchema), authController.resendVerification)

router.get("/user", authMiddleware, authController.getUser)


export default router