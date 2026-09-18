import mongoose, { Document, Schema } from "mongoose";

export type QuoteStatus = "open" | "used" | "expired" | "cancelled";

export interface QuoteItemSnapshot {
  cartItemId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  currency: string;
}

export interface AddressSnapshot {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  landmark?: string;
}

export interface CheckoutQuoteDocument extends Document {
  user: mongoose.Types.ObjectId;
  address: mongoose.Types.ObjectId;
  addressSnapshot: AddressSnapshot;
  items: QuoteItemSnapshot[];
  promoCode?: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  serviceFee: number;
  total: number;
  currency: string;
  status: QuoteStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const snapshotAddressSchema = new Schema<AddressSnapshot>(
  {
    recipientName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String },
    country: { type: String, required: true },
    landmark: { type: String },
  },
  { _id: false }
);

const quoteItemSchema = new Schema<QuoteItemSnapshot>(
  {
    cartItemId: { type: Schema.Types.ObjectId, required: true },
    productId: { type: Schema.Types.ObjectId, required: true },
    sellerId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    sku: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
  },
  { _id: false }
);

const checkoutQuoteSchema = new Schema<CheckoutQuoteDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    address: { type: Schema.Types.ObjectId, ref: "Address", required: true },
    addressSnapshot: { type: snapshotAddressSchema, required: true },
    items: { type: [quoteItemSchema], required: true, validate: (items: unknown[]) => items.length > 0 },
    promoCode: { type: String, uppercase: true, trim: true },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0 },
    serviceFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true },
    status: { type: String, enum: ["open", "used", "expired", "cancelled"], default: "open", index: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true, collection: "checkout_quotes" }
);

checkoutQuoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
checkoutQuoteSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<CheckoutQuoteDocument>("CheckoutQuote", checkoutQuoteSchema);
