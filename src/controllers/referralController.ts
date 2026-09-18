import { Request, Response } from "express";
import ReferralService from "../services/ReferralService";
import { asyncHandler } from "../utils/apiErrors";

class ReferralController {
  summary = asyncHandler(async (req: Request, res: Response) => { res.json({ summary: await ReferralService.summary(req.user!.id) }); });
  list = asyncHandler(async (req: Request, res: Response) => { res.json(await ReferralService.list(req.user!.id, req.query as { page?: number; per_page?: number })); });
  apply = asyncHandler(async (req: Request, res: Response) => { res.status(201).json({ referral: await ReferralService.apply(req.user!.id, req.body.code) }); });
}

export default new ReferralController();
