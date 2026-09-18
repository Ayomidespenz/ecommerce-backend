import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import mongoose from "mongoose";
import { Logger } from "./logger";
import { socketAuthMiddleware, SocketAuthUser } from "../middleware/socketAuth";
import ConversationParticipant from "../models/ConversationParticipant";
import MessagingService from "../services/MessagingService";

const logger = Logger.getInstance();

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  conversationId?: string;
  isConnected?: boolean;
  data: {
    user?: SocketAuthUser;
    userId?: string;
    [key: string]: unknown;
  };
}

type Ack = (payload: Record<string, unknown>) => void;

class SocketIOConfig {
  private static instance: SocketIOServer | null = null;

  static initialize(httpServer: HTTPServer): SocketIOServer {
    if (SocketIOConfig.instance) return SocketIOConfig.instance;

    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST", "PATCH", "DELETE"],
      },
      transports: ["websocket", "polling"],
      pingInterval: 30000,
      pingTimeout: 60000,
    });

    io.use(socketAuthMiddleware);

    io.on("connection", (socket: AuthenticatedSocket) => {
      const userId = socket.data.userId;
      socket.userId = userId;
      socket.isConnected = true;
      if (userId) socket.join(`user_${userId}`);

      logger.info("User connected to chat", { userId, socketId: socket.id });

      socket.on("join_conversation", async (conversationId: string, ack?: Ack) => {
        try {
          if (!userId || !mongoose.Types.ObjectId.isValid(conversationId)) {
            throw new Error("Invalid conversation");
          }
          const participant = await ConversationParticipant.findOne({
            conversation: conversationId,
            user: userId,
          }).select("_id");
          if (!participant) throw new Error("You are not a participant in this conversation");

          socket.join(`conversation_${conversationId}`);
          socket.conversationId = conversationId;
          socket.to(`conversation_${conversationId}`).emit("user_online", {
            user_id: userId,
            conversation_id: conversationId,
            timestamp: new Date(),
          });
          ack?.({ ok: true, conversation_id: conversationId });
        } catch (error) {
          ack?.({ ok: false, error: error instanceof Error ? error.message : "Unable to join conversation" });
        }
      });

      socket.on("leave_conversation", (conversationId: string, ack?: Ack) => {
        socket.leave(`conversation_${conversationId}`);
        if (socket.conversationId === conversationId) socket.conversationId = undefined;
        ack?.({ ok: true, conversation_id: conversationId });
      });

      socket.on("send_message", async (payload: any, ack?: Ack) => {
        try {
          const conversationId = payload?.conversation_id || payload?.conversationId;
          const body = typeof payload?.body === "string" ? payload.body.trim() : "";
          if (!userId || !mongoose.Types.ObjectId.isValid(conversationId) || !body) {
            throw new Error("conversation_id and body are required");
          }
          const message = await MessagingService.sendMessage(userId, conversationId, body);
          SocketIOConfig.emitMessageToConversation(conversationId, "message:new", message);
          ack?.({ ok: true, message });
        } catch (error) {
          ack?.({ ok: false, error: error instanceof Error ? error.message : "Unable to send message" });
        }
      });

      socket.on("mark_read", async (payload: any, ack?: Ack) => {
        try {
          const conversationId = payload?.conversation_id || payload?.conversationId;
          const messageId = payload?.message_id || payload?.messageId;
          if (!userId || !mongoose.Types.ObjectId.isValid(conversationId)) throw new Error("Invalid conversation");
          const result = await MessagingService.markRead(userId, conversationId, messageId);
          SocketIOConfig.emitMessageToConversation(conversationId, "conversation:read", {
            ...result,
            user_id: userId,
          });
          ack?.({ ok: true, ...result });
        } catch (error) {
          ack?.({ ok: false, error: error instanceof Error ? error.message : "Unable to mark messages read" });
        }
      });

      const typing = async (conversationId: string, event: string) => {
        if (!userId || !mongoose.Types.ObjectId.isValid(conversationId)) return;
        const participant = await ConversationParticipant.exists({ conversation: conversationId, user: userId });
        if (participant) {
          socket.to(`conversation_${conversationId}`).emit(event, {
            user_id: userId,
            conversation_id: conversationId,
            timestamp: new Date(),
          });
        }
      };

      socket.on("typing", (conversationId: string) => void typing(conversationId, "user_typing"));
      socket.on("stop_typing", (conversationId: string) => void typing(conversationId, "user_stop_typing"));

      socket.on("disconnect", () => {
        socket.isConnected = false;
        if (socket.conversationId && userId) {
          socket.to(`conversation_${socket.conversationId}`).emit("user_offline", {
            user_id: userId,
            conversation_id: socket.conversationId,
            timestamp: new Date(),
          });
        }
        logger.info("User disconnected from chat", { userId, socketId: socket.id });
      });
    });

    SocketIOConfig.instance = io;
    logger.info("Socket.io initialized successfully");
    return io;
  }

  static getInstance(): SocketIOServer | null {
    return SocketIOConfig.instance;
  }

  static emitMessageToConversation(conversationId: string, event: string, data: unknown): void {
    SocketIOConfig.instance?.to(`conversation_${conversationId}`).emit(event, data);
  }

  static emitMessageToUser(userId: string, event: string, data: unknown): void {
    SocketIOConfig.instance?.to(`user_${userId}`).emit(event, data);
  }
}

export { SocketIOConfig };
