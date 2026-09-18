import mongoose, { Document, Schema } from "mongoose";

export type ListingPromotionStatus = "active" | "cancelled" | "expired";

export interface ListingPromotionDocument extends Document {
  seller: mongoose.Types.ObjectId;
  listing: mongoose.Types.ObjectId;
  plan: mongoose.Types.ObjectId;
  amount: number;
  startsAt: Date;
  endsAt: Date;
  status: ListingPromotionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const listingPromotionSchema = new Schema<ListingPromotionDocument>(
  {
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    listing: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    plan: { type: Schema.Types.ObjectId, ref: "PromotionPlan", required: true },
    amount: { type: Number, min: 0, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ["active", "cancelled", "expired"], default: "active", index: true },
  },
  { timestamps: true, collection: "listing_promotions" }
);

listingPromotionSchema.index({ seller: 1, listing: 1, status: 1 });

export default mongoose.model<ListingPromotionDocument>("ListingPromotion", listingPromotionSchema);
