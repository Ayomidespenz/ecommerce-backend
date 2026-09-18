import mongoose, { Document, Schema } from "mongoose";

export type ConversationStatus = "active" | "closed";

export interface ConversationDocument extends Document {
  buyer: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  product?: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId;
  status: ConversationStatus;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<ConversationDocument>(
  {
    buyer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", index: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", index: true },
    status: { type: String, enum: ["active", "closed"], default: "active", index: true },
    lastMessageAt: { type: Date, index: true },
    lastMessagePreview: { type: String, maxlength: 300 },
  },
  { timestamps: true, collection: "conversations" }
);

conversationSchema.index({ buyer: 1, seller: 1, product: 1, order: 1 });
conversationSchema.index({ buyer: 1, updatedAt: -1 });
conversationSchema.index({ seller: 1, updatedAt: -1 });

export default mongoose.model<ConversationDocument>("Conversation", conversationSchema);
