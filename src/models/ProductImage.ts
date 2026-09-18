import mongoose, { Document, Schema } from "mongoose";

export interface ProductImageDocument extends Document {
  product: mongoose.Types.ObjectId;
  url: string;
  publicId?: string;
  storageKey?: string;
  alt?: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productImageSchema = new Schema<ProductImageDocument>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true },
    storageKey: { type: String, trim: true },
    alt: { type: String, trim: true, maxlength: 200 },
    sortOrder: { type: Number, default: 0 },
    isPrimary: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "product_images" }
);

productImageSchema.index({ product: 1, sortOrder: 1 });

export default mongoose.model<ProductImageDocument>("ProductImage", productImageSchema);
