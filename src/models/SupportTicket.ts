import mongoose, { Document, Schema } from "mongoose";

export type SupportTicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type SupportTicketPriority = "low" | "normal" | "high" | "urgent";

export interface SupportTicketDocument extends Document {
  user: mongoose.Types.ObjectId;
  ticketNumber: string;
  subject: string;
  category: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  lastMessageAt: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const supportTicketSchema = new Schema<SupportTicketDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ticketNumber: { type: String, required: true, unique: true, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
    status: { type: String, enum: ["open", "in_progress", "resolved", "closed"], default: "open", index: true },
    priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    closedAt: { type: Date },
  },
  { timestamps: true, collection: "support_tickets" }
);

supportTicketSchema.index({ user: 1, createdAt: -1 });
supportTicketSchema.index({ user: 1, status: 1, createdAt: -1 });

export default mongoose.model<SupportTicketDocument>("SupportTicket", supportTicketSchema);
