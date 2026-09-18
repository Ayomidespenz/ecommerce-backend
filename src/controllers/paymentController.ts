import { Request, Response } from "express";
import PaymentService from "../services/PaymentService";
import { asyncHandler } from "../utils/apiErrors";

class PaymentController {
  initialize = asyncHandler(async (req: Request, res: Response) => {
    const result = await PaymentService.initialize(req.user!.id, req.body.quote_id, req.body.email);
    res.status(201).json(result);
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    res.json({ payment: await PaymentService.getForUser(req.user!.id, req.params.reference) });
  });

  webhook = asyncHandler(async (req: Request, res: Response) => {
    const signatureHeader = req.headers["x-paystack-signature"];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    const result = await PaymentService.handleWebhook(req.body, signature, rawBody);
    res.json(result);
  });
}

export default new PaymentController();
