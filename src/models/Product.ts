import mongoose, { Document, Schema } from "mongoose";

export type ProductStatus = "draft" | "published" | "paused" | "archived";
export type ProductAvailability = "in_stock" | "out_of_stock" | "preorder" | "discontinued";

export interface ProductDocument extends Document {
  seller: mongoose.Types.ObjectId;
  category: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  brand?: string;
  sku?: string;
  productType: string;
  tags: string[];
  price: number;
  originalPrice?: number;
  currency: string;
  stock: number;
  availability: ProductAvailability;
  status: ProductStatus;
  isActive: boolean;
  isFeatured: boolean;
  isFlashSale: boolean;
  flashSalePrice?: number;
  flashSaleStartsAt?: Date;
  flashSaleEndsAt?: Date;
  isExclusiveOffer: boolean;
  ratingAverage: number;
  ratingCount: number;
  soldCount: number;
  viewCount: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<ProductDocument>(
  {
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 240 },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    brand: { type: String, trim: true, maxlength: 100, index: true },
    sku: { type: String, trim: true, maxlength: 100 },
    productType: { type: String, required: true, trim: true, lowercase: true, default: "physical", index: true },
    tags: { type: [String], default: [] },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 },
    currency: { type: String, default: "NGN", uppercase: true, trim: true, maxlength: 3 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    availability: {
      type: String,
      enum: ["in_stock", "out_of_stock", "preorder", "discontinued"],
      default: "in_stock",
      index: true,
    },
    status: { type: String, enum: ["draft", "published", "paused", "archived"], default: "draft", index: true },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isFlashSale: { type: Boolean, default: false, index: true },
    flashSalePrice: { type: Number, min: 0 },
    flashSaleStartsAt: { type: Date },
    flashSaleEndsAt: { type: Date },
    isExclusiveOffer: { type: Boolean, default: false, index: true },
    ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
    ratingCount: { type: Number, min: 0, default: 0 },
    soldCount: { type: Number, min: 0, default: 0, index: true },
    viewCount: { type: Number, min: 0, default: 0 },
    publishedAt: { type: Date, index: true },
  },
  { timestamps: true, collection: "products" }
);

productSchema.index({ status: 1, isActive: 1, createdAt: -1 });
productSchema.index({ category: 1, status: 1, isActive: 1 });
productSchema.index({ name: "text", description: "text", brand: "text", tags: "text" });
productSchema.index({ seller: 1, slug: 1 }, { unique: true });

export default mongoose.model<ProductDocument>("Product", productSchema);
