import mongoose, { Document, Schema } from "mongoose";

export interface WalletDocument extends Document {
  seller: mongoose.Types.ObjectId;
  currency: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<WalletDocument>(
  {
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    currency: { type: String, uppercase: true, default: "NGN" },
    availableBalance: { type: Number, min: 0, default: 0 },
    pendingBalance: { type: Number, min: 0, default: 0 },
    totalEarned: { type: Number, min: 0, default: 0 },
    totalWithdrawn: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true, collection: "wallets" }
);

export default mongoose.model<WalletDocument>("Wallet", walletSchema);
