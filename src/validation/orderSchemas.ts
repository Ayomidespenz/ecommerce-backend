import Joi from "joi";

const objectId = Joi.string().hex().length(24).required();

export const orderParamSchema = Joi.object({ id: objectId });
export const paymentReferenceParamSchema = Joi.object({ reference: Joi.string().trim().max(150).required() });

export const checkoutQuoteSchema = Joi.object({
  address_id: objectId,
  promo_code: Joi.string().trim().max(50).optional(),
  shipping_method: Joi.string().trim().max(50).optional(),
});

export const promoCodeValidationSchema = Joi.object({
  code: Joi.string().trim().max(50).required(),
  address_id: Joi.string().hex().length(24).optional(),
});

export const paymentInitializeSchema = Joi.object({
  quote_id: objectId,
  email: Joi.string().email().lowercase().trim().optional(),
  payment_method_id: Joi.string().hex().length(24).optional(),
});

export const createOrderSchema = Joi.object({
  quote_id: objectId,
  payment_reference: Joi.string().trim().max(150).optional(),
  reference: Joi.string().trim().max(150).optional(),
}).custom((value, helpers) => {
  if (!value.payment_reference && !value.reference) return helpers.error("any.custom");
  return value;
}).messages({
  "any.custom": "payment_reference or reference is required",
});

export const orderListQuerySchema = Joi.object({
  status: Joi.string().valid("pending", "confirmed", "processing", "shipped", "delivered", "completed", "cancelled", "returned", "refunded").optional(),
  page: Joi.number().integer().min(1).default(1),
  per_page: Joi.number().integer().min(1).max(100).default(20),
});

export const cancelOrderSchema = Joi.object({
  reason: Joi.string().trim().max(500).optional(),
});

export const returnOrderSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500).required(),
  items: Joi.array().items(Joi.object({
    product_id: objectId,
    quantity: Joi.number().integer().min(1).required(),
  })).max(100).optional(),
});

export const refundOrderSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500).required(),
});


export const sellerOrderListQuerySchema = Joi.object({
  status: Joi.string().valid("confirmed", "processing", "shipped", "delivered", "cancelled").optional(),
  page: Joi.number().integer().min(1).default(1),
  per_page: Joi.number().integer().min(1).max(100).default(20),
});

export const sellerOrderStatusSchema = Joi.object({
  status: Joi.string().valid("processing", "shipped", "delivered").required(),
  note: Joi.string().trim().max(500).optional(),
});