import mongoose, { Document, Schema } from "mongoose";

export type PaymentStatus = "initialized" | "pending" | "success" | "failed" | "refunded";

export interface PaymentDocument extends Document {
  user: mongoose.Types.ObjectId;
  quote: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId;
  reference: string;
  provider: "paystack";
  amount: number;
  currency: string;
  status: PaymentStatus;
  providerTransactionId?: string;
  authorizationUrl?: string;
  accessCode?: string;
  providerResponse?: Record<string, unknown>;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<PaymentDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    quote: { type: Schema.Types.ObjectId, ref: "CheckoutQuote", required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", index: true },
    reference: { type: String, required: true, unique: true, trim: true, index: true },
    provider: { type: String, enum: ["paystack"], default: "paystack" },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true },
    status: { type: String, enum: ["initialized", "pending", "success", "failed", "refunded"], default: "initialized", index: true },
    providerTransactionId: { type: String, trim: true },
    authorizationUrl: { type: String },
    accessCode: { type: String },
    providerResponse: { type: Schema.Types.Mixed },
    paidAt: { type: Date },
  },
  { timestamps: true, collection: "payments" }
);

paymentSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<PaymentDocument>("Payment", paymentSchema);
