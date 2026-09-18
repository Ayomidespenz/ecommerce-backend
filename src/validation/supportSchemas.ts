import Joi from "joi";

const objectId = Joi.string().hex().length(24).required();

export const faqQuerySchema = Joi.object({
  category: Joi.string().trim().max(80),
});

const supportCategories = ["account", "orders", "payments", "delivery", "products", "seller", "technical", "other"];

export const supportTicketParamSchema = Joi.object({ id: objectId });

export const supportTicketQuerySchema = Joi.object({
  status: Joi.string().valid("open", "in_progress", "resolved", "closed"),
  page: Joi.number().integer().min(1).default(1),
  per_page: Joi.number().integer().min(1).max(100).default(20),
});

export const referralQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  per_page: Joi.number().integer().min(1).max(100).default(20),
});

export const createSupportTicketSchema = Joi.object({
  subject: Joi.string().trim().min(3).max(200).required(),
  category: Joi.string().trim().lowercase().valid(...supportCategories).required(),
  message: Joi.string().trim().min(1).max(5000).required(),
  priority: Joi.string().valid("low", "normal", "high", "urgent").default("normal"),
});

export const supportTicketMessageSchema = Joi.object({
  message: Joi.string().trim().min(1).max(5000).required(),
  attachments: Joi.array().items(
    Joi.object({
      url: Joi.string().uri({ allowRelative: false }).required(),
      name: Joi.string().trim().max(200),
    })
  ).max(10).default([]),
});

export const referralApplySchema = Joi.object({
  code: Joi.string().trim().uppercase().pattern(/^[A-Z0-9-]{4,40}$/).required(),
});
