import Joi from "joi";

const objectId = Joi.string().hex().length(24).required();

export const sellerListingParamSchema = Joi.object({ id: objectId });
export const sellerListingImageParamSchema = Joi.object({ id: objectId, imageId: objectId });

export const sellerListingQuerySchema = Joi.object({
  q: Joi.string().trim().max(100),
  status: Joi.string().valid("draft", "published", "paused", "archived"),
  page: Joi.number().integer().min(1).default(1),
  per_page: Joi.number().integer().min(1).max(100).default(20),
});

const listingFields = {
  category_id: objectId,
  category: Joi.string().hex().length(24),
  name: Joi.string().trim().min(2).max(200),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(240),
  description: Joi.string().trim().min(1).max(10000),
  brand: Joi.string().trim().max(100),
  sku: Joi.string().trim().max(100),
  product_type: Joi.string().trim().lowercase().max(50),
  productType: Joi.string().trim().lowercase().max(50),
  tags: Joi.alternatives().try(Joi.array().items(Joi.string().trim().max(50)).max(30), Joi.string().max(1000)),
  price: Joi.number().min(0),
  original_price: Joi.number().min(0),
  originalPrice: Joi.number().min(0),
  currency: Joi.string().trim().uppercase().length(3),
  stock: Joi.number().integer().min(0),
  availability: Joi.string().valid("in_stock", "out_of_stock", "preorder", "discontinued"),
};

export const createSellerListingSchema = Joi.object(listingFields).custom((value, helpers) => {
  if (!value.category_id && !value.category) return helpers.error("any.custom");
  for (const field of ["name", "description", "price", "stock"]) if (value[field] === undefined) return helpers.error("any.custom");
  return value;
}).messages({ "any.custom": "category, name, description, price, and stock are required" });

export const updateSellerListingSchema = Joi.object(listingFields).min(1);

export const listingImageSchema = Joi.object({
  url: Joi.string().uri({ allowRelative: false }),
  public_id: Joi.string().trim().max(500),
  storage_key: Joi.string().trim().max(500),
  alt: Joi.string().trim().max(200),
  sort_order: Joi.number().integer().min(0).max(1000).default(0),
  is_primary: Joi.boolean().default(false),
});

export const uploadMetadataSchema = Joi.object({
  url: Joi.string().uri({ allowRelative: false }),
  folder: Joi.string().trim().max(120),
}).unknown(false);

export const sellerDashboardQuerySchema = Joi.object({
  range: Joi.string().valid("7d", "30d", "90d").default("7d"),
});

export const listingAnalyticsQuerySchema = Joi.object({
  range: Joi.string().valid("7d", "30d", "90d").default("30d"),
});
