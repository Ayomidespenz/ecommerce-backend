import Joi from "joi";

const objectId = Joi.string().hex().length(24).required();

export const productIdSchema = Joi.object({
  id: objectId,
});

export const catalogQuerySchema = Joi.object({
  q: Joi.string().trim().max(100).optional(),
  category_id: Joi.string().hex().length(24).optional(),
  brand: Joi.string().trim().max(100).optional(),
  price_min: Joi.number().min(0).optional(),
  price_max: Joi.number().min(Joi.ref("price_min")).optional(),
  product_type: Joi.string().trim().max(50).optional(),
  availability: Joi.string().valid("in_stock", "out_of_stock", "preorder", "discontinued").optional(),
  sort: Joi.string().valid("created_at", "newest", "price", "rating", "sold_count", "name").default("created_at"),
  direction: Joi.string().valid("asc", "desc").default("desc"),
  page: Joi.number().integer().min(1).default(1),
  per_page: Joi.number().integer().min(1).max(100).default(20),
});

export const reviewQuerySchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  page: Joi.number().integer().min(1).default(1),
  per_page: Joi.number().integer().min(1).max(100).default(20),
});

export const createReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().trim().max(200).optional(),
  comment: Joi.string().trim().min(1).max(2000).optional(),
  body: Joi.string().trim().min(1).max(2000).optional(),
  review: Joi.string().trim().min(1).max(2000).optional(),
  images: Joi.array().items(Joi.string().uri().max(2000)).max(5).default([]),
}).custom((value, helpers) => {
  if (!value.comment && !value.body && !value.review) {
    return helpers.error("any.custom");
  }
  return value;
}).messages({
  "any.custom": "comment, body, or review is required",
});

export const searchSuggestionSchema = Joi.object({
  q: Joi.string().trim().min(1).max(100).required(),
});
