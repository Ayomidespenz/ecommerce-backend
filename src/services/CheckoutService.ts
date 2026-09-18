import Address from "../models/Address";
import CartItem from "../models/CartItem";
import CheckoutQuote, { AddressSnapshot, QuoteItemSnapshot } from "../models/CheckoutQuote";
import Order from "../models/Order";
import PromoCode from "../models/PromoCode";
import Product from "../models/Product";
import { ApiError } from "../utils/apiErrors";

const PRODUCT_FIELDS = "name sku seller price originalPrice currency stock availability status isActive isFlashSale flashSalePrice flashSaleStartsAt flashSaleEndsAt";
const QUOTE_TTL_MS = 10 * 60 * 1000;

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function currentPrice(product: any): number {
  const now = Date.now();
  const active = product.isFlashSale && product.flashSalePrice !== undefined
    && (!product.flashSaleStartsAt || new Date(product.flashSaleStartsAt).getTime() <= now)
    && (!product.flashSaleEndsAt || new Date(product.flashSaleEndsAt).getTime() >= now);
  return active ? product.flashSalePrice : product.price;
}

function snapshotAddress(address: any): AddressSnapshot {
  return {
    recipientName: address.recipientName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    landmark: address.landmark,
  };
}

class CheckoutService {
  private async getAddress(userId: string, addressId?: string) {
    const address = addressId
      ? await Address.findOne({ _id: addressId, user: userId }).lean()
      : await Address.findOne({ user: userId, isDefault: true }).lean();
    if (!address) throw new ApiError(400, "A valid delivery address is required", "ADDRESS_REQUIRED");
    return address;
  }

  private async getPromo(code: string | undefined, userId: string, subtotal: number) {
    if (!code) return { promo: undefined, discount: 0 };
    const promo = await PromoCode.findOne({ code: code.trim().toUpperCase(), isActive: true }).lean();
    if (!promo) throw new ApiError(400, "Promo code is invalid or unavailable", "PROMO_CODE_INVALID");
    const now = Date.now();
    if (promo.startsAt && promo.startsAt.getTime() > now) throw new ApiError(400, "Promo code is not active yet", "PROMO_CODE_NOT_STARTED");
    if (promo.expiresAt && promo.expiresAt.getTime() < now) throw new ApiError(400, "Promo code has expired", "PROMO_CODE_EXPIRED");
    if (promo.usageLimit !== undefined && promo.usedCount >= promo.usageLimit) throw new ApiError(400, "Promo code usage limit has been reached", "PROMO_CODE_EXHAUSTED");
    if (promo.discountType === "percentage" && promo.discountValue > 100) throw new ApiError(400, "Promo code discount is invalid", "PROMO_CODE_INVALID");
    if (subtotal < promo.minOrderAmount) throw new ApiError(400, `Minimum order amount for this promo is ${promo.minOrderAmount}`, "PROMO_MINIMUM_NOT_MET");
    if (promo.perUserLimit !== undefined) {
      const usedByUser = await Order.countDocuments({ user: userId, promoCode: promo.code });
      if (usedByUser >= promo.perUserLimit) throw new ApiError(400, "You have already used this promo code", "PROMO_USER_LIMIT_REACHED");
    }
    let discount = promo.discountType === "percentage"
      ? subtotal * (promo.discountValue / 100)
      : promo.discountValue;
    if (promo.maxDiscount !== undefined) discount = Math.min(discount, promo.maxDiscount);
    discount = Math.min(roundMoney(discount), subtotal);
    return { promo, discount };
  }

