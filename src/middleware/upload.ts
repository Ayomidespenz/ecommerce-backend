import multer from "multer";
import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiErrors";

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new ApiError(400, "Only image files are accepted", "INVALID_UPLOAD_TYPE"));
      return;
    }
    callback(null, true);
  },
});

export function singleImage(field = "file") {
  const middleware = parser.single(field);
  return (req: Request, res: Response, next: NextFunction): void => {
    middleware(req, res, (error: unknown) => {
      if (error) {
        if (error instanceof ApiError) {
          next(error);
          return;
        }
        next(new ApiError(400, "Invalid multipart upload", "INVALID_UPLOAD"));
        return;
      }
      next();
    });
  };
}
