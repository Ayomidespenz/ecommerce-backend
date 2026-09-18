import mongoose, { Document, Schema } from "mongoose";

export interface FavoriteDocument extends Document {
  user: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema<FavoriteDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  },
  { timestamps: true, collection: "favorites" }
);

favoriteSchema.index({ user: 1, product: 1 }, { unique: true });
favoriteSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<FavoriteDocument>("Favorite", favoriteSchema);