  async calculate(userId: string, addressId?: string, promoCode?: string) {
    const address = await this.getAddress(userId, addressId);
    const cartItems = await CartItem.find({ user: userId })
      .populate({ path: "product", select: PRODUCT_FIELDS })
      .lean();
    if (cartItems.length === 0) throw new ApiError(400, "Your cart is empty", "CART_EMPTY");

    const items: QuoteItemSnapshot[] = [];
    let subtotal = 0;
    let currency = "NGN";
    for (const cartItem of cartItems) {
      const product = cartItem.product as any;
      if (!product || product.status !== "published" || !product.isActive || product.availability !== "in_stock" || product.stock < cartItem.quantity) {
        throw new ApiError(409, `Product ${product?.name || "in your cart"} is no longer available in the requested quantity`, "CART_REQUIRES_UPDATE", {
          product_id: product?._id || cartItem.product,
          requested_quantity: cartItem.quantity,
          available_stock: product?.stock || 0,
        });
      }
      const unitPrice = roundMoney(currentPrice(product));
      const lineTotal = roundMoney(unitPrice * cartItem.quantity);
      currency = product.currency || currency;
      subtotal += lineTotal;
      items.push({
        cartItemId: cartItem._id,
        productId: product._id,
        sellerId: product.seller,
        name: product.name,
        sku: product.sku,
        quantity: cartItem.quantity,
        unitPrice,
        lineTotal,
        currency: product.currency || currency,
      });
    }
    subtotal = roundMoney(subtotal);
    const { promo, discount } = await this.getPromo(promoCode, userId, subtotal);
    const shippingFee = roundMoney(Number(process.env.DEFAULT_SHIPPING_FEE || 1500));
    const serviceFeePercent = Number(process.env.SERVICE_FEE_PERCENT || 0);
    const serviceFee = roundMoney(Math.max(0, subtotal - discount) * (serviceFeePercent / 100));
    const total = roundMoney(Math.max(0, subtotal - discount) + shippingFee + serviceFee);
    return {
      address,
      addressSnapshot: snapshotAddress(address),
      items,
      promo,
      promoCode: promo?.code,
      subtotal,
      discount,
      shippingFee,
      serviceFee,
      total,
      currency,
    };
  }

  async createQuote(userId: string, addressId: string, promoCode?: string) {
    const calculation = await this.calculate(userId, addressId, promoCode);
    const quote = await CheckoutQuote.create({
      user: userId,
      address: addressId,
      addressSnapshot: calculation.addressSnapshot,
      items: calculation.items,
      promoCode: calculation.promoCode,
      subtotal: calculation.subtotal,
      discount: calculation.discount,
      shippingFee: calculation.shippingFee,
      serviceFee: calculation.serviceFee,
      total: calculation.total,
      currency: calculation.currency,
      status: "open",
      expiresAt: new Date(Date.now() + QUOTE_TTL_MS),
    });
    return {
      quote_id: String(quote._id),
      expires_at: quote.expiresAt,
      subtotal: quote.subtotal,
      discount: quote.discount,
      shipping_fee: quote.shippingFee,
      service_fee: quote.serviceFee,
      total: quote.total,
      currency: quote.currency,
      promo_code: quote.promoCode,
      items: calculation.items,
      address: calculation.addressSnapshot,
    };
  }

  async validatePromo(userId: string, code: string, addressId?: string) {
    const calculation = await this.calculate(userId, addressId, code);
    return {
      valid: true,
      code: calculation.promoCode,
      discount: calculation.discount,
      subtotal: calculation.subtotal,
      shipping_fee: calculation.shippingFee,
      service_fee: calculation.serviceFee,
      total: calculation.total,
      currency: calculation.currency,
    };
  }

  async getOpenQuote(userId: string, quoteId: string) {
    const quote = await CheckoutQuote.findOne({ _id: quoteId, user: userId });
    if (!quote) throw new ApiError(404, "Checkout quote not found", "QUOTE_NOT_FOUND");
    if (quote.status !== "open") throw new ApiError(409, "Checkout quote is no longer usable", "QUOTE_NOT_OPEN");
    if (quote.expiresAt.getTime() <= Date.now()) {
      quote.status = "expired";
      await quote.save();
      throw new ApiError(409, "Checkout quote has expired", "QUOTE_EXPIRED");
    }
    return quote;
  }
}

export default new CheckoutService();
