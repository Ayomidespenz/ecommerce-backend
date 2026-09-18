import mongoose from "mongoose";
import Category from "../models/Category";
import OrderItem from "../models/OrderItem";
import Product from "../models/Product";
import ProductImage from "../models/ProductImage";
import UploadService from "./UploadService";
import { ApiError } from "../utils/apiErrors";

function slugify(value: string): string { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 220) || "listing"; }
function tagsOf(value: unknown): string[] { return Array.isArray(value) ? value.map(String).map((x) => x.trim()).filter(Boolean) : typeof value === "string" ? value.split(",").map((x) => x.trim()).filter(Boolean) : []; }
function categoryId(input: any): string { return input.category_id || input.category; }
function dateFromRange(range = "7d"): Date { const days = range === "90d" ? 90 : range === "30d" ? 30 : 7; return new Date(Date.now() - days * 24 * 60 * 60 * 1000); }

function imageView(image: any) { return { id: String(image._id), url: image.url, public_id: image.publicId, storage_key: image.storageKey, alt: image.alt, sort_order: image.sortOrder, is_primary: image.isPrimary }; }
function productView(product: any, images: any[] = []) {
  const category = product.category && typeof product.category === "object" ? { id: String(product.category._id), name: product.category.name, slug: product.category.slug } : { id: String(product.category) };
  return { id: String(product._id), name: product.name, slug: product.slug, description: product.description, brand: product.brand, sku: product.sku, product_type: product.productType, tags: product.tags || [], price: product.price, original_price: product.originalPrice, currency: product.currency, stock: product.stock, availability: product.availability, status: product.status, category, images: images.map(imageView), is_active: product.isActive, sold_count: product.soldCount, view_count: product.viewCount, rating_average: product.ratingAverage, rating_count: product.ratingCount, published_at: product.publishedAt, created_at: product.createdAt, updated_at: product.updatedAt };
}

class SellerListingService {
  private async ensureCategory(id: string) { const category = await Category.findOne({ _id: id, isActive: true }); if (!category) throw new ApiError(400, "A valid active category is required", "INVALID_CATEGORY"); return category; }
  private async uniqueSlug(sellerId: string, requested: string, currentId?: string) {
    const base = slugify(requested); let slug = base; let count = 2;
    while (await Product.exists({ seller: sellerId, slug, ...(currentId ? { _id: { $ne: currentId } } : {}) })) slug = `${base}-${count++}`;
    return slug;
  }
  private async owned(sellerId: string, id: string) { const product = await Product.findOne({ _id: id, seller: sellerId }); if (!product) throw new ApiError(404, "Listing not found", "LISTING_NOT_FOUND"); return product; }
  private async view(product: any) { const images = await ProductImage.find({ product: product._id }).sort({ isPrimary: -1, sortOrder: 1, createdAt: 1 }).lean(); return productView(product, images); }

