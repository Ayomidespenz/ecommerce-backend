import { Request, Response } from "express";
import OrderService from "../services/OrderService";
import { asyncHandler } from "../utils/apiErrors";

class OrderController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const reference = req.body.payment_reference || req.body.reference;
    res.status(201).json({ order: await OrderService.create(req.user!.id, req.body.quote_id, reference) });
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    res.json(await OrderService.list(req.user!.id, req.query as any));
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    res.json({ order: await OrderService.get(req.user!.id, req.params.id) });
  });

  sellerList = asyncHandler(async (req: Request, res: Response) => {
    res.json(await OrderService.sellerList(req.user!.id, req.query as any));
  });

  sellerGet = asyncHandler(async (req: Request, res: Response) => {
    res.json({ order: await OrderService.sellerGet(req.user!.id, req.params.id) });
  });

  sellerUpdateStatus = asyncHandler(async (req: Request, res: Response) => {
    res.json({
      order: await OrderService.sellerUpdateStatus(
        req.user!.id,
        req.params.id,
        req.body.status,
        req.body.note
      ),
    });
  });

  sellerCancel = asyncHandler(async (req: Request, res: Response) => {
    res.json({
      order: await OrderService.sellerCancel(req.user!.id, req.params.id, req.body.reason),
    });
  });

  sellerTimeline = asyncHandler(async (req: Request, res: Response) => {
    res.json(await OrderService.sellerTimeline(req.user!.id, req.params.id));
  });

  tracking = asyncHandler(async (req: Request, res: Response) => {
    res.json(await OrderService.tracking(req.user!.id, req.params.id));
  });

  cancel = asyncHandler(async (req: Request, res: Response) => {
    res.json({ order: await OrderService.cancel(req.user!.id, req.params.id, req.body.reason) });
  });

  reorder = asyncHandler(async (req: Request, res: Response) => {
    res.json(await OrderService.reorder(req.user!.id, req.params.id));
  });

  returnOrder = asyncHandler(async (req: Request, res: Response) => {
    res.json({ order: await OrderService.returnOrder(req.user!.id, req.params.id, req.body.reason) });
  });

  refund = asyncHandler(async (req: Request, res: Response) => {
    res.json({ order: await OrderService.refund(req.user!.id, req.params.id, req.body.reason) });
  });

  receipt = asyncHandler(async (req: Request, res: Response) => {
    res.json(await OrderService.receipt(req.user!.id, req.params.id));
  });
}

export default new OrderController();
