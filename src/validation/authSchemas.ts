import Joi from "joi";

const email = Joi.string().email().trim().lowercase().required();
const password = Joi.string().min(8).pattern(/[A-Za-z]/).pattern(/[0-9]/).required();
const passwordConfirmation = Joi.string().valid(Joi.ref("password")).required().messages({
  "any.only": "Password confirmation does not match",
});

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email,
  phone: Joi.string().trim().min(6).max(20).required(),
  password,
  password_confirmation: passwordConfirmation,
  role: Joi.string().valid("buyer", "seller").default("buyer"),
  registration_id: Joi.string().trim().min(2).max(100).optional(),
  registrationId: Joi.string().trim().min(2).max(100).optional(),
}).custom((value, helpers) => {
  if (!value.registration_id && !value.registrationId) return helpers.error("any.custom");
  return { ...value, registration_id: value.registration_id || value.registrationId };
}).messages({
  "any.custom": "registration_id or registrationId is required",
});

export const loginSchema = Joi.object({
  email,
  password: Joi.string().min(1).required(),
  device_id: Joi.string().trim().max(200).optional(),
});

export const logoutSchema = Joi.object({
  refresh_token: Joi.string().optional(),
  refreshToken: Joi.string().optional(),
});

export const refreshSchema = Joi.object({
  refresh_token: Joi.string().optional(),
  refreshToken: Joi.string().optional(),
  device_id: Joi.string().trim().max(200).optional(),
}).custom((value, helpers) => {
  const token = value.refresh_token || value.refreshToken;
  if (!token) return helpers.error("any.custom");
  return { refresh_token: token, ...(value.device_id ? { device_id: value.device_id } : {}) };
}).messages({
  "any.custom": "refresh_token or refreshToken is required",
});

export const biometricChallengeSchema = Joi.object({
  device_id: Joi.string().trim().required(),
});

export const biometricVerifySchema = Joi.object({
  device_id: Joi.string().trim().required(),
  challenge_id: Joi.string().trim().required(),
  signature: Joi.string().trim().required(),
  format: Joi.string().valid("base64", "hex").optional(),
});

export const registerDeviceSchema = Joi.object({
  device_id: Joi.string().trim().required(),
  name: Joi.string().trim().max(100).optional(),
  platform: Joi.string().valid("ios", "android", "web").optional(),
  model: Joi.string().trim().max(100).optional(),
  app_version: Joi.string().trim().max(50).optional(),
  push_token: Joi.string().trim().optional(),
  public_key: Joi.string().trim().optional(),
});

export const deleteDeviceSchema = Joi.object({
  deviceId: Joi.string().trim().required(),
});

export const forgotPasswordSchema = Joi.object({
  email,
});

export const resetPasswordSchema = Joi.object({
  email,
  code: Joi.string().trim().required(),
  password,
  password_confirmation: passwordConfirmation,
});

export const verifyEmailSchema = Joi.object({
  email,
  code: Joi.string().trim().required(),
});

export const verifyPhoneSchema = Joi.object({
  phone: Joi.string().trim().min(6).max(20).required(),
  code: Joi.string().trim().required(),
});