  async list(sellerId: string, query: { q?: string; status?: string; page?: number; per_page?: number }) {
    const page = query.page || 1; const perPage = query.per_page || 20; const filter: any = { seller: sellerId };
    if (query.status) filter.status = query.status;
    if (query.q) filter.$or = [{ name: new RegExp(query.q, "i") }, { sku: new RegExp(query.q, "i") }];
    const [rows, total] = await Promise.all([Product.find(filter).populate("category", "name slug").sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean(), Product.countDocuments(filter)]);
    const images = await ProductImage.find({ product: { $in: rows.map((row) => row._id) } }).sort({ sortOrder: 1 }).lean();
    const byProduct = new Map<string, any[]>(); for (const image of images) { const key = String(image.product); byProduct.set(key, [...(byProduct.get(key) || []), image]); }
    return { listings: rows.map((row) => productView(row, byProduct.get(String(row._id)) || [])), meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) } };
  }

  async get(sellerId: string, id: string) { return this.view(await this.owned(sellerId, id)); }

  async create(sellerId: string, input: any) {
    await this.ensureCategory(categoryId(input)); const stock = Number(input.stock); const availability = input.availability || (stock > 0 ? "in_stock" : "out_of_stock");
    const product = await Product.create({ seller: sellerId, category: categoryId(input), name: input.name, slug: await this.uniqueSlug(sellerId, input.slug || input.name), description: input.description, brand: input.brand, sku: input.sku, productType: input.product_type || input.productType || "physical", tags: tagsOf(input.tags), price: input.price, originalPrice: input.original_price ?? input.originalPrice, currency: input.currency || "NGN", stock, availability, status: "draft", isActive: true });
    return this.view(product);
  }

  async update(sellerId: string, id: string, input: any) {
    const product = await this.owned(sellerId, id); const data: any = {};
    if (input.category_id || input.category) { await this.ensureCategory(categoryId(input)); data.category = categoryId(input); }
    if (input.name !== undefined) { data.name = input.name; data.slug = await this.uniqueSlug(sellerId, input.slug || input.name, id); }
    else if (input.slug !== undefined) data.slug = await this.uniqueSlug(sellerId, input.slug, id);
    if (input.description !== undefined) data.description = input.description;
    if (input.brand !== undefined) data.brand = input.brand; if (input.sku !== undefined) data.sku = input.sku;
    if (input.product_type !== undefined || input.productType !== undefined) data.productType = input.product_type || input.productType;
    if (input.tags !== undefined) data.tags = tagsOf(input.tags); if (input.price !== undefined) data.price = input.price;
    if (input.original_price !== undefined || input.originalPrice !== undefined) data.originalPrice = input.original_price ?? input.originalPrice;
    if (input.currency !== undefined) data.currency = input.currency; if (input.stock !== undefined) data.stock = input.stock;
    if (input.availability !== undefined) data.availability = input.availability; else if (input.stock !== undefined && product.availability !== "preorder") data.availability = input.stock > 0 ? "in_stock" : "out_of_stock";
    Object.assign(product, data); await product.save(); return this.view(product);
  }

  async remove(sellerId: string, id: string) { const product = await this.owned(sellerId, id); product.status = "archived"; product.isActive = false; await product.save(); return { id, status: product.status }; }
  async publish(sellerId: string, id: string) { const product = await this.owned(sellerId, id); if (product.status === "archived") throw new ApiError(409, "Archived listings cannot be published", "LISTING_ARCHIVED"); product.status = "published"; product.isActive = true; product.publishedAt = product.publishedAt || new Date(); await product.save(); return this.view(product); }
  async pause(sellerId: string, id: string) { const product = await this.owned(sellerId, id); product.status = "paused"; product.isActive = false; await product.save(); return this.view(product); }
  async markSold(sellerId: string, id: string) { const product = await this.owned(sellerId, id); product.stock = 0; product.availability = "out_of_stock"; product.status = "paused"; product.isActive = false; await product.save(); return this.view(product); }

  async dashboard(sellerId: string, range: string) {
    const since = dateFromRange(range); const validStatuses = ["confirmed", "processing", "shipped", "delivered", "completed"];
    const [counts, productStats, sales] = await Promise.all([
      Product.aggregate([{ $match: { seller: new mongoose.Types.ObjectId(sellerId) } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Product.aggregate([{ $match: { seller: new mongoose.Types.ObjectId(sellerId) } }, { $group: { _id: null, views: { $sum: "$viewCount" }, sold: { $sum: "$soldCount" } } }]),
      OrderItem.aggregate([{ $match: { seller: new mongoose.Types.ObjectId(sellerId), createdAt: { $gte: since } } }, { $lookup: { from: "orders", localField: "order", foreignField: "_id", as: "order" } }, { $unwind: "$order" }, { $match: { "order.status": { $in: validStatuses } } }, { $group: { _id: null, units: { $sum: "$quantity" }, revenue: { $sum: "$lineTotal" } } }]),
    ]);
    return { range, listings: { total: counts.reduce((n, row) => n + row.count, 0), by_status: Object.fromEntries(counts.map((row) => [row._id, row.count])) }, performance: { views: productStats[0]?.views || 0, sold_units: productStats[0]?.sold || 0, period_sold_units: sales[0]?.units || 0, period_revenue: sales[0]?.revenue || 0, currency: "NGN" } };
  }

  async analytics(sellerId: string, id: string, range: string) {
    const product = await this.owned(sellerId, id); const since = dateFromRange(range);
    const sales = await OrderItem.aggregate([{ $match: { seller: new mongoose.Types.ObjectId(sellerId), product: product._id, createdAt: { $gte: since } } }, { $lookup: { from: "orders", localField: "order", foreignField: "_id", as: "order" } }, { $unwind: "$order" }, { $match: { "order.status": { $nin: ["cancelled", "returned", "refunded"] } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, units: { $sum: "$quantity" }, revenue: { $sum: "$lineTotal" } } }, { $sort: { _id: 1 } }]);
    return { listing: await this.view(product), range, summary: { views: product.viewCount, sold_units: product.soldCount, stock: product.stock, rating_average: product.ratingAverage, rating_count: product.ratingCount }, sales: sales.map((row) => ({ date: row._id, units: row.units, revenue: row.revenue })) };
  }

  async upload(file: Express.Multer.File | undefined, sellerId: string, url?: string, folder?: string) { if (file) return UploadService.upload(file, sellerId, folder || "listings"); if (url) return { url, provider: "external" }; throw new ApiError(400, "A multipart file or URL is required", "UPLOAD_INPUT_REQUIRED"); }

  async addImage(sellerId: string, id: string, input: any, file?: Express.Multer.File) {
    const product = await this.owned(sellerId, id); const uploaded = await this.upload(file, sellerId, input.url, "listings"); const existing = await ProductImage.countDocuments({ product: product._id });
    if (input.is_primary || existing === 0) await ProductImage.updateMany({ product: product._id }, { $set: { isPrimary: false } });
    const image = await ProductImage.create({ product: product._id, url: uploaded.url, publicId: input.public_id || uploaded.public_id, storageKey: input.storage_key, alt: input.alt, sortOrder: input.sort_order ?? existing, isPrimary: Boolean(input.is_primary || existing === 0) });
    return imageView(image);
  }

  async removeImage(sellerId: string, id: string, imageId: string) {
    const product = await this.owned(sellerId, id); const image = await ProductImage.findOneAndDelete({ _id: imageId, product: product._id }); if (!image) throw new ApiError(404, "Listing image not found", "LISTING_IMAGE_NOT_FOUND");
    await UploadService.destroy(image.publicId); if (image.isPrimary) { const next = await ProductImage.findOne({ product: product._id }).sort({ sortOrder: 1, createdAt: 1 }); if (next) { next.isPrimary = true; await next.save(); } }
    return { id: imageId, message: "Listing image deleted" };
  }
}

export default new SellerListingService();
