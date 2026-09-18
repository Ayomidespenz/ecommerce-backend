import mongoose, { Document, Schema } from "mongoose";

export interface RecentlyViewedDocument extends Document {
  user: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  viewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const recentlyViewedSchema = new Schema<RecentlyViewedDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    viewedAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true, collection: "recently_viewed" }
);

recentlyViewedSchema.index({ user: 1, product: 1 }, { unique: true });
recentlyViewedSchema.index({ user: 1, viewedAt: -1 });

export default mongoose.model<RecentlyViewedDocument>("RecentlyViewed", recentlyViewedSchema);
