import Joi from "joi";

export const profileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  phone: Joi.string().trim().min(6).max(30).optional(),
  bio: Joi.string().trim().max(1000).optional(),
  gender: Joi.string().valid("male", "female", "non_binary", "prefer_not_to_say").optional(),
  date_of_birth: Joi.date().iso().max("now").optional(),
}).min(1);

export const profilePhotoSchema = Joi.object({
  photo_url: Joi.string().uri().max(2000).optional(),
  url: Joi.string().uri().max(2000).optional(),
  public_id: Joi.string().trim().max(300).optional(),
}).custom((value, helpers) => {
  if (!value.photo_url && !value.url) return helpers.error("any.custom");
  return value;
}).messages({
  "any.custom": "photo_url or url is required",
});

export const preferencesSchema = Joi.object({
  language: Joi.string().trim().max(10).optional(),
  currency: Joi.string().trim().uppercase().length(3).optional(),
  theme: Joi.string().valid("light", "dark", "system").optional(),
  push_notifications: Joi.boolean().optional(),
  email_notifications: Joi.boolean().optional(),
  sms_notifications: Joi.boolean().optional(),
  order_updates: Joi.boolean().optional(),
  promotional_notifications: Joi.boolean().optional(),
  marketing_emails: Joi.boolean().optional(),
  notifications: Joi.object({
    push: Joi.boolean().optional(),
    email: Joi.boolean().optional(),
    sms: Joi.boolean().optional(),
    order_updates: Joi.boolean().optional(),
    promotions: Joi.boolean().optional(),
  }).optional(),
}).min(1);

export const notificationIdSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

export const notificationQuerySchema = Joi.object({
  read: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  per_page: Joi.number().integer().min(1).max(100).default(20),
});

export const appFeedbackSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  category: Joi.string().valid("bug", "feature_request", "complaint", "compliment", "other").optional(),
  message: Joi.string().trim().min(1).max(3000).required(),
  platform: Joi.string().valid("ios", "android", "web").optional(),
  app_version: Joi.string().trim().max(50).optional(),
});
