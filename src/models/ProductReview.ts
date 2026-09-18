import mongoose, { Document, Schema } from "mongoose";

export type ProductReviewStatus = "approved" | "pending" | "rejected";

export interface ProductReviewDocument extends Document {
  product: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  rating: number;
  title?: string;
  comment: string;
  images: string[];
  status: ProductReviewStatus;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const productReviewSchema = new Schema<ProductReviewDocument>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 200 },
    comment: { type: String, required: true, trim: true, maxlength: 2000 },
    images: { type: [String], default: [] },
    status: { type: String, enum: ["approved", "pending", "rejected"], default: "approved", index: true },
    helpfulCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true, collection: "product_reviews" }
);

productReviewSchema.index({ product: 1, user: 1 }, { unique: true });
productReviewSchema.index({ product: 1, status: 1, createdAt: -1 });

export default mongoose.model<ProductReviewDocument>("ProductReview", productReviewSchema);
