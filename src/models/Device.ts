import mongoose, { Document, Schema } from "mongoose";

export type DevicePlatform = "ios" | "android" | "web";

export interface PendingBiometricChallenge {
  challengeId: string;
  nonce: string;
  expiresAt: Date;
}

export interface DeviceDocument extends Document {
  user: mongoose.Types.ObjectId;
  deviceId: string;
  name?: string;
  platform?: DevicePlatform;
  deviceModel?: string;
  appVersion?: string;
  pushToken?: string;
  publicKey?: string; // PEM public key used for biometric challenge verification
  lastActiveAt?: Date;
  lastIp?: string;
  lastUserAgent?: string;
  isActive: boolean;
  pendingBiometricChallenge?: PendingBiometricChallenge;
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<DeviceDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      trim: true,
    },
    name: { type: String },
    platform: {
      type: String,
      enum: ["ios", "android", "web"],
    },
    deviceModel: { type: String },
    appVersion: { type: String },
    pushToken: { type: String },
    publicKey: { type: String },
    lastActiveAt: { type: Date },
    lastIp: { type: String },
    lastUserAgent: { type: String },
    isActive: { type: Boolean, default: true },
    pendingBiometricChallenge: {
      challengeId: { type: String },
      nonce: { type: String },
      expiresAt: { type: Date },
    },
  },
  { timestamps: true }
);

deviceSchema.index({ user: 1, deviceId: 1 }, { unique: true });
// Biometric challenge/verify identify a device without a user id, so the
// installation identifier must be globally unambiguous.
deviceSchema.index({ deviceId: 1 }, { unique: true });

export default mongoose.model<DeviceDocument>("Device", deviceSchema);
