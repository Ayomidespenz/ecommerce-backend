import mongoose, { Document, Schema } from "mongoose";

export interface CartItemDocument extends Document {
  user: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<CartItemDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    quantity: { type: Number, required: true, min: 1, max: 1000 },
  },
  { timestamps: true, collection: "cart_items" }
);

cartItemSchema.index({ user: 1, product: 1 }, { unique: true });
cartItemSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<CartItemDocument>("CartItem", cartItemSchema);
