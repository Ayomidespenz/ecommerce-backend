import mongoose from "mongoose";
import Category from "../models/Category";
import Product from "../models/Product";
import ProductImage from "../models/ProductImage";
import ProductReview from "../models/ProductReview";
import { ApiError } from "../utils/apiErrors";

interface CatalogQuery {
  q?: string;
  category_id?: string;
  brand?: string;
  price_min?: number;
  price_max?: number;
  product_type?: string;
  availability?: string;
  sort?: string;
  direction?: "asc" | "desc";
  page?: number;
  per_page?: number;
}

interface ReviewQuery {
  rating?: number;
  page?: number;
  per_page?: number;
}

const PUBLIC_PRODUCT_FILTER = { status: "published", isActive: true };

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function idOf(value: unknown): string | undefined {
  if (!value) return undefined;
  return String((value as { _id?: unknown })._id || value);
}

function serializeCategory(category: any): Record<string, unknown> {
  return {
    id: String(category._id),
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    parent_id: idOf(category.parent),
    sort_order: category.sortOrder,
  };
}

function serializeProduct(product: any, images: any[] = []): Record<string, unknown> {
  const category = product.category && typeof product.category === "object"
    ? {
        id: String(product.category._id),
        name: product.category.name,
        slug: product.category.slug,
      }
    : product.category
      ? { id: String(product.category) }
      : undefined;
  const seller = product.seller && typeof product.seller === "object"
    ? {
        id: String(product.seller._id),
        name: product.seller.name,
        avatar: product.seller.avatar,
      }
    : product.seller
      ? { id: String(product.seller) }
      : undefined;

  return {
    id: String(product._id),
    name: product.name,
    slug: product.slug,
    description: product.description,
    brand: product.brand,
    sku: product.sku,
    product_type: product.productType,
    tags: product.tags || [],
    price: product.price,
    original_price: product.originalPrice,
    currency: product.currency,
    stock: product.stock,
    availability: product.availability,
    status: product.status,
    category,
    category_id: category?.id,
    seller,
    seller_id: seller?.id,
    images: images.map((image) => ({
      id: String(image._id),
      url: image.url,
      public_id: image.publicId,
      storage_key: image.storageKey,
      alt: image.alt,
      sort_order: image.sortOrder,
      is_primary: image.isPrimary,
    })),
    is_featured: product.isFeatured,
    is_flash_sale: product.isFlashSale,
    flash_sale_price: product.flashSalePrice,
    flash_sale_starts_at: product.flashSaleStartsAt,
    flash_sale_ends_at: product.flashSaleEndsAt,
    is_exclusive_offer: product.isExclusiveOffer,
    rating_average: product.ratingAverage,
    rating_count: product.ratingCount,
    sold_count: product.soldCount,
    view_count: product.viewCount,
    published_at: product.publishedAt,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
  };
}

function serializeReview(review: any): Record<string, unknown> {
  const user = review.user && typeof review.user === "object" ? review.user : undefined;
  return {
    id: String(review._id),
    product_id: String(review.product),
    user: user
      ? { id: String(user._id), name: user.name, avatar: user.avatar }
      : { id: String(review.user) },
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    images: review.images || [],
    helpful_count: review.helpfulCount,
    created_at: review.createdAt,
    updated_at: review.updatedAt,
  };
}

class CatalogService {
  async listCategories(): Promise<Record<string, unknown>[]> {
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    return categories.map(serializeCategory);
  }

  private buildProductFilter(query: CatalogQuery, extra: Record<string, unknown> = {}): Record<string, unknown> {
    const filter: Record<string, any> = { ...PUBLIC_PRODUCT_FILTER, ...extra };

    if (query.q) {
      const expression = new RegExp(escapeRegex(query.q), "i");
      const search = { $or: [
        { name: expression },
        { brand: expression },
        { description: expression },
        { tags: expression },
      ] };
      if (filter.$or) {
        const existingOr = filter.$or;
        delete filter.$or;
        filter.$and = [{ $or: existingOr }, search];
      } else {
        filter.$or = search.$or;
      }
    }
    if (query.category_id) filter.category = new mongoose.Types.ObjectId(query.category_id);
    if (query.brand) filter.brand = new RegExp(`^${escapeRegex(query.brand)}$`, "i");
    if (query.product_type) filter.productType = query.product_type.toLowerCase();
    if (query.price_min !== undefined || query.price_max !== undefined) {
      filter.price = {};
      if (query.price_min !== undefined) filter.price.$gte = query.price_min;
      if (query.price_max !== undefined) filter.price.$lte = query.price_max;
    }
    if (query.availability === "in_stock") filter.stock = { $gt: 0 };
    else if (query.availability === "out_of_stock") filter.stock = { $lte: 0 };
    else if (query.availability) filter.availability = query.availability;

    return filter;
  }

  private sortFor(query: CatalogQuery): Record<string, 1 | -1> {
    const direction = query.direction === "asc" ? 1 : -1;
    switch (query.sort) {
      case "price":
        return { price: direction };
      case "rating":
        return { ratingAverage: direction, ratingCount: direction };
      case "sold_count":
        return { soldCount: direction };
      case "name":
        return { name: direction };
      case "newest":
      case "created_at":
      default:
        return { createdAt: direction };
    }
  }

  private async hydrateProducts(products: any[]): Promise<Record<string, unknown>[]> {
    if (products.length === 0) return [];
    const productIds = products.map((product) => product._id);
    const images = await ProductImage.find({ product: { $in: productIds } })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    const imagesByProduct = new Map<string, any[]>();
    for (const image of images) {
      const key = String(image.product);
      const list = imagesByProduct.get(key) || [];
      list.push(image);
      imagesByProduct.set(key, list);
    }
    return products.map((product) => serializeProduct(product, imagesByProduct.get(String(product._id)) || []));
  }

