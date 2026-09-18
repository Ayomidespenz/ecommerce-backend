import { ApiError } from "../utils/apiErrors";

const cloudinary = require("cloudinary").v2 as any;

function configured(): boolean {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

class UploadService {
  async upload(file: Express.Multer.File, userId: string, folder = "listings") {
    if (!configured()) throw new ApiError(503, "Storage provider is not configured", "STORAGE_NOT_CONFIGURED");
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    return new Promise<{ url: string; public_id?: string; provider: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `fortunemart/${folder}/${userId}`, resource_type: "auto" },
        (error: any, result: any) => {
          if (error || !result) { reject(new ApiError(502, "Image upload failed", "UPLOAD_FAILED")); return; }
          resolve({ url: result.secure_url || result.url, public_id: result.public_id, provider: "cloudinary" });
        }
      );
      stream.end(file.buffer);
    });
  }

  async destroy(publicId?: string): Promise<void> {
    if (!publicId || !configured()) return;
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  }
}

export default new UploadService();
