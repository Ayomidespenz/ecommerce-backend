import { Request, Response } from "express";
import AddressService from "../services/AddressService";
import { asyncHandler } from "../utils/apiErrors";

class AddressController {
  list = asyncHandler(async (req: Request, res: Response) => {
    res.json({ addresses: await AddressService.list(req.user!.id) });
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    res.json({ address: await AddressService.get(req.user!.id, req.params.id) });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json({ address: await AddressService.create(req.user!.id, req.body) });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    res.json({ address: await AddressService.update(req.user!.id, req.params.id, req.body) });
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await AddressService.remove(req.user!.id, req.params.id);
    res.json({ message: "Address deleted" });
  });

  setDefault = asyncHandler(async (req: Request, res: Response) => {
    res.json({ address: await AddressService.setDefault(req.user!.id, req.params.id) });
  });
}

export default new AddressController();
