import Joi from "joi";

const objectId = Joi.string().hex().length(24).required();

export const conversationParamSchema = Joi.object({
  id: objectId,
});

export const conversationMessageParamSchema = Joi.object({
  id: objectId,
  messageId: objectId,
});

export const conversationListQuerySchema = Joi.object({
  status: Joi.string().valid("active", "closed").optional(),
  page: Joi.number().integer().min(1).default(1),
  per_page: Joi.number().integer().min(1).max(100).default(20),
});

export const createConversationSchema = Joi.object({
  buyer_id: Joi.string().hex().length(24).optional(),
  seller_id: Joi.string().hex().length(24).optional(),
  product_id: Joi.string().hex().length(24).optional(),
  order_id: Joi.string().hex().length(24).optional(),
  initial_message: Joi.string().trim().min(1).max(5000).optional(),
}).custom((value, helpers) => {
  if (!value.buyer_id && !value.seller_id) {
    return helpers.error("any.custom");
  }
  return value;
}).messages({
  "any.custom": "buyer_id or seller_id is required",
});

export const updateConversationSchema = Joi.object({
  status: Joi.string().valid("active", "closed").required(),
});

export const createMessageSchema = Joi.object({
  body: Joi.string().trim().min(1).max(5000).required(),
});

export const updateMessageSchema = Joi.object({
  body: Joi.string().trim().min(1).max(5000).required(),
});

export const conversationReadSchema = Joi.object({
  message_id: Joi.string().hex().length(24).optional(),
});


export const messageParamSchema = Joi.object({
  messageId: objectId,
});

export const messageListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  per_page: Joi.number().integer().min(1).max(100).default(50),
});
