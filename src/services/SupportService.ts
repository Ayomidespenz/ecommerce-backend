import crypto from "crypto";
import SupportTicket from "../models/SupportTicket";
import SupportTicketMessage from "../models/SupportTicketMessage";
import { ApiError } from "../utils/apiErrors";

interface TicketInput { subject: string; category: string; message: string; priority?: string; }
interface MessageInput { message: string; attachments?: Array<{ url: string; name?: string }>; }

const ticketView = (ticket: any, messages?: any[]) => ({
  id: String(ticket._id), ticket_number: ticket.ticketNumber, subject: ticket.subject, category: ticket.category,
  status: ticket.status, priority: ticket.priority, last_message_at: ticket.lastMessageAt,
  created_at: ticket.createdAt, updated_at: ticket.updatedAt,
  ...(messages ? { messages: messages.map(messageView) } : {}),
});

const messageView = (message: any) => {
  const sender = message.sender && typeof message.sender === "object" ? message.sender : undefined;
  return { id: String(message._id), ticket_id: String(message.ticket), sender: sender ? { id: String(sender._id), name: sender.name, role: sender.role } : String(message.sender), sender_role: message.senderRole, message: message.message, attachments: message.attachments || [], created_at: message.createdAt };
};

class SupportService {
  async create(userId: string, role: string, input: TicketInput) {
    const ticket = await SupportTicket.create({ user: userId, ticketNumber: "FM-" + Date.now().toString(36).toUpperCase() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase(), subject: input.subject, category: input.category, priority: input.priority, status: "open", lastMessageAt: new Date() });
    await SupportTicketMessage.create({ ticket: ticket._id, sender: userId, senderRole: role, message: input.message, attachments: [] });
    return ticketView(ticket);
  }

  async list(userId: string, query: { status?: string; page?: number; per_page?: number }) {
    const page = query.page || 1; const perPage = query.per_page || 20;
    const filter: Record<string, unknown> = { user: userId }; if (query.status) filter.status = query.status;
    const [tickets, total] = await Promise.all([SupportTicket.find(filter).sort({ lastMessageAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean(), SupportTicket.countDocuments(filter)]);
    return { tickets: tickets.map((ticket) => ticketView(ticket)), pagination: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) } };
  }

  async get(userId: string, id: string) {
    const ticket = await SupportTicket.findOne({ _id: id, user: userId });
    if (!ticket) throw new ApiError(404, "Support ticket not found", "SUPPORT_TICKET_NOT_FOUND");
    const messages = await SupportTicketMessage.find({ ticket: ticket._id }).populate("sender", "name role").sort({ createdAt: 1 }).lean();
    return ticketView(ticket, messages);
  }

  async addMessage(userId: string, id: string, role: string, input: MessageInput) {
    const ticket = await SupportTicket.findOne({ _id: id, user: userId });
    if (!ticket) throw new ApiError(404, "Support ticket not found", "SUPPORT_TICKET_NOT_FOUND");
    if (ticket.status === "closed") throw new ApiError(409, "Closed support tickets cannot receive new messages", "SUPPORT_TICKET_CLOSED");
    const message = await SupportTicketMessage.create({ ticket: ticket._id, sender: userId, senderRole: role, message: input.message, attachments: input.attachments || [] });
    ticket.lastMessageAt = new Date(); if (ticket.status === "resolved") ticket.status = "open"; await ticket.save();
    return messageView(message);
  }
}

export default new SupportService();
