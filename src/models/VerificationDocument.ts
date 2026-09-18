import mongoose, { Document, Schema } from "mongoose";

export type VerificationDocumentType = "government_id" | "business_registration" | "proof_of_address" | "tax_document";

export interface VerificationDocumentDocument extends Document {
  seller: mongoose.Types.ObjectId;
  verification: mongoose.Types.ObjectId;
  type: VerificationDocumentType;
  url: string;
  publicId?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const verificationDocumentSchema = new Schema<VerificationDocumentDocument>(
  {
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    verification: { type: Schema.Types.ObjectId, ref: "SellerVerification", required: true, index: true },
    type: { type: String, enum: ["government_id", "business_registration", "proof_of_address", "tax_document"], required: true },
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  },
  { timestamps: true, collection: "verification_documents" }
);

verificationDocumentSchema.index({ seller: 1, verification: 1, type: 1 }, { unique: true });

export default mongoose.model<VerificationDocumentDocument>("VerificationDocument", verificationDocumentSchema);
