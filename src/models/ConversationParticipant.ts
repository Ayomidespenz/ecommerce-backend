import mongoose, { Document, Schema } from "mongoose";

export type ConversationParticipantRole = "buyer" | "seller";

export interface ConversationParticipantDocument extends Document {
  conversation: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  role: ConversationParticipantRole;
  lastReadAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const participantSchema = new Schema<ConversationParticipantDocument>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["buyer", "seller"], required: true },
    lastReadAt: { type: Date },
  },
  { timestamps: true, collection: "conversation_participants" }
);

participantSchema.index({ conversation: 1, user: 1 }, { unique: true });
participantSchema.index({ user: 1, updatedAt: -1 });

export default mongoose.model<ConversationParticipantDocument>(
  "ConversationParticipant",
  participantSchema
);
