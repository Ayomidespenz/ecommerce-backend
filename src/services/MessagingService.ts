import mongoose from "mongoose";
import Conversation, { ConversationStatus } from "../models/Conversation";
import ConversationParticipant, { ConversationParticipantRole } from "../models/ConversationParticipant";
import Message from "../models/Message";
import User, { UserRole } from "../models/User";
import Product from "../models/Product";
import Order from "../models/Order";
import OrderItem from "../models/OrderItem";
import { ApiError } from "../utils/apiErrors";

type ParticipantRole = "buyer" | "seller";

function id(value: unknown): string {
  return String((value as { _id?: unknown })?._id || value);
}

function userView(user: any): Record<string, unknown> | undefined {
  if (!user) return undefined;
  return {
    id: id(user),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
  };
}

function messageView(message: any): Record<string, unknown> {
  const deleted = Boolean(message.deletedAt);
  return {
    id: id(message),
    conversation_id: id(message.conversation),
    sender: userView(message.sender) || { id: id(message.sender) },
    body: deleted ? null : message.body,
    is_deleted: deleted,
    read_by: (message.readBy || []).map((entry: any) => ({
      user_id: id(entry.user),
      read_at: entry.readAt,
    })),
    created_at: message.createdAt,
    updated_at: message.updatedAt,
  };
}

class MessagingService {
  private async requireParticipant(conversationId: string, userId: string) {
    const participant = await ConversationParticipant.findOne({
      conversation: conversationId,
      user: userId,
    });
    if (!participant) {
      throw new ApiError(403, "You are not a participant in this conversation", "FORBIDDEN");
    }
    return participant;
  }

