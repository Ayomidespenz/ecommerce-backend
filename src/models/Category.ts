import mongoose, { Document, Schema } from "mongoose";

export interface CategoryDocument extends Document {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parent?: mongoose.Types.ObjectId;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<CategoryDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    image: { type: String, trim: true },
    parent: { type: Schema.Types.ObjectId, ref: "Category", index: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: "categories" }
);

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ isActive: 1, sortOrder: 1, name: 1 });

export default mongoose.model<CategoryDocument>("Category", categorySchema);
