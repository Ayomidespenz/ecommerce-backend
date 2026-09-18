import { Request, Response } from "express";
import FeedbackService from "../services/FeedbackService";
import { asyncHandler } from "../utils/apiErrors";

class FeedbackController {
  create = asyncHandler(async (req: Request, res: Response) => { res.status(201).json({ feedback: await FeedbackService.create(req.user!.id, req.body) }); });
}

export default new FeedbackController();
