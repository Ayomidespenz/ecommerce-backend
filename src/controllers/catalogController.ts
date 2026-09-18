import { Request, Response } from "express";
import CatalogService from "../services/CatalogService";
import PersonalizationService from "../services/PersonalizationService";
import { asyncHandler } from "../utils/apiErrors";

class CatalogController {
  categories = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await CatalogService.listCategories();
    res.json({ categories });
  });

  products = asyncHandler(async (req: Request, res: Response) => {
    const result = await CatalogService.listProducts(req.query as any);
    res.json(result);
  });

  product = asyncHandler(async (req: Request, res: Response) => {
    const product = await CatalogService.getProduct(req.params.id);
    res.json({ product });
  });

  reviews = asyncHandler(async (req: Request, res: Response) => {
    const result = await CatalogService.listReviews(req.params.id, req.query as any);
    res.json(result);
  });

  createReview = asyncHandler(async (req: Request, res: Response) => {
    const review = await CatalogService.createReview(req.params.id, req.user!.id, req.body);
    res.status(201).json({ review });
  });

  recordView = asyncHandler(async (req: Request, res: Response) => {
    const result = await CatalogService.recordView(req.params.id);
    if (req.user?.id) {
      await PersonalizationService.addRecentlyViewed(req.user.id, req.params.id);
    }
    res.json(result);
  });

  collection = (kind: "featured" | "flash_sales" | "best_selling" | "exclusive_offers" | "recommended") =>
    asyncHandler(async (req: Request, res: Response) => {
      const result = await CatalogService.getCollection(kind, req.query as any);
      res.json(result);
    });

  searchSuggestions = asyncHandler(async (req: Request, res: Response) => {
    const result = await CatalogService.searchSuggestions(String(req.query.q));
    res.json(result);
  });
}

export default new CatalogController();
