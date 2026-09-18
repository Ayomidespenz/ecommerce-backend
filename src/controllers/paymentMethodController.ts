import { Request, Response } from "express";
import PaymentMethodService from "../services/PaymentMethodService";
import { asyncHandler } from "../utils/apiErrors";

class PaymentMethodController {
  list = asyncHandler(async (req: Request, res: Response) => {
    res.json({ payment_methods: await PaymentMethodService.list(req.user!.id) });
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    res.json({ payment_method: await PaymentMethodService.get(req.user!.id, req.params.id) });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json({ payment_method: await PaymentMethodService.create(req.user!.id, req.body) });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    res.json({ payment_method: await PaymentMethodService.update(req.user!.id, req.params.id, req.body) });
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await PaymentMethodService.remove(req.user!.id, req.params.id);
    res.json({ message: "Payment method deleted" });
  });

  setDefault = asyncHandler(async (req: Request, res: Response) => {
    res.json({ payment_method: await PaymentMethodService.setDefault(req.user!.id, req.params.id) });
  });
}

export default new PaymentMethodController();