  private async fetchProducts(query: CatalogQuery, extra: Record<string, unknown> = {}): Promise<{ products: Record<string, unknown>[]; meta: Record<string, number> }> {
    const page = query.page || 1;
    const perPage = query.per_page || 20;
    const filter = this.buildProductFilter(query, extra);
    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort(this.sortFor(query))
        .skip((page - 1) * perPage)
        .limit(perPage)
        .populate({ path: "category", select: "name slug" })
        .populate({ path: "seller", select: "name avatar" })
        .lean(),
    ]);

    return {
      products: await this.hydrateProducts(products),
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    };
  }

  async listProducts(query: CatalogQuery) {
    return this.fetchProducts(query);
  }

  async getProduct(productId: string): Promise<Record<string, unknown>> {
    const product = await Product.findOne({ _id: productId, ...PUBLIC_PRODUCT_FILTER })
      .populate({ path: "category", select: "name slug" })
      .populate({ path: "seller", select: "name avatar" })
      .lean();
    if (!product) throw new ApiError(404, "Product not found", "PRODUCT_NOT_FOUND");
    const [result] = await this.hydrateProducts([product]);
    return result;
  }

  async getCollection(kind: "featured" | "flash_sales" | "best_selling" | "exclusive_offers" | "recommended", query: CatalogQuery) {
    const extra: Record<string, unknown> = {};
    if (kind === "featured") extra.isFeatured = true;
    if (kind === "flash_sales") {
      extra.isFlashSale = true;
      const now = new Date();
      extra.$or = [
        { flashSaleStartsAt: { $exists: false } },
        { flashSaleStartsAt: { $lte: now }, flashSaleEndsAt: { $gte: now } },
      ];
    }
    if (kind === "best_selling") extra.soldCount = { $gt: 0 };
    if (kind === "exclusive_offers") extra.isExclusiveOffer = true;

    const collectionQuery = { ...query };
    if (kind === "best_selling" || kind === "recommended") {
      collectionQuery.sort = "sold_count";
      collectionQuery.direction = "desc";
    }
    if (kind === "recommended") {
      delete extra.soldCount;
      collectionQuery.sort = "rating";
    }
    return this.fetchProducts(collectionQuery, extra);
  }

  async listReviews(productId: string, query: ReviewQuery) {
    const exists = await Product.exists({ _id: productId, ...PUBLIC_PRODUCT_FILTER });
    if (!exists) throw new ApiError(404, "Product not found", "PRODUCT_NOT_FOUND");
    const page = query.page || 1;
    const perPage = query.per_page || 20;
    const filter: Record<string, unknown> = { product: productId, status: "approved" };
    if (query.rating) filter.rating = query.rating;
    const [total, reviews, summary] = await Promise.all([
      ProductReview.countDocuments(filter),
      ProductReview.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .populate({ path: "user", select: "name avatar" })
        .lean(),
      ProductReview.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(productId), status: "approved" } },
        { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),
    ]);
    return {
      reviews: reviews.map(serializeReview),
      summary: { average: summary[0]?.average || 0, count: summary[0]?.count || 0 },
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    };
  }

  async createReview(productId: string, userId: string, input: { rating: number; title?: string; comment?: string; body?: string; review?: string; images?: string[] }) {
    const product = await Product.findOne({ _id: productId, ...PUBLIC_PRODUCT_FILTER });
    if (!product) throw new ApiError(404, "Product not found", "PRODUCT_NOT_FOUND");
    const comment = input.comment || input.body || input.review || "";
    const review = await ProductReview.create({
      product: productId,
      user: userId,
      rating: input.rating,
      title: input.title,
      comment,
      images: input.images || [],
      status: "approved",
    });
    await this.recalculateRating(productId);
    const saved = await ProductReview.findById(review._id).populate({ path: "user", select: "name avatar" }).lean();
    return serializeReview(saved);
  }

  private async recalculateRating(productId: string): Promise<void> {
    const [summary] = await ProductReview.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId), status: "approved" } },
      { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    await Product.findByIdAndUpdate(productId, {
      ratingAverage: summary?.average || 0,
      ratingCount: summary?.count || 0,
    });
  }

  async recordView(productId: string): Promise<{ product_id: string; view_count: number }> {
    const product = await Product.findOneAndUpdate(
      { _id: productId, ...PUBLIC_PRODUCT_FILTER },
      { $inc: { viewCount: 1 } },
      { new: true, projection: { viewCount: 1 } }
    ).lean();
    if (!product) throw new ApiError(404, "Product not found", "PRODUCT_NOT_FOUND");
    return { product_id: productId, view_count: product.viewCount };
  }

  async searchSuggestions(q: string): Promise<{ suggestions: string[] }> {
    const expression = new RegExp(escapeRegex(q), "i");
    const products = await Product.find({
      ...PUBLIC_PRODUCT_FILTER,
      $or: [{ name: expression }, { brand: expression }, { tags: expression }],
    })
      .select("name brand tags")
      .limit(20)
      .lean();
    const suggestions = new Set<string>();
    for (const product of products) {
      if (product.name && expression.test(product.name)) suggestions.add(product.name);
      if (product.brand && expression.test(product.brand)) suggestions.add(product.brand);
      for (const tag of product.tags || []) {
        if (expression.test(tag)) suggestions.add(tag);
      }
    }
    return { suggestions: Array.from(suggestions).slice(0, 10) };
  }
}

export default new CatalogService();
