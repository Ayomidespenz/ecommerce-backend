import Joi from "joi";

const productId = Joi.string().hex().length(24).required();

export const productParamSchema = Joi.object({
  productId,
});

export const productReferenceSchema = Joi.object({
  product_id: productId,
});

export const personalCollectionQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  per_page: Joi.number().integer().min(1).max(100).default(20),
});
