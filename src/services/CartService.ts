import CartItem from "../models/CartItem";
import Product from "../models/Product";
import ProductImage from "../models/ProductImage";
import { ApiError } from "../utils/apiErrors";

const PRODUCT_FIELDS = "name slug brand price originalPrice currency stock availability status isActive isFlashSale flashSalePrice flashSaleStartsAt flashSaleEndsAt ratingAverage ratingCount";

function isFlashSaleActive(product: any, now = new Date()): boolean {
  if (!product.isFlashSale || product.flashSalePrice === undefined) return false;
  if (product.flashSaleStartsAt && new Date(product.flashSaleStartsAt).getTime() > now.getTime()) return false;
  if (product.flashSaleEndsAt && new Date(product.flashSaleEndsAt).getTime() < now.getTime()) return false;
  return true;
}

function currentUnitPrice(product: any): number {
  return isFlashSaleActive(product) ? product.flashSalePrice : product.price;
}

function productStatus(product: any, quantity: number): { code: string; message: string; available: boolean } {
  if (!product || product.status !== "published" || !product.isActive) {
    return { code: "PRODUCT_UNAVAILABLE", message: "This product is no longer available", available: false };
  }
  if (product.availability === "discontinued") {
    return { code: "PRODUCT_DISCONTINUED", message: "This product has been discontinued", available: false };
  }
  if (product.availability === "preorder") {
    return { code: "PRODUCT_PREORDER", message: "This product is not currently available for cart purchase", available: false };
  }
  if (product.stock <= 0) {
    return { code: "OUT_OF_STOCK", message: "This product is out of stock", available: false };
  }
  if (quantity > product.stock) {
    return { code: "INSUFFICIENT_STOCK", message: `Only ${product.stock} item(s) are currently available`, available: false };
  }
  return { code: "AVAILABLE", message: "Available", available: true };
}

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

class CartService {
  private async productForCart(productId: string): Promise<any> {
    const product = await Product.findById(productId).select(PRODUCT_FIELDS).lean();
    if (!product) throw new ApiError(404, "Product not found", "PRODUCT_NOT_FOUND");
    return product;
  }

  private async imagesFor(products: any[]): Promise<Map<string, any[]>> {
    const ids = products.filter(Boolean).map((product) => product._id);
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

  private async serializeItem(item: any, images?: Map<string, any[]>): Promise<Record<string, unknown>> {
    const product = item.product;
    const status = productStatus(product, item.quantity);
    const unitPrice = product ? currentUnitPrice(product) : 0;
    const lineTotal = product ? unitPrice * item.quantity : 0;
    return {
      id: String(item._id),
      product_id: product ? String(product._id) : String(item.product),
      product: serializeProduct(product, product ? images?.get(String(product._id)) || [] : []),
      quantity: item.quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
      currency: product?.currency || "NGN",
      is_available: status.available,
      availability_status: status.code,
      availability_message: status.message,
      available_stock: product?.stock ?? 0,
      included_in_subtotal: status.available,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }

  async getCart(userId: string) {
    const entries = await CartItem.find({ user: userId })
      .sort({ createdAt: 1 })
      .populate({ path: "product", select: PRODUCT_FIELDS })
      .lean();
    const images = await this.imagesFor(entries.map((entry) => entry.product));
    const items = await Promise.all(entries.map((entry) => this.serializeItem(entry, images)));
    const subtotal = items.reduce((sum, item) => sum + (item.included_in_subtotal ? Number(item.line_total) : 0), 0);
    const itemCount = items.reduce((sum, item) => sum + Number(item.quantity), 0);
    const invalidItemCount = items.filter((item) => !item.is_available).length;
    return {
      items,
      subtotal,
      item_count: itemCount,
      invalid_item_count: invalidItemCount,
      currency: "NGN",
    };
  }

  async addItem(userId: string, productId: string, quantity: number) {
    const product = await this.productForCart(productId);
    const existing = await CartItem.findOne({ user: userId, product: productId });
    const nextQuantity = (existing?.quantity || 0) + quantity;
    const status = productStatus(product, nextQuantity);
    if (!status.available) {
      throw new ApiError(409, status.message, status.code, {
        product_id: productId,
        requested_quantity: nextQuantity,
        available_stock: product.stock,
      });
    }

    const item = existing
      ? await CartItem.findOneAndUpdate(
          { _id: existing._id, user: userId },
          { quantity: nextQuantity },
          { new: true }
        )
      : await CartItem.create({ user: userId, product: productId, quantity });
    const images = await this.imagesFor([product]);
    return this.serializeItem({ ...item!.toObject(), product }, images);
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    const existing = await CartItem.findOne({ _id: itemId, user: userId });
    if (!existing) throw new ApiError(404, "Cart item not found", "CART_ITEM_NOT_FOUND");
    const product = await this.productForCart(String(existing.product));
    const status = productStatus(product, quantity);
    if (!status.available) {
      throw new ApiError(409, status.message, status.code, {
        product_id: String(existing.product),
        requested_quantity: quantity,
        available_stock: product.stock,
      });
    }
    existing.quantity = quantity;
    await existing.save();
    const images = await this.imagesFor([product]);
    return this.serializeItem({ ...existing.toObject(), product }, images);
  }

  async removeItem(userId: string, itemId: string): Promise<void> {
    const result = await CartItem.deleteOne({ _id: itemId, user: userId });
    if (result.deletedCount === 0) throw new ApiError(404, "Cart item not found", "CART_ITEM_NOT_FOUND");
  }

  async clearCart(userId: string): Promise<void> {
    await CartItem.deleteMany({ user: userId });
  }
}

export default new CartService();
