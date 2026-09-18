import mongoose, { Document, Schema } from "mongoose";

export type WithdrawalStatus = "pending" | "processing" | "success" | "failed";

export interface WithdrawalDocument extends Document {
  seller: mongoose.Types.ObjectId;
  wallet: mongoose.Types.ObjectId;
  bankAccount: mongoose.Types.ObjectId;
  amount: number;
  fee: number;
  totalDebit: number;
  currency: string;
  status: WithdrawalStatus;
  reference: string;
  providerTransferCode?: string;
  providerResponse?: Record<string, unknown>;
  failureReason?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const withdrawalSchema = new Schema<WithdrawalDocument>(
  {
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    wallet: { type: Schema.Types.ObjectId, ref: "Wallet", required: true },
    bankAccount: { type: Schema.Types.ObjectId, ref: "SellerBankAccount", required: true },
    amount: { type: Number, min: 0, required: true },
    fee: { type: Number, min: 0, required: true },
    totalDebit: { type: Number, min: 0, required: true },
    currency: { type: String, uppercase: true, required: true },
    status: { type: String, enum: ["pending", "processing", "success", "failed"], default: "pending", index: true },
    reference: { type: String, required: true, unique: true, index: true },
    providerTransferCode: { type: String },
    providerResponse: { type: Schema.Types.Mixed },
    failureReason: { type: String, maxlength: 500 },
    processedAt: { type: Date },
  },
  { timestamps: true, collection: "withdrawals" }
);

withdrawalSchema.index({ seller: 1, createdAt: -1 });

export default mongoose.model<WithdrawalDocument>("Withdrawal", withdrawalSchema);
