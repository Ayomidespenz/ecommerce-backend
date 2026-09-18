import mongoose, { Document, Schema } from "mongoose";

export interface NotificationDocument extends Document {
  user: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true, trim: true, maxlength: 80 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    data: { type: Schema.Types.Mixed },
    readAt: { type: Date, index: true },
  },
  { timestamps: true, collection: "notifications" }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, readAt: 1 });

export default mongoose.model<NotificationDocument>("Notification", notificationSchema);
