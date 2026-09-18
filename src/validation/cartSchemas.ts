import Joi from "joi";

export const cartItemParamSchema = Joi.object({
  itemId: Joi.string().hex().length(24).required(),
});

export const addCartItemSchema = Joi.object({
  product_id: Joi.string().hex().length(24).required(),
  quantity: Joi.number().integer().min(1).max(1000).required(),
});

export const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).max(1000).required(),
});
