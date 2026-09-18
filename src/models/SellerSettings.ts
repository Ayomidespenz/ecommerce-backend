import mongoose, { Document, Schema } from "mongoose";

export interface SellerSettingsDocument extends Document {
  seller: mongoose.Types.ObjectId;
  storefrontName?: string;
  returnsPolicy?: string;
  shippingInformation?: string;
  notifications: {
    orderUpdates: boolean;
    payoutUpdates: boolean;
    marketing: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const sellerSettingsSchema = new Schema<SellerSettingsDocument>(
  {
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    storefrontName: { type: String, trim: true, maxlength: 150 },
    returnsPolicy: { type: String, trim: true, maxlength: 2000 },
    shippingInformation: { type: String, trim: true, maxlength: 2000 },
    notifications: {
      orderUpdates: { type: Boolean, default: true },
      payoutUpdates: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
    },
  },
  { timestamps: true, collection: "seller_settings" }
);

export default mongoose.model<SellerSettingsDocument>("SellerSettings", sellerSettingsSchema);
