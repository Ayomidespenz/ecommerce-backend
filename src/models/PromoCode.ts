import mongoose, { Document, Schema } from "mongoose";

export type PromoDiscountType = "percentage" | "fixed";

export interface PromoCodeDocument extends Document {
  code: string;
  description?: string;
  discountType: PromoDiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  startsAt?: Date;
  expiresAt?: Date;
  usageLimit?: number;
  usedCount: number;
  perUserLimit?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const promoCodeSchema = new Schema<PromoCodeDocument>(
  {
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 50 },
    description: { type: String, trim: true, maxlength: 250 },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, min: 0, default: 0 },
    maxDiscount: { type: Number, min: 0 },
    startsAt: { type: Date },
    expiresAt: { type: Date },
    usageLimit: { type: Number, min: 1 },
    usedCount: { type: Number, min: 0, default: 0 },
    perUserLimit: { type: Number, min: 1 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: "promo_codes" }
);

promoCodeSchema.index({ code: 1 }, { unique: true });

export default mongoose.model<PromoCodeDocument>("PromoCode", promoCodeSchema);
