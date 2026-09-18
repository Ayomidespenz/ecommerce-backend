import mongoose, { Document, Schema } from "mongoose";

export type WalletTransactionType = "credit" | "debit" | "withdrawal" | "refund" | "promotion";

export interface WalletTransactionDocument extends Document {
  seller: mongoose.Types.ObjectId;
  wallet: mongoose.Types.ObjectId;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const walletTransactionSchema = new Schema<WalletTransactionDocument>(
  {
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    wallet: { type: Schema.Types.ObjectId, ref: "Wallet", required: true, index: true },
    type: { type: String, enum: ["credit", "debit", "withdrawal", "refund", "promotion"], required: true },
    amount: { type: Number, min: 0, required: true },
    balanceBefore: { type: Number, min: 0, required: true },
    balanceAfter: { type: Number, min: 0, required: true },
    reference: { type: String, required: true, unique: true, index: true },
    description: { type: String, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: "wallet_transactions" }
);

walletTransactionSchema.index({ seller: 1, createdAt: -1 });

export default mongoose.model<WalletTransactionDocument>("WalletTransaction", walletTransactionSchema);
