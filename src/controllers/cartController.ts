import { Request, Response } from "express";
import CartService from "../services/CartService";
import { asyncHandler } from "../utils/apiErrors";

class CartController {
  getCart = asyncHandler(async (req: Request, res: Response) => {
    res.json(await CartService.getCart(req.user!.id));
  });

  addItem = asyncHandler(async (req: Request, res: Response) => {
    const item = await CartService.addItem(req.user!.id, req.body.product_id, req.body.quantity);
    const cart = await CartService.getCart(req.user!.id);
    res.status(201).json({ item, ...cart });
  });

  updateItem = asyncHandler(async (req: Request, res: Response) => {
    const item = await CartService.updateItem(req.user!.id, req.params.itemId, req.body.quantity);
    const cart = await CartService.getCart(req.user!.id);
    res.json({ item, ...cart });
  });

  removeItem = asyncHandler(async (req: Request, res: Response) => {
    await CartService.removeItem(req.user!.id, req.params.itemId);
    res.json({ message: "Cart item removed" });
  });

  clearCart = asyncHandler(async (req: Request, res: Response) => {
    await CartService.clearCart(req.user!.id);
    res.json({ message: "Cart cleared" });
  });
}

export default new CartController();
