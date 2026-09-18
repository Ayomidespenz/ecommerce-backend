import mongoose, { Document, Schema } from "mongoose";

export type SellerVerificationStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected";

export interface SellerVerificationDocument extends Document {
  seller: mongoose.Types.ObjectId;
  status: SellerVerificationStatus;
  businessName?: string;
  businessType?: string;
  businessAddress?: string;
  rejectionReason?: string;
  submittedAt?: Date;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sellerVerificationSchema = new Schema<SellerVerificationDocument>(
  {
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    status: { type: String, enum: ["draft", "submitted", "under_review", "approved", "rejected"], default: "draft", index: true },
    businessName: { type: String, trim: true, maxlength: 200 },
    businessType: { type: String, trim: true, maxlength: 100 },
    businessAddress: { type: String, trim: true, maxlength: 500 },
    rejectionReason: { type: String, maxlength: 500 },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
  },
  { timestamps: true, collection: "seller_verifications" }
);

export default mongoose.model<SellerVerificationDocument>("SellerVerification", sellerVerificationSchema);
