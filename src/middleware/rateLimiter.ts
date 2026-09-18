import rateLimit from "express-rate-limit";
import { ApiError } from "../utils/apiErrors";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new ApiError(429, "Too many authentication attempts. Try again later.", "RATE_LIMIT"));
  },
});

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new ApiError(429, "Too many OTP requests. Try again later.", "RATE_LIMIT"));
  },
});