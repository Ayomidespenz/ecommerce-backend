import mongoose, { Document, Schema } from "mongoose";

export interface UserPreferences {
  language: string;
  currency: string;
  theme: "light" | "dark" | "system";
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  orderUpdates: boolean;
  promotionalNotifications: boolean;
  marketingEmails: boolean;
}

export interface UserProfileDocument extends Document {
  user: mongoose.Types.ObjectId;
  bio?: string;
  gender?: "male" | "female" | "non_binary" | "prefer_not_to_say";
  dateOfBirth?: Date;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const preferencesSchema = new Schema<UserPreferences>(
  {
    language: { type: String, default: "en" },
    currency: { type: String, default: "NGN", uppercase: true },
    theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
    pushNotifications: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: true },
    orderUpdates: { type: Boolean, default: true },
    promotionalNotifications: { type: Boolean, default: true },
    marketingEmails: { type: Boolean, default: false },
  },
  { _id: false }
);

const userProfileSchema = new Schema<UserProfileDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    bio: { type: String, trim: true, maxlength: 1000 },
    gender: { type: String, enum: ["male", "female", "non_binary", "prefer_not_to_say"] },
    dateOfBirth: { type: Date },
    preferences: { type: preferencesSchema, default: () => ({}) },
  },
  { timestamps: true, collection: "user_profiles" }
);

export default mongoose.model<UserProfileDocument>("UserProfile", userProfileSchema);
