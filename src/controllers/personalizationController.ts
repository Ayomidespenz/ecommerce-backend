import { Request, Response } from "express";
import PersonalizationService from "../services/PersonalizationService";
import { asyncHandler } from "../utils/apiErrors";

class PersonalizationController {
  listFavorites = asyncHandler(async (req: Request, res: Response) => {
    const result = await PersonalizationService.listFavorites(req.user!.id, req.query as any);
    res.json(result);
  });

  addFavorite = asyncHandler(async (req: Request, res: Response) => {
    const favorite = await PersonalizationService.addFavorite(req.user!.id, req.body.product_id);
    res.status(201).json({ favorite });
  });

  removeFavorite = asyncHandler(async (req: Request, res: Response) => {
    await PersonalizationService.removeFavorite(req.user!.id, req.params.productId);
    res.json({ message: "Product removed from favorites" });
  });

  clearFavorites = asyncHandler(async (req: Request, res: Response) => {
    await PersonalizationService.clearFavorites(req.user!.id);
    res.json({ message: "Favorites cleared" });
  });

  listRecentlyViewed = asyncHandler(async (req: Request, res: Response) => {
    const result = await PersonalizationService.listRecentlyViewed(req.user!.id, req.query as any);
    res.json(result);
  });

  addRecentlyViewed = asyncHandler(async (req: Request, res: Response) => {
    const recentlyViewed = await PersonalizationService.addRecentlyViewed(req.user!.id, req.body.product_id);
    res.status(201).json({ recently_viewed: recentlyViewed });
  });

  removeRecentlyViewed = asyncHandler(async (req: Request, res: Response) => {
    await PersonalizationService.removeRecentlyViewed(req.user!.id, req.params.productId);
    res.json({ message: "Product removed from recently viewed" });
  });

  clearRecentlyViewed = asyncHandler(async (req: Request, res: Response) => {
    await PersonalizationService.clearRecentlyViewed(req.user!.id);
    res.json({ message: "Recently viewed history cleared" });
  });
}

export default new PersonalizationController();
