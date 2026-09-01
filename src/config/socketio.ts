import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Logger } from './logger.js';
import env from './environment.js';
import { socketAuthMiddleware } from '../middleware/socketAuth.js';

const logger = Logger.getInstance();

/**
 * Socket.io Configuration
 * Handles real-time chat messaging with JWT authentication
 */

interface AuthenticatedSocket extends Socket {
  userId?: string;
  conversationId?: string;
  isConnected?: boolean;
}

class SocketIOConfig {
  private static instance: SocketIOServer | null = null;

  /**
   * Initialize Socket.io server with HTTP server
   */
  static initialize(httpServer: HTTPServer): SocketIOServer {
    if (SocketIOConfig.instance) {
      return SocketIOConfig.instance;
    }

    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.get('FRONTEND_URL') || 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
      pingInterval: 30000, // 30 seconds
      pingTimeout: 60000, // 60 seconds
    });

    // Authentication middleware
    io.use(socketAuthMiddleware);

    // Connection handler
    io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info('User connected to chat', {
        userId: socket.userId,
        socketId: socket.id,
      });

      socket.isConnected = true;

      // Join conversation room
      socket.on('join_conversation', (conversationId: string) => {
        if (!socket.userId) {
          socket.emit('error', 'User not authenticated');
          return;
        }

        socket.conversationId = conversationId;
        const roomName = `conversation_${conversationId}`;
        socket.join(roomName);

        logger.debug('User joined conversation', {
          userId: socket.userId,
          conversationId,
          room: roomName,
        });

        // Notify other user in conversation that user is online
        socket.to(roomName).emit('user_online', {
          userId: socket.userId,
          timestamp: new Date(),
        });
      });

      // Leave conversation room
      socket.on('leave_conversation', (conversationId: string) => {
        const roomName = `conversation_${conversationId}`;
        socket.leave(roomName);

        logger.debug('User left conversation', {
          userId: socket.userId,
          conversationId,
          room: roomName,
        });

        // Notify other user that user is offline
        socket.to(roomName).emit('user_offline', {
          userId: socket.userId,
          timestamp: new Date(),
        });
      });

      // Typing indicator
      socket.on('typing', (conversationId: string) => {
        if (!socket.userId) return;

        const roomName = `conversation_${conversationId}`;
        socket.to(roomName).emit('user_typing', {
          userId: socket.userId,
          conversationId,
          timestamp: new Date(),
        });

        logger.debug('User typing', { userId: socket.userId, conversationId });
      });

      // Stop typing
      socket.on('stop_typing', (conversationId: string) => {
        if (!socket.userId) return;

        const roomName = `conversation_${conversationId}`;
        socket.to(roomName).emit('user_stop_typing', {
          userId: socket.userId,
          conversationId,
          timestamp: new Date(),
        });
      });

      // Disconnect handler
      socket.on('disconnect', () => {
        logger.info('User disconnected from chat', {
          userId: socket.userId,
          socketId: socket.id,
        });

        socket.isConnected = false;

        // Notify other users
        if (socket.conversationId) {
          const roomName = `conversation_${socket.conversationId}`;
          socket.to(roomName).emit('user_offline', {
            userId: socket.userId,
            timestamp: new Date(),
          });
        }
      });

      // Error handler
      socket.on('error', (error) => {
        logger.error('Socket error', {
          userId: socket.userId,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    });

    SocketIOConfig.instance = io;
    logger.info('Socket.io initialized successfully');

    return io;
  }

  /**
   * Get Socket.io instance
   */
  static getInstance(): SocketIOServer | null {
    return SocketIOConfig.instance;
  }

  /**
   * Emit message to conversation room
   */
  static emitMessageToConversation(
    conversationId: string,
    event: string,
    data: any
  ): void {
    const io = SocketIOConfig.instance;
    if (io) {
      const roomName = `conversation_${conversationId}`;
      io.to(roomName).emit(event, data);
      logger.debug('Event emitted to conversation', {
        conversationId,
        event,
        roomName,
      });
    }
  }

  /**
   * Emit message to specific user
   */
  static emitMessageToUser(userId: string, event: string, data: any): void {
    const io = SocketIOConfig.instance;
    if (io) {
      const roomName = `user_${userId}`;
      io.to(roomName).emit(event, data);
      logger.debug('Event emitted to user', { userId, event, roomName });
    }
  }
}

export { SocketIOConfig, AuthenticatedSocket };
