import { Request, Response } from "express";
import CheckoutService from "../services/CheckoutService";
import { asyncHandler } from "../utils/apiErrors";

class CheckoutController {
  quote = asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json({ quote: await CheckoutService.createQuote(req.user!.id, req.body.address_id, req.body.promo_code) });
  });

  validatePromo = asyncHandler(async (req: Request, res: Response) => {
    res.json(await CheckoutService.validatePromo(req.user!.id, req.body.code, req.body.address_id));
  });
}

export default new CheckoutController();
