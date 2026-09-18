import Favorite from "../models/Favorite";
import Product from "../models/Product";
import ProductImage from "../models/ProductImage";
import RecentlyViewed from "../models/RecentlyViewed";
import { ApiError } from "../utils/apiErrors";

interface CollectionQuery {
  page?: number;
  per_page?: number;
}

const PUBLIC_PRODUCT_FILTER = { status: "published", isActive: true };

function serializeProduct(product: any, images: any[] = []): Record<string, unknown> | null {
  if (!product) return null;
  return {
    id: String(product._id),
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    price: product.price,
    original_price: product.originalPrice,
    currency: product.currency,
    stock: product.stock,
    availability: product.availability,
    rating_average: product.ratingAverage,
    rating_count: product.ratingCount,
    images: images.map((image) => ({
      id: String(image._id),
      url: image.url,
      alt: image.alt,
      is_primary: image.isPrimary,
    })),
  };
}

class PersonalizationService {
  private async getPublicProduct(productId: string): Promise<void> {
    const exists = await Product.exists({ _id: productId, ...PUBLIC_PRODUCT_FILTER });
    if (!exists) throw new ApiError(404, "Product not found", "PRODUCT_NOT_FOUND");
  }

  private async imagesFor(products: any[]): Promise<Map<string, any[]>> {
    const ids = products
      .filter((product) => product)
      .map((product) => product._id);
    const images = ids.length
      ? await ProductImage.find({ product: { $in: ids } }).sort({ sortOrder: 1, createdAt: 1 }).lean()
      : [];
    const byProduct = new Map<string, any[]>();
    for (const image of images) {
      const key = String(image.product);
      const list = byProduct.get(key) || [];
      list.push(image);
      byProduct.set(key, list);
    }
    return byProduct;
  }

  private async serializeEntries(entries: any[], type: "favorite" | "recently_viewed") {
    const products = entries.map((entry) => entry.product);
    const images = await this.imagesFor(products);
    return entries.map((entry) => {
      const product = entry.product;
      const productId = product?._id || entry.product;
      const base = {
        id: String(entry._id),
        product_id: String(productId),
        product: serializeProduct(product, images.get(String(productId)) || []),
      };
      if (type === "favorite") {
        return { ...base, created_at: entry.createdAt };
      }
      return { ...base, viewed_at: entry.viewedAt, created_at: entry.createdAt };
    });
  }

  async listFavorites(userId: string, query: CollectionQuery) {
    const page = query.page || 1;
    const perPage = query.per_page || 20;
    const [total, entries] = await Promise.all([
      Favorite.countDocuments({ user: userId }),
      Favorite.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .populate({ path: "product", select: "name slug brand price originalPrice currency stock availability ratingAverage ratingCount" })
        .lean(),
    ]);
    return {
      favorites: await this.serializeEntries(entries, "favorite"),
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    };
  }

  async addFavorite(userId: string, productId: string) {
    await this.getPublicProduct(productId);
    await Favorite.findOneAndUpdate(
      { user: userId, product: productId },
      { $setOnInsert: { user: userId, product: productId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const entry = await Favorite.findOne({ user: userId, product: productId })
      .populate({ path: "product", select: "name slug brand price originalPrice currency stock availability ratingAverage ratingCount" })
      .lean();
    const [result] = await this.serializeEntries([entry], "favorite");
    return result;
  }

  async removeFavorite(userId: string, productId: string): Promise<void> {
    await Favorite.deleteOne({ user: userId, product: productId });
  }

  async clearFavorites(userId: string): Promise<void> {
    await Favorite.deleteMany({ user: userId });
  }

  async listRecentlyViewed(userId: string, query: CollectionQuery) {
    const page = query.page || 1;
    const perPage = query.per_page || 20;
    const [total, entries] = await Promise.all([
      RecentlyViewed.countDocuments({ user: userId }),
      RecentlyViewed.find({ user: userId })
        .sort({ viewedAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .populate({ path: "product", select: "name slug brand price originalPrice currency stock availability ratingAverage ratingCount" })
        .lean(),
    ]);
    return {
      recently_viewed: await this.serializeEntries(entries, "recently_viewed"),
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    };
  }

  async addRecentlyViewed(userId: string, productId: string) {
    await this.getPublicProduct(productId);
    await RecentlyViewed.findOneAndUpdate(
      { user: userId, product: productId },
      { $set: { viewedAt: new Date() }, $setOnInsert: { user: userId, product: productId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const entry = await RecentlyViewed.findOne({ user: userId, product: productId })
      .populate({ path: "product", select: "name slug brand price originalPrice currency stock availability ratingAverage ratingCount" })
      .lean();
    const [result] = await this.serializeEntries([entry], "recently_viewed");
    return result;
  }

  async removeRecentlyViewed(userId: string, productId: string): Promise<void> {
    await RecentlyViewed.deleteOne({ user: userId, product: productId });
  }

  async clearRecentlyViewed(userId: string): Promise<void> {
    await RecentlyViewed.deleteMany({ user: userId });
  }
}

export default new PersonalizationService();
