import { Request, Response } from "express";
import ProfileService from "../services/ProfileService";
import { asyncHandler } from "../utils/apiErrors";

class ProfileController {
  get = asyncHandler(async (req: Request, res: Response) => { res.json(await ProfileService.getProfile(req.user!.id)); });
  update = asyncHandler(async (req: Request, res: Response) => { res.json(await ProfileService.updateProfile(req.user!.id, req.body)); });
  photo = asyncHandler(async (req: Request, res: Response) => { res.json(await ProfileService.updatePhoto(req.user!.id, req.body.photo_url || req.body.url, req.body.public_id)); });
  getPreferences = asyncHandler(async (req: Request, res: Response) => { res.json({ preferences: await ProfileService.getPreferences(req.user!.id) }); });
  updatePreferences = asyncHandler(async (req: Request, res: Response) => { res.json({ preferences: await ProfileService.updatePreferences(req.user!.id, req.body) }); });
}

export default new ProfileController();
