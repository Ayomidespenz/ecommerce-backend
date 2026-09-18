import Joi from "joi";

const objectId = Joi.string().hex().length(24).required();

export const sellerResourceParamSchema = Joi.object({ id: objectId });
export const listingPromotionParamSchema = Joi.object({ listingId: objectId });
export const sellerTransactionQuerySchema = Joi.object({
  type: Joi.string().valid("credit", "debit", "withdrawal", "refund", "promotion").optional(),
  page: Joi.number().integer().min(1).default(1),
  per_page: Joi.number().integer().min(1).max(100).default(20),
});
export const sellerWithdrawalQuerySchema = Joi.object({
  status: Joi.string().valid("pending", "processing", "success", "failed").optional(),
  page: Joi.number().integer().min(1).default(1),
  per_page: Joi.number().integer().min(1).max(100).default(20),
});

export const createBankAccountSchema = Joi.object({
  account_number: Joi.string().trim().pattern(/^[0-9]{6,20}$/).required(),
  bank_code: Joi.string().trim().max(20).required(),
  bank_name: Joi.string().trim().max(150).optional(),
  is_default: Joi.boolean().optional(),
});

export const updateBankAccountSchema = Joi.object({
  account_number: Joi.string().trim().pattern(/^[0-9]{6,20}$/).optional(),
  bank_code: Joi.string().trim().max(20).optional(),
  bank_name: Joi.string().trim().max(150).optional(),
}).custom((value, helpers) => {
  if (!value.account_number && !value.bank_code && value.bank_name === undefined) {
    return helpers.error("any.custom");
  }
  return value;
}).messages({ "any.custom": "At least one bank-account field is required" });

export const withdrawalQuoteSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  bank_account_id: Joi.string().hex().length(24).optional(),
});

export const createWithdrawalSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  bank_account_id: Joi.string().hex().length(24).optional(),
  reason: Joi.string().trim().max(200).optional(),
});

export const createPromotionSchema = Joi.object({
  plan_id: objectId,
});

export const verificationDocumentSchema = Joi.object({
  type: Joi.string().valid("government_id", "business_registration", "proof_of_address", "tax_document").required(),
  url: Joi.string().uri({ scheme: ["http", "https"] }).max(2000).required(),
  public_id: Joi.string().trim().max(300).optional(),
});

export const submitVerificationSchema = Joi.object({
  business_name: Joi.string().trim().max(200).optional(),
  business_type: Joi.string().trim().max(100).optional(),
  business_address: Joi.string().trim().max(500).optional(),
});

export const sellerSettingsSchema = Joi.object({
  storefront_name: Joi.string().trim().max(150).optional(),
  returns_policy: Joi.string().trim().max(2000).optional(),
  shipping_information: Joi.string().trim().max(2000).optional(),
  notifications: Joi.object({
    order_updates: Joi.boolean().optional(),
    payout_updates: Joi.boolean().optional(),
    marketing: Joi.boolean().optional(),
  }).optional(),
}).custom((value, helpers) => {
  if (!Object.keys(value).length) return helpers.error("any.custom");
  return value;
}).messages({ "any.custom": "At least one settings field is required" });
