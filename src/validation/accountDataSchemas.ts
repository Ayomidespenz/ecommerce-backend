import Joi from "joi";

const addressId = Joi.string().hex().length(24).required();
const paymentMethodId = Joi.string().hex().length(24).required();

export const addressParamSchema = Joi.object({ id: addressId });
export const paymentMethodParamSchema = Joi.object({ id: paymentMethodId });

const addressFields = {
  recipient_name: Joi.string().trim().max(120),
  full_name: Joi.string().trim().max(120),
  name: Joi.string().trim().max(120),
  phone: Joi.string().trim().min(6).max(30),
  address_line1: Joi.string().trim().max(250),
  address_line_1: Joi.string().trim().max(250),
  address: Joi.string().trim().max(250),
  address_line2: Joi.string().trim().max(250),
  address_line_2: Joi.string().trim().max(250),
  city: Joi.string().trim().max(100),
  state: Joi.string().trim().max(100),
  postal_code: Joi.string().trim().max(30),
  zip_code: Joi.string().trim().max(30),
  country: Joi.string().trim().max(100),
  landmark: Joi.string().trim().max(250),
  address_type: Joi.string().valid("home", "work", "other"),
  type: Joi.string().valid("home", "work", "other"),
  is_default: Joi.boolean(),
};

export const createAddressSchema = Joi.object(addressFields).custom((value, helpers) => {
  if (!(value.recipient_name || value.full_name || value.name)) return helpers.error("any.custom");
  if (!(value.address_line1 || value.address_line_1 || value.address)) return helpers.error("any.custom");
  for (const field of ["phone", "city", "state"]) {
    if (!value[field]) return helpers.error("any.custom");
  }
  return value;
}).messages({
  "any.custom": "recipient name, phone, address, city, and state are required",
});

export const updateAddressSchema = Joi.object(addressFields).min(1);

const rawCardFields = {
  card_number: Joi.any().forbidden(),
  cardNumber: Joi.any().forbidden(),
  number: Joi.any().forbidden(),
  cvv: Joi.any().forbidden(),
  cvc: Joi.any().forbidden(),
  security_code: Joi.any().forbidden(),
  securityCode: Joi.any().forbidden(),
  expiry: Joi.any().forbidden(),
  card: Joi.any().forbidden(),
};

const paymentMethodFields = {
  provider: Joi.string().valid("paystack", "stripe", "flutterwave", "other").default("paystack"),
  provider_reference: Joi.string().trim().max(500),
  tokenized_reference: Joi.string().trim().max(500),
  authorization_code: Joi.string().trim().max(500),
  token: Joi.string().trim().max(500),
  method_type: Joi.string().valid("card", "bank", "mobile_money", "ussd", "other"),
  type: Joi.string().valid("card", "bank", "mobile_money", "ussd", "other"),
  brand: Joi.string().trim().max(50),
  last4: Joi.string().trim().pattern(/^\d{4}$/),
  exp_month: Joi.number().integer().min(1).max(12),
  exp_year: Joi.number().integer().min(2000).max(3000),
  bank_name: Joi.string().trim().max(120),
  account_name: Joi.string().trim().max(120),
  is_default: Joi.boolean(),
  ...rawCardFields,
};

function hasToken(value: Record<string, unknown>): boolean {
  return Boolean(value.provider_reference || value.tokenized_reference || value.authorization_code || value.token);
}

export const createPaymentMethodSchema = Joi.object(paymentMethodFields).custom((value, helpers) => {
  if (!hasToken(value)) return helpers.error("any.custom");
  return value;
}).messages({
  "any.custom": "A tokenized provider reference is required; raw card data is not accepted",
});

export const updatePaymentMethodSchema = Joi.object({
  ...paymentMethodFields,
  provider: Joi.string().valid("paystack", "stripe", "flutterwave", "other").optional(),
}).min(1);
