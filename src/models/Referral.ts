import mongoose, { Document, Schema } from "mongoose";

export type ReferralStatus = "pending" | "completed" | "rewarded";

export interface ReferralDocument extends Document {
  referrer: mongoose.Types.ObjectId;
  referredUser: mongoose.Types.ObjectId;
  code: string;
  status: ReferralStatus;
  rewardAmount: number;
  rewardCurrency: string;
  appliedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const referralSchema = new Schema<ReferralDocument>(
  {
    referrer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    referredUser: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true, index: true },
    status: { type: String, enum: ["pending", "completed", "rewarded"], default: "pending", index: true },
    rewardAmount: { type: Number, min: 0, default: 0 },
    rewardCurrency: { type: String, uppercase: true, default: "NGN" },
    appliedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true, collection: "referrals" }
);

referralSchema.index({ referrer: 1, createdAt: -1 });
referralSchema.index({ referrer: 1, referredUser: 1 }, { unique: true });

export default mongoose.model<ReferralDocument>("Referral", referralSchema);
