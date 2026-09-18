import { Request, Response } from "express";
import MessagingService from "../services/MessagingService";
import { SocketIOConfig } from "../config/socketio";
import { asyncHandler } from "../utils/apiErrors";

class MessagingController {
  createConversation = asyncHandler(async (req: Request, res: Response) => {
    const conversation = await MessagingService.create(req.user!.id, req.user!.role, req.body);
    res.status(201).json({ conversation });
  });

  listConversations = asyncHandler(async (req: Request, res: Response) => {
    res.json(await MessagingService.list(req.user!.id, req.query as any));
  });

  getConversation = asyncHandler(async (req: Request, res: Response) => {
    res.json({ conversation: await MessagingService.get(req.user!.id, req.params.id) });
  });

  updateConversation = asyncHandler(async (req: Request, res: Response) => {
    const conversation = await MessagingService.update(req.user!.id, req.params.id, req.body.status);
    res.json({ conversation });
  });

  deleteConversation = asyncHandler(async (req: Request, res: Response) => {
    const conversation = await MessagingService.remove(req.user!.id, req.params.id);
    res.json({ conversation });
  });

  listMessages = asyncHandler(async (req: Request, res: Response) => {
    res.json(await MessagingService.listMessages(req.user!.id, req.params.id, req.query as any));
  });

  getMessage = asyncHandler(async (req: Request, res: Response) => {
    const message = await MessagingService.getMessage(req.user!.id, req.params.id, req.params.messageId);
    res.json({ message });
  });

  sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const message = await MessagingService.sendMessage(req.user!.id, req.params.id, req.body.body);
    SocketIOConfig.emitMessageToConversation(req.params.id, "message:new", message);
    res.status(201).json({ message });
  });

  updateMessage = asyncHandler(async (req: Request, res: Response) => {
    const message = await MessagingService.updateMessage(
      req.user!.id,
      req.params.id,
      req.params.messageId,
      req.body.body
    );
    SocketIOConfig.emitMessageToConversation(req.params.id, "message:updated", message);
    res.json({ message });
  });

  markRead = asyncHandler(async (req: Request, res: Response) => {
    const result = await MessagingService.markRead(req.user!.id, req.params.id, req.body.message_id);
    SocketIOConfig.emitMessageToConversation(req.params.id, "conversation:read", {
      ...result,
      user_id: req.user!.id,
    });
    res.json(result);
  });

  deleteMessage = asyncHandler(async (req: Request, res: Response) => {
    const message = await MessagingService.deleteMessage(req.user!.id, req.params.messageId);
    SocketIOConfig.emitMessageToConversation(String(message.conversation_id), "message:deleted", message);
    res.json({ message });
  });
}

export default new MessagingController();
