import mongoose, { Document, Schema } from "mongoose";

export type AddressType = "home" | "work" | "other";

export interface AddressDocument extends Document {
  user: mongoose.Types.ObjectId;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  landmark?: string;
  addressType: AddressType;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<AddressDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    recipientName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    addressLine1: { type: String, required: true, trim: true, maxlength: 250 },
    addressLine2: { type: String, trim: true, maxlength: 250 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, trim: true, maxlength: 30 },
    country: { type: String, required: true, trim: true, maxlength: 100, default: "Nigeria" },
    landmark: { type: String, trim: true, maxlength: 250 },
    addressType: { type: String, enum: ["home", "work", "other"], default: "home" },
    isDefault: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, collection: "addresses" }
);

addressSchema.index(
  { user: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);
addressSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<AddressDocument>("Address", addressSchema);
