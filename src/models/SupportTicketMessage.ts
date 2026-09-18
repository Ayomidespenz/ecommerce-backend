import mongoose, { Document, Schema } from "mongoose";
import { UserRole } from "./User";

export interface SupportTicketMessageDocument extends Document {
  ticket: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  senderRole: UserRole;
  message: string;
  attachments: Array<{ url: string; name?: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<{ url: string; name?: string }>(
  {
    url: { type: String, required: true, trim: true },
    name: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false }
);

const supportTicketMessageSchema = new Schema<SupportTicketMessageDocument>(
  {
    ticket: { type: Schema.Types.ObjectId, ref: "SupportTicket", required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    senderRole: { type: String, enum: ["buyer", "seller", "admin"], required: true },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    attachments: { type: [attachmentSchema], default: [] },
  },
  { timestamps: true, collection: "support_ticket_messages" }
);

supportTicketMessageSchema.index({ ticket: 1, createdAt: 1 });

export default mongoose.model<SupportTicketMessageDocument>("SupportTicketMessage", supportTicketMessageSchema);
