import { Router } from "express";
import AuthController from "../controller/AuthController";
import { validateBody, validateParams } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { authLimiter, otpLimiter } from "../middleware/rateLimiter";
import {
  registerSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  biometricChallengeSchema,
  biometricVerifySchema,
  registerDeviceSchema,
  deleteDeviceSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  verifyPhoneSchema,
} from "../validation/authSchemas";

const router = Router();

// Public
router.post("/register", authLimiter, validateBody(registerSchema), AuthController.register);
router.post("/login", authLimiter, validateBody(loginSchema), AuthController.login);
router.post("/logout", validateBody(logoutSchema), AuthController.logout);
router.post("/refresh", authLimiter, validateBody(refreshSchema), AuthController.refresh);

router.post(
  "/biometric/challenge",
  authLimiter,
  validateBody(biometricChallengeSchema),
  AuthController.biometricChallenge
);
router.post(
  "/biometric/verify",
  authLimiter,
  validateBody(biometricVerifySchema),
  AuthController.biometricVerify
);

// Password reset (public)
router.post("/forgot-password", otpLimiter, validateBody(forgotPasswordSchema), AuthController.forgotPassword);
router.post("/reset-password", otpLimiter, validateBody(resetPasswordSchema), AuthController.resetPassword);

// Authenticated
router.use(authenticate);
router.get("/me", AuthController.me);

router.post("/devices/register", validateBody(registerDeviceSchema), AuthController.registerDevice);
router.get("/devices", AuthController.listDevices);
router.delete("/devices/:deviceId", validateParams(deleteDeviceSchema), AuthController.deleteDevice);

router.post("/email/send-otp", otpLimiter, AuthController.sendEmailVerification);
router.post("/email/verify", validateBody(verifyEmailSchema), AuthController.verifyEmail);
router.post("/phone/send-otp", otpLimiter, AuthController.sendPhoneOtp);
router.post("/phone/verify-otp", validateBody(verifyPhoneSchema), AuthController.verifyPhoneOtp);

export default router;