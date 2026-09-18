import mongoose, { Document, Schema } from "mongoose";

export interface MessageReadEntry {
  user: mongoose.Types.ObjectId;
  readAt: Date;
}

export interface MessageDocument extends Document {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  body: string;
  readBy: MessageReadEntry[];
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const readEntrySchema = new Schema<MessageReadEntry>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    readAt: { type: Date, required: true },
  },
  { _id: false }
);

const messageSchema = new Schema<MessageDocument>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    readBy: { type: [readEntrySchema], default: [] },
    deletedAt: { type: Date, index: true },
  },
  { timestamps: true, collection: "messages" }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });

export default mongoose.model<MessageDocument>("Message", messageSchema);
