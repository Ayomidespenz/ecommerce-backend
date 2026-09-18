import Joi from "joi";

const objectId = Joi.string().hex().length(24).required();
const withAtLeastOne = (schema: Joi.ObjectSchema) => schema.custom((value, helpers) => {
  if (!Object.keys(value || {}).length) return helpers.error("object.min");
  return value;
}).messages({ "object.min": "At least one field must be provided" });

export const adminResourceParamSchema = Joi.object({ id: objectId });

export const adminListingReviewSchema = withAtLeastOne(Joi.object({
  status: Joi.string().valid("pending", "approved", "rejected", "draft", "published", "paused", "archived"),
  review_status: Joi.string().valid("pending", "approved", "rejected"),
  listing_status: Joi.string().valid("draft", "published", "paused", "archived"),
  reason: Joi.string().trim().max(500),
  is_active: Joi.boolean(),
}));

export const adminVerificationUpdateSchema = withAtLeastOne(Joi.object({
  status: Joi.string().valid("draft", "submitted", "under_review", "approved", "rejected"),
  rejection_reason: Joi.string().trim().max(500),
}));

export const adminOrderUpdateSchema = withAtLeastOne(Joi.object({
  status: Joi.string().valid("pending", "confirmed", "processing", "shipped", "delivered", "completed", "cancelled", "returned", "refunded"),
  payment_status: Joi.string().valid("unpaid", "paid", "failed", "refunded"),
  note: Joi.string().trim().max(500),
  tracking_number: Joi.string().trim().max(120),
  carrier: Joi.string().trim().max(120),
  estimated_delivery: Joi.date().iso(),
  cancellation_reason: Joi.string().trim().max(500),
  return_reason: Joi.string().trim().max(500),
  refund_reason: Joi.string().trim().max(500),
}));

export const adminRefundUpdateSchema = withAtLeastOne(Joi.object({
  status: Joi.string().valid("requested", "approved", "processing", "processed", "rejected", "failed"),
  reason: Joi.string().trim().max(500),
}));

export const adminSupportTicketUpdateSchema = withAtLeastOne(Joi.object({
  status: Joi.string().valid("open", "in_progress", "resolved", "closed"),
  priority: Joi.string().valid("low", "normal", "high", "urgent"),
  message: Joi.string().trim().min(1).max(5000),
}));

export const adminPayoutQuerySchema = Joi.object({
  status: Joi.string().valid("pending", "processing", "success", "failed"),
  seller_id: Joi.string().hex().length(24),
  page: Joi.number().integer().min(1).default(1),
  per_page: Joi.number().integer().min(1).max(100).default(20),
});
