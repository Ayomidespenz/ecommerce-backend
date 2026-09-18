import mongoose, { Document, Schema } from "mongoose";

export type OtpPurpose =
  | "email_verification"
  | "phone_verification"
  | "password_reset";

export type OtpChannel = "email" | "phone";

export interface OtpVerificationDocument extends Document {
  user: mongoose.Types.ObjectId;
  purpose: OtpPurpose;
  channel: OtpChannel;
  contact: string;
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  cooldownUntil?: Date;
  consumedAt?: Date;
  createdAt: Date;
}

const otpVerificationSchema = new Schema<OtpVerificationDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ["email_verification", "phone_verification", "password_reset"],
      required: true,
    },
    channel: {
      type: String,
      enum: ["email", "phone"],
      required: true,
    },
    contact: { type: String, required: true, trim: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    expiresAt: { type: Date, required: true },
    cooldownUntil: { type: Date },
    consumedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<OtpVerificationDocument>(
  "OtpVerification",
  otpVerificationSchema
);