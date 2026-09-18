import mongoose, { Document, Schema } from "mongoose";

export interface RefreshTokenDocument extends Document {
  user: mongoose.Types.ObjectId;
  device?: mongoose.Types.ObjectId;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByToken?: string;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<RefreshTokenDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    device: {
      type: Schema.Types.ObjectId,
      ref: "Device",
      index: true,
    },
    familyId: {
      type: String,
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: { type: Date },
    replacedByToken: { type: String },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// TTL index so expired refresh tokens are cleaned up automatically.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<RefreshTokenDocument>(
  "RefreshToken",
  refreshTokenSchema
);