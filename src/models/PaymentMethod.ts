import mongoose, { Document, Schema } from "mongoose";

export type PaymentProvider = "paystack" | "stripe" | "flutterwave" | "other";
export type PaymentMethodType = "card" | "bank" | "mobile_money" | "ussd" | "other";

export interface PaymentMethodDocument extends Document {
  user: mongoose.Types.ObjectId;
  provider: PaymentProvider;
  providerReference: string;
  methodType: PaymentMethodType;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  bankName?: string;
  accountName?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const paymentMethodSchema = new Schema<PaymentMethodDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, enum: ["paystack", "stripe", "flutterwave", "other"], default: "paystack" },
    // This is a provider token/authorization reference, never raw card data.
    providerReference: { type: String, required: true, trim: true, maxlength: 500 },
    methodType: { type: String, enum: ["card", "bank", "mobile_money", "ussd", "other"], default: "card" },
    brand: { type: String, trim: true, maxlength: 50 },
    last4: { type: String, trim: true, maxlength: 4 },
    expMonth: { type: Number, min: 1, max: 12 },
    expYear: { type: Number, min: 2000, max: 3000 },
    bankName: { type: String, trim: true, maxlength: 120 },
    accountName: { type: String, trim: true, maxlength: 120 },
    isDefault: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, collection: "payment_methods" }
);

paymentMethodSchema.index({ user: 1, provider: 1, providerReference: 1 }, { unique: true });
paymentMethodSchema.index(
  { user: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);
paymentMethodSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<PaymentMethodDocument>("PaymentMethod", paymentMethodSchema);
