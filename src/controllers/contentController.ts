import { Request, Response } from "express";
import ContentService from "../services/ContentService";
import { ApiError, asyncHandler } from "../utils/apiErrors";

class ContentController {
  faqs = asyncHandler(async (req: Request, res: Response) => { res.json(ContentService.faqs(req.query.category as string | undefined)); });
  get = asyncHandler(async (req: Request, res: Response) => { const content = ContentService.get(req.params.slug); if (!content) throw new ApiError(404, "Content not found", "CONTENT_NOT_FOUND"); res.json({ content }); });
}

export default new ContentController();
