import { Request, Response } from "express";
import SupportService from "../services/SupportService";
import { asyncHandler } from "../utils/apiErrors";

class SupportController {
  create = asyncHandler(async (req: Request, res: Response) => { res.status(201).json({ ticket: await SupportService.create(req.user!.id, req.user!.role, req.body) }); });
  list = asyncHandler(async (req: Request, res: Response) => { res.json(await SupportService.list(req.user!.id, req.query as { status?: string; page?: number; per_page?: number })); });
  get = asyncHandler(async (req: Request, res: Response) => { res.json({ ticket: await SupportService.get(req.user!.id, req.params.id) }); });
  addMessage = asyncHandler(async (req: Request, res: Response) => { res.status(201).json({ message: await SupportService.addMessage(req.user!.id, req.params.id, req.user!.role, req.body) }); });
}

export default new SupportController();