  private async getConversation(conversationId: string, userId: string) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new ApiError(404, "Conversation not found", "CONVERSATION_NOT_FOUND");
    await this.requireParticipant(conversationId, userId);
    return conversation;
  }

  private async serializeConversation(conversation: any, userId: string) {
    const participants = await ConversationParticipant.find({ conversation: conversation._id })
      .populate("user", "name email avatar role")
      .lean();
    const current = participants.find((participant: any) => id(participant.user) === userId);
    const unreadFilter: Record<string, unknown> = {
      conversation: conversation._id,
      sender: { $ne: userId },
      deletedAt: { $exists: false },
    };
    if (current?.lastReadAt) unreadFilter.createdAt = { $gt: current.lastReadAt };
    const unreadCount = await Message.countDocuments(unreadFilter);
    const buyer = participants.find((participant: any) => participant.role === "buyer");
    const seller = participants.find((participant: any) => participant.role === "seller");

    return {
      id: id(conversation),
      buyer: userView(buyer?.user),
      seller: userView(seller?.user),
      product_id: conversation.product ? id(conversation.product) : undefined,
      order_id: conversation.order ? id(conversation.order) : undefined,
      status: conversation.status,
      last_message_at: conversation.lastMessageAt,
      last_message_preview: conversation.lastMessagePreview,
      unread_count: unreadCount,
      created_at: conversation.createdAt,
      updated_at: conversation.updatedAt,
    };
  }

  async create(
    userId: string,
    role: UserRole,
    input: {
      buyer_id?: string;
      seller_id?: string;
      product_id?: string;
      order_id?: string;
      initial_message?: string;
    }
  ) {
    if (role !== "buyer" && role !== "seller") {
      throw new ApiError(403, "Only buyers and sellers can use marketplace messaging", "FORBIDDEN");
    }

    let buyerId = role === "buyer" ? userId : input.buyer_id;
    let sellerId = role === "seller" ? userId : input.seller_id;
    let product: any;

    if (input.product_id) {
      product = await Product.findById(input.product_id).select("seller");
      if (!product) throw new ApiError(404, "Product not found", "PRODUCT_NOT_FOUND");
      if (sellerId && String(product.seller) !== sellerId) {
        throw new ApiError(403, "The product does not belong to this seller", "FORBIDDEN");
      }
      sellerId = sellerId || String(product.seller);
    }

    if (!buyerId || !sellerId || buyerId === sellerId) {
      throw new ApiError(400, "A buyer and seller are required", "INVALID_PARTICIPANTS");
    }

    const [buyer, seller] = await Promise.all([
      User.findOne({ _id: buyerId, role: "buyer", status: "active" }).select("_id"),
      User.findOne({ _id: sellerId, role: "seller", status: "active" }).select("_id"),
    ]);
    if (!buyer || !seller) {
      throw new ApiError(400, "Conversation participants are invalid or inactive", "INVALID_PARTICIPANTS");
    }

    if (input.order_id) {
      const order = await Order.findById(input.order_id).select("user");
      if (!order) throw new ApiError(404, "Order not found", "ORDER_NOT_FOUND");
      const isBuyer = String(order.user) === buyerId;
      const isSeller = Boolean(await OrderItem.exists({ order: order._id, seller: sellerId }));
      if (!isBuyer && !isSeller) {
        throw new ApiError(403, "You are not allowed to reference this order", "FORBIDDEN");
      }
    }

    const existing = await Conversation.findOne({
      buyer: buyerId,
      seller: sellerId,
      ...(input.product_id ? { product: input.product_id } : { product: { $exists: false } }),
      ...(input.order_id ? { order: input.order_id } : { order: { $exists: false } }),
      status: "active",
    });

    let conversation = existing;
    if (!conversation) {
      conversation = await Conversation.create({
        buyer: buyerId,
        seller: sellerId,
        product: input.product_id,
        order: input.order_id,
        status: "active",
      });
      await ConversationParticipant.create([
        { conversation: conversation._id, user: buyerId, role: "buyer" },
        { conversation: conversation._id, user: sellerId, role: "seller" },
      ]);
    }

    if (input.initial_message) {
      await this.sendMessage(userId, String(conversation._id), input.initial_message);
    }
    return this.serializeConversation(conversation, userId);
  }

  async list(userId: string, query: { status?: ConversationStatus; page?: number; per_page?: number }) {
    const page = query.page || 1;
    const perPage = query.per_page || 20;
    const memberships = await ConversationParticipant.find({ user: userId }).select("conversation").lean();
    const ids = memberships.map((membership) => membership.conversation);
    const filter: Record<string, unknown> = { _id: { $in: ids } };
    if (query.status) filter.status = query.status;
    const [total, conversations] = await Promise.all([
      Conversation.countDocuments(filter),
      Conversation.find(filter).sort({ lastMessageAt: -1, updatedAt: -1 }).skip((page - 1) * perPage).limit(perPage),
    ]);
    return {
      conversations: await Promise.all(conversations.map((conversation) => this.serializeConversation(conversation, userId))),
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    };
  }

  async get(userId: string, conversationId: string) {
    return this.serializeConversation(await this.getConversation(conversationId, userId), userId);
  }

  async update(userId: string, conversationId: string, status: ConversationStatus) {
    const conversation = await this.getConversation(conversationId, userId);
    conversation.status = status;
    await conversation.save();
    return this.serializeConversation(conversation, userId);
  }

  async remove(userId: string, conversationId: string) {
    return this.update(userId, conversationId, "closed");
  }

  async listMessages(userId: string, conversationId: string, query: { page?: number; per_page?: number }) {
    await this.getConversation(conversationId, userId);
    const page = query.page || 1;
    const perPage = query.per_page || 50;
    const [total, messages] = await Promise.all([
      Message.countDocuments({ conversation: conversationId }),
      Message.find({ conversation: conversationId })
        .populate("sender", "name email avatar role")
        .sort({ createdAt: 1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean(),
    ]);
    return {
      messages: messages.map(messageView),
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    };
  }

  async getMessage(userId: string, conversationId: string, messageId: string) {
    await this.getConversation(conversationId, userId);
    const message = await Message.findOne({ _id: messageId, conversation: conversationId })
      .populate("sender", "name email avatar role")
      .lean();
    if (!message) throw new ApiError(404, "Message not found", "MESSAGE_NOT_FOUND");
    return messageView(message);
  }

  async sendMessage(userId: string, conversationId: string, body: string) {
    const conversation = await this.getConversation(conversationId, userId);
    if (conversation.status === "closed") {
      throw new ApiError(409, "This conversation is closed", "CONVERSATION_CLOSED");
    }
    const now = new Date();
    const message = await Message.create({
      conversation: conversationId,
      sender: userId,
      body,
      readBy: [{ user: userId, readAt: now }],
    });
    conversation.lastMessageAt = now;
    conversation.lastMessagePreview = body.slice(0, 300);
    await conversation.save();
    await ConversationParticipant.updateOne(
      { conversation: conversationId, user: userId },
      { $set: { lastReadAt: now } }
    );
    const populated = await Message.findById(message._id).populate("sender", "name email avatar role").lean();
    return messageView(populated || message);
  }

  async updateMessage(userId: string, conversationId: string, messageId: string, body: string) {
    await this.getConversation(conversationId, userId);
    const message = await Message.findOne({ _id: messageId, conversation: conversationId, sender: userId, deletedAt: { $exists: false } });
    if (!message) throw new ApiError(404, "Message not found", "MESSAGE_NOT_FOUND");
    message.body = body;
    message.updatedAt = new Date();
    await message.save();
    const populated = await Message.findById(message._id).populate("sender", "name email avatar role").lean();
    return messageView(populated || message);
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await Message.findById(messageId);
    if (!message) throw new ApiError(404, "Message not found", "MESSAGE_NOT_FOUND");
    await this.requireParticipant(String(message.conversation), userId);
    if (String(message.sender) !== userId) {
      throw new ApiError(403, "You can only delete your own messages", "FORBIDDEN");
    }
    if (!message.deletedAt) {
      message.deletedAt = new Date();
      await message.save();
    }
    return messageView(message);
  }

  async markRead(userId: string, conversationId: string, messageId?: string) {
    await this.getConversation(conversationId, userId);
    const cutoff = messageId
      ? await Message.findOne({ _id: messageId, conversation: conversationId }).select("createdAt")
      : undefined;
    if (messageId && !cutoff) throw new ApiError(404, "Message not found", "MESSAGE_NOT_FOUND");
    const readAt = new Date();
    await ConversationParticipant.updateOne(
      { conversation: conversationId, user: userId },
      { $set: { lastReadAt: cutoff?.createdAt || readAt } }
    );
    const filter: Record<string, unknown> = {
      conversation: conversationId,
      sender: { $ne: userId },
      ...(cutoff ? { createdAt: { $lte: cutoff.createdAt } } : {}),
    };
    const unreadMessages = await Message.find(filter).select("_id");
    await Promise.all(unreadMessages.map((message) =>
      Message.updateOne(
        { _id: message._id, "readBy.user": { $ne: userId } },
        { $push: { readBy: { user: userId, readAt } } }
      )
    ));
    return { conversation_id: conversationId, read_at: readAt, message_id: messageId };
  }
}

export default new MessagingService();
