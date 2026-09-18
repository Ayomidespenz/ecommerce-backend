import mongoose, { Document, Schema } from "mongoose";

export interface SellerBankAccountDocument extends Document {
  seller: mongoose.Types.ObjectId;
  bankCode: string;
  bankName?: string;
  accountNumberEncrypted: string;
  accountNumberLast4: string;
  accountName?: string;
  recipientCode?: string;
  isVerified: boolean;
  isDefault: boolean;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sellerBankAccountSchema = new Schema<SellerBankAccountDocument>(
  {
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bankCode: { type: String, required: true, trim: true },
    bankName: { type: String, trim: true },
    accountNumberEncrypted: { type: String, required: true, select: false },
    accountNumberLast4: { type: String, required: true },
    accountName: { type: String, trim: true },
    recipientCode: { type: String, trim: true },
    isVerified: { type: Boolean, default: false, index: true },
    isDefault: { type: Boolean, default: false, index: true },
    verifiedAt: { type: Date },
  },
  { timestamps: true, collection: "seller_bank_accounts" }
);

sellerBankAccountSchema.index({ seller: 1, accountNumberLast4: 1, bankCode: 1 });

export default mongoose.model<SellerBankAccountDocument>("SellerBankAccount", sellerBankAccountSchema);
