import mongoose, { Document, Schema } from "mongoose";

export interface AppFeedbackDocument extends Document {
  user: mongoose.Types.ObjectId;
  rating?: number;
  category?: "bug" | "feature_request" | "complaint" | "compliment" | "other";
  message: string;
  platform?: "ios" | "android" | "web";
  appVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appFeedbackSchema = new Schema<AppFeedbackDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rating: { type: Number, min: 1, max: 5 },
    category: { type: String, enum: ["bug", "feature_request", "complaint", "compliment", "other"] },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    platform: { type: String, enum: ["ios", "android", "web"] },
    appVersion: { type: String, trim: true, maxlength: 50 },
  },
  { timestamps: true, collection: "app_feedback" }
);

appFeedbackSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<AppFeedbackDocument>("AppFeedback", appFeedbackSchema);
