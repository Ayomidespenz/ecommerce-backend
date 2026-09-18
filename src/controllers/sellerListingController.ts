import { Request, Response } from "express";
import SellerListingService from "../services/SellerListingService";
import { asyncHandler } from "../utils/apiErrors";

class SellerListingController {
  dashboard = asyncHandler(async (req: Request, res: Response) => { res.json({ dashboard: await SellerListingService.dashboard(req.user!.id, String(req.query.range || "7d")) }); });
  list = asyncHandler(async (req: Request, res: Response) => { res.json(await SellerListingService.list(req.user!.id, req.query as any)); });
  get = asyncHandler(async (req: Request, res: Response) => { res.json({ listing: await SellerListingService.get(req.user!.id, req.params.id) }); });
  create = asyncHandler(async (req: Request, res: Response) => { res.status(201).json({ listing: await SellerListingService.create(req.user!.id, req.body) }); });
  update = asyncHandler(async (req: Request, res: Response) => { res.json({ listing: await SellerListingService.update(req.user!.id, req.params.id, req.body) }); });
  remove = asyncHandler(async (req: Request, res: Response) => { res.json({ listing: await SellerListingService.remove(req.user!.id, req.params.id) }); });
  publish = asyncHandler(async (req: Request, res: Response) => { res.json({ listing: await SellerListingService.publish(req.user!.id, req.params.id) }); });
  pause = asyncHandler(async (req: Request, res: Response) => { res.json({ listing: await SellerListingService.pause(req.user!.id, req.params.id) }); });
  markSold = asyncHandler(async (req: Request, res: Response) => { res.json({ listing: await SellerListingService.markSold(req.user!.id, req.params.id) }); });
  analytics = asyncHandler(async (req: Request, res: Response) => { res.json({ analytics: await SellerListingService.analytics(req.user!.id, req.params.id, String(req.query.range || "30d")) }); });
  upload = asyncHandler(async (req: Request, res: Response) => { res.status(201).json({ upload: await SellerListingService.upload(req.file, req.user!.id, req.body.url, req.body.folder) }); });
  addImage = asyncHandler(async (req: Request, res: Response) => { res.status(201).json({ image: await SellerListingService.addImage(req.user!.id, req.params.id, req.body, req.file) }); });
  removeImage = asyncHandler(async (req: Request, res: Response) => { res.json(await SellerListingService.removeImage(req.user!.id, req.params.id, req.params.imageId)); });
}

export default new SellerListingController();
