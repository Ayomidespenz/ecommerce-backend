import { Request, Response } from "express";
import AdminOperationsService from "../services/AdminOperationsService";
import { asyncHandler } from "../utils/apiErrors";

class AdminOperationsController {
  getListingReview = asyncHandler(async (req: Request, res: Response) => { res.json({ listing: await AdminOperationsService.getListingReview(req.params.id) }); });
  updateListingReview = asyncHandler(async (req: Request, res: Response) => { res.json({ listing: await AdminOperationsService.updateListingReview(req.params.id, req.user!.id, req.body) }); });
  getVerification = asyncHandler(async (req: Request, res: Response) => { res.json({ verification: await AdminOperationsService.getVerification(req.params.id) }); });
  updateVerification = asyncHandler(async (req: Request, res: Response) => { res.json({ verification: await AdminOperationsService.updateVerification(req.params.id, req.body) }); });
  getOrder = asyncHandler(async (req: Request, res: Response) => { res.json({ order: await AdminOperationsService.getOrder(req.params.id) }); });
  updateOrder = asyncHandler(async (req: Request, res: Response) => { res.json({ order: await AdminOperationsService.updateOrder(req.params.id, req.user!.id, req.body) }); });
  getRefund = asyncHandler(async (req: Request, res: Response) => { res.json({ refund: await AdminOperationsService.getRefund(req.params.id) }); });
  updateRefund = asyncHandler(async (req: Request, res: Response) => { res.json({ refund: await AdminOperationsService.updateRefund(req.params.id, req.user!.id, req.body) }); });
  getSupportTicket = asyncHandler(async (req: Request, res: Response) => { res.json({ ticket: await AdminOperationsService.getSupportTicket(req.params.id) }); });
  updateSupportTicket = asyncHandler(async (req: Request, res: Response) => { res.json({ ticket: await AdminOperationsService.updateSupportTicket(req.params.id, req.user!.id, req.body) }); });
  payouts = asyncHandler(async (req: Request, res: Response) => { res.json(await AdminOperationsService.payouts(req.query as { status?: string; seller_id?: string; page?: number; per_page?: number })); });
}

export default new AdminOperationsController();
