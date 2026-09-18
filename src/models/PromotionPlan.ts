import mongoose, { Document, Schema } from "mongoose";

export interface PromotionPlanDocument extends Document {
  code: string;
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  isActive: boolean;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

const promotionPlanSchema = new Schema<PromotionPlanDocument>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, maxlength: 500 },
    price: { type: Number, min: 0, required: true },
    durationDays: { type: Number, min: 1, required: true },
    isActive: { type: Boolean, default: true, index: true },
    features: { type: [String], default: [] },
  },
  { timestamps: true, collection: "promotion_plans" }
);

export default mongoose.model<PromotionPlanDocument>("PromotionPlan", promotionPlanSchema);
