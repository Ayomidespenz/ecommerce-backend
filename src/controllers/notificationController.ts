import { Request, Response } from "express";
import NotificationService from "../services/NotificationService";
import { asyncHandler } from "../utils/apiErrors";

class NotificationController {
  list = asyncHandler(async (req: Request, res: Response) => { res.json(await NotificationService.list(req.user!.id, req.query as any)); });
  unreadCount = asyncHandler(async (req: Request, res: Response) => { res.json(await NotificationService.unreadCount(req.user!.id)); });
  markRead = asyncHandler(async (req: Request, res: Response) => { res.json({ notification: await NotificationService.markRead(req.user!.id, req.params.id) }); });
  readAll = asyncHandler(async (req: Request, res: Response) => { res.json(await NotificationService.readAll(req.user!.id)); });
  remove = asyncHandler(async (req: Request, res: Response) => { await NotificationService.remove(req.user!.id, req.params.id); res.json({ message: "Notification deleted" }); });
}

export default new NotificationController();
