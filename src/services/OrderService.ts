import crypto from "crypto";
import mongoose from "mongoose";
import CartItem from "../models/CartItem";
import Order, { OrderStatus } from "../models/Order";
import OrderItem, { SellerFulfillmentStatus } from "../models/OrderItem";
import Payment from "../models/Payment";
import Product from "../models/Product";
import PromoCode from "../models/PromoCode";
import CartService from "./CartService";
import CheckoutService from "./CheckoutService";
import PaymentService from "./PaymentService";
import { ApiError } from "../utils/apiErrors";

const PRODUCT_FIELDS = "name sku seller price currency stock availability status isActive isFlashSale flashSalePrice flashSaleStartsAt flashSaleEndsAt";
const transitions: Record<string, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"], confirmed: ["processing", "cancelled"], processing: ["shipped", "cancelled"],
  shipped: ["delivered"], delivered: ["completed", "returned"], completed: ["returned", "refunded"],
  cancelled: ["refunded"], returned: ["refunded"], refunded: [],
};

function money(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function price(product: any) {
  const now = Date.now();
  return product.isFlashSale && product.flashSalePrice !== undefined
    && (!product.flashSaleStartsAt || new Date(product.flashSaleStartsAt).getTime() <= now)
    && (!product.flashSaleEndsAt || new Date(product.flashSaleEndsAt).getTime() >= now)
    ? product.flashSalePrice : product.price;
}
function address(value: any) {
  return { recipient_name: value.recipientName, phone: value.phone, address_line1: value.addressLine1, address_line2: value.addressLine2, city: value.city, state: value.state, postal_code: value.postalCode, country: value.country, landmark: value.landmark };
}
function serialize(order: any, items: any[] = []) {
  return {
    id: String(order._id), order_number: order.orderNumber, status: order.status, payment_status: order.paymentStatus,
    subtotal: order.subtotal, discount: order.discount, shipping_fee: order.shippingFee, service_fee: order.serviceFee,
    total: order.total, currency: order.currency, promo_code: order.promoCode, shipping_address: address(order.shippingAddress),
    tracking_number: order.trackingNumber, carrier: order.carrier, estimated_delivery: order.estimatedDelivery, paid_at: order.paidAt,
    items: items.map((item) => ({ id: String(item._id), product_id: String(item.product), seller_id: String(item.seller), product: item.productSnapshot, quantity: item.quantity, unit_price: item.unitPrice, line_total: item.lineTotal, fulfillment_status: item.fulfillmentStatus, fulfillment_timeline: (item.fulfillmentTimeline && item.fulfillmentTimeline.length > 0 ? item.fulfillmentTimeline : [{ status: "confirmed", note: "Order confirmed", createdAt: order.createdAt }]).map((event: any) => ({ status: event.status, note: event.note, created_at: event.createdAt })) })),
    timeline: (order.timeline || []).map((event: any) => ({ status: event.status, note: event.note, created_at: event.createdAt })),
    created_at: order.createdAt, updated_at: order.updatedAt,
  };
}

class OrderService {
  private async own(userId: string, orderId: string) {
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) throw new ApiError(404, "Order not found", "ORDER_NOT_FOUND");
    return order;
  }
  private async details(order: any) { return serialize(order, await OrderItem.find({ order: order._id }).lean()); }
  private transition(current: OrderStatus, next: OrderStatus) {
    if (!transitions[current]?.includes(next)) throw new ApiError(409, `Order cannot transition from ${current} to ${next}`, "INVALID_ORDER_TRANSITION");
  }

  async list(userId: string, query: { status?: OrderStatus; page?: number; per_page?: number }) {
    const page = query.page || 1, perPage = query.per_page || 20;
    const filter: Record<string, unknown> = { user: userId }; if (query.status) filter.status = query.status;
    const [total, orders] = await Promise.all([Order.countDocuments(filter), Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean()]);
    return { orders: await Promise.all(orders.map((order) => this.details(order))), meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) } };
  }
  async get(userId: string, orderId: string) { return this.details(await this.own(userId, orderId)); }

  async create(userId: string, quoteId: string, reference: string) {
    const quote = await CheckoutService.getOpenQuote(userId, quoteId);
    const payment = await PaymentService.ensureSuccessful(userId, reference);
    if (String(payment.quote) !== String(quote._id)) throw new ApiError(409, "Payment does not belong to this checkout quote", "PAYMENT_QUOTE_MISMATCH");
    const cart = await CartItem.find({ user: userId, _id: { $in: quote.items.map((item) => item.cartItemId) } }).populate({ path: "product", select: PRODUCT_FIELDS }).lean();
    if (cart.length !== quote.items.length) throw new ApiError(409, "Your cart changed. Please request a new quote", "CART_CHANGED");
    const byId = new Map(cart.map((item) => [String(item._id), item]));
    for (const item of quote.items) {
      const cartItem = byId.get(String(item.cartItemId)) as any, product = cartItem?.product;
      if (!cartItem || cartItem.quantity !== item.quantity || !product || product.status !== "published" || !product.isActive || product.availability !== "in_stock" || product.stock < item.quantity || money(price(product)) !== money(item.unitPrice)) {
        throw new ApiError(409, "Cart prices or stock changed. Please request a new quote", "QUOTE_STALE", { product_id: item.productId });
      }
    }
    const session = await mongoose.startSession(); let orderId = "";
    try {
      await session.withTransaction(async () => {
        const [order] = await Order.create([{
          user: userId, orderNumber: `FM-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`, quote: quote._id, payment: payment._id,
          shippingAddress: quote.addressSnapshot, promoCode: quote.promoCode, subtotal: quote.subtotal, discount: quote.discount,
          shippingFee: quote.shippingFee, serviceFee: quote.serviceFee, total: quote.total, currency: quote.currency,
          status: "confirmed", paymentStatus: "paid", paidAt: payment.paidAt || new Date(),
          timeline: [{ status: "confirmed", note: "Payment confirmed", actor: userId, createdAt: new Date() }],
        }], { session });
        orderId = String(order._id);
        for (const item of quote.items) {
          const product = await Product.findOneAndUpdate({ _id: item.productId, status: "published", isActive: true, availability: "in_stock", stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } }, { new: true, session }).lean();
          if (!product) throw new ApiError(409, "Product stock changed. Please request a new quote", "STOCK_CHANGED");
          if (product.stock === 0) await Product.updateOne({ _id: product._id }, { $set: { availability: "out_of_stock" } }, { session });
          await OrderItem.create([{ order: order._id, product: item.productId, seller: item.sellerId, productSnapshot: { name: item.name, sku: item.sku }, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: item.lineTotal, fulfillmentTimeline: [{ status: "confirmed", note: "Payment confirmed", actor: userId, createdAt: new Date() }] }], { session });
        }
        if (quote.promoCode) {
          const promo = await PromoCode.findOneAndUpdate({ code: quote.promoCode, isActive: true, $or: [{ usageLimit: { $exists: false } }, { $expr: { $lt: ["$usedCount", "$usageLimit"] } }] }, { $inc: { usedCount: 1 } }, { new: true, session });
          if (!promo) throw new ApiError(409, "Promo code is no longer available", "PROMO_CODE_EXHAUSTED");
        }
        await Payment.updateOne({ _id: payment._id, user: userId }, { $set: { order: order._id, status: "success" } }, { session });
        await quote.updateOne({ $set: { status: "used" } }, { session });
        await CartItem.deleteMany({ user: userId, _id: { $in: quote.items.map((item) => item.cartItemId) } }, { session });
      });
    } finally { await session.endSession(); }
    return this.get(userId, orderId);
  }

  async cancel(userId: string, orderId: string, reason?: string) {
    const order = await this.own(userId, orderId); this.transition(order.status, "cancelled");
    const items = await OrderItem.find({ order: order._id }).lean(); const session = await mongoose.startSession();
    try { await session.withTransaction(async () => {
      for (const item of items) { const product = await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } }, { new: true, session }).lean(); if (product && product.stock > 0 && product.availability === "out_of_stock") await Product.updateOne({ _id: product._id }, { $set: { availability: "in_stock" } }, { session }); }
      order.status = "cancelled"; order.cancellationReason = reason; order.timeline.push({ status: "cancelled", note: reason || "Cancelled by buyer", actor: new mongoose.Types.ObjectId(userId), createdAt: new Date() }); await order.save({ session });
    }); } finally { await session.endSession(); }
    return this.get(userId, orderId);
  }

  private sellerStatus(items: any[]): SellerFulfillmentStatus {
    if (items.length > 0 && items.every((item) => item.fulfillmentStatus === "cancelled")) return "cancelled";
    const active = items.filter((item) => item.fulfillmentStatus !== "cancelled");
    if (active.length > 0 && active.every((item) => item.fulfillmentStatus === "delivered")) return "delivered";
    if (active.some((item) => item.fulfillmentStatus === "shipped")) return "shipped";
    if (active.some((item) => item.fulfillmentStatus === "processing")) return "processing";
    return "confirmed";
  }

  private async sellerDetails(sellerId: string, orderId: string, order?: any) {
    const sellerItems = await OrderItem.find({ order: orderId, seller: sellerId }).lean();
    if (sellerItems.length === 0) throw new ApiError(404, "Seller order not found", "ORDER_NOT_FOUND");
    const parent = order || await Order.findById(orderId);
    if (!parent) throw new ApiError(404, "Order not found", "ORDER_NOT_FOUND");
    const result = serialize(parent, sellerItems);
    const status = this.sellerStatus(sellerItems);
    return { ...result, status, seller_status: status, parent_status: parent.status };
  }

  async sellerList(sellerId: string, query: { status?: SellerFulfillmentStatus; page?: number; per_page?: number }) {
    const page = query.page || 1;
    const perPage = query.per_page || 20;
    const itemFilter: Record<string, unknown> = { seller: sellerId };
    if (query.status) itemFilter.fulfillmentStatus = query.status;
    const sellerItems = await OrderItem.find(itemFilter).select("order").lean();
    const orderIds = [...new Set(sellerItems.map((item) => String(item.order)))];
    const filter = { _id: { $in: orderIds } };
    const [total, orders] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean(),
    ]);
    return {
      orders: await Promise.all(orders.map((order) => this.sellerDetails(sellerId, String(order._id), order))),
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    };
  }

  async sellerGet(sellerId: string, orderId: string) {
    return this.sellerDetails(sellerId, orderId);
  }

  private validateSellerTransition(current: SellerFulfillmentStatus, next: SellerFulfillmentStatus) {
    const allowed: Record<SellerFulfillmentStatus, SellerFulfillmentStatus[]> = {
      confirmed: ["processing"],
      processing: ["shipped"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: [],
    };
    if (!allowed[current].includes(next)) {
      throw new ApiError(409, `Seller order cannot transition from ${current} to ${next}`, "INVALID_ORDER_TRANSITION");
    }
  }

  private async syncParentStatus(
    order: any,
    items: any[],
    actor: string,
    note: string | undefined,
    session: mongoose.ClientSession
  ) {
    if (["completed", "returned", "refunded"].includes(order.status)) return;
    const active = items.filter((item) => item.fulfillmentStatus !== "cancelled");
    const next: OrderStatus = active.length === 0
      ? "cancelled"
      : active.every((item) => item.fulfillmentStatus === "delivered")
        ? "delivered"
        : active.some((item) => item.fulfillmentStatus === "shipped")
          ? "shipped"
          : active.some((item) => item.fulfillmentStatus === "processing")
            ? "processing"
            : "confirmed";
    if (next !== order.status) {
      order.status = next;
      order.timeline.push({
        status: next,
        note: note || `Seller fulfillment updated to ${next}`,
        actor: new mongoose.Types.ObjectId(actor),
        createdAt: new Date(),
      });
      await order.save({ session });
    }
  }

  async sellerUpdateStatus(sellerId: string, orderId: string, nextStatus: SellerFulfillmentStatus, note?: string) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const order = await Order.findById(orderId).session(session);
        if (!order) throw new ApiError(404, "Order not found", "ORDER_NOT_FOUND");
        const items = await OrderItem.find({ order: orderId, seller: sellerId }).session(session);
        if (items.length === 0) throw new ApiError(404, "Seller order not found", "ORDER_NOT_FOUND");
        for (const item of items) this.validateSellerTransition(item.fulfillmentStatus, nextStatus);
        const now = new Date();
        for (const item of items) {
          item.fulfillmentStatus = nextStatus;
          item.fulfillmentTimeline.push({ status: nextStatus, note, actor: new mongoose.Types.ObjectId(sellerId), createdAt: now });
          await item.save({ session });
        }
        const allItems = await OrderItem.find({ order: orderId }).session(session);
        await this.syncParentStatus(order, allItems, sellerId, note, session);
      });
    } finally {
      await session.endSession();
    }
    return this.sellerDetails(sellerId, orderId);
  }

  async sellerCancel(sellerId: string, orderId: string, reason?: string) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const order = await Order.findById(orderId).session(session);
        if (!order) throw new ApiError(404, "Order not found", "ORDER_NOT_FOUND");
        const items = await OrderItem.find({ order: orderId, seller: sellerId }).session(session);
        if (items.length === 0) throw new ApiError(404, "Seller order not found", "ORDER_NOT_FOUND");
        for (const item of items) {
          if (!["confirmed", "processing"].includes(item.fulfillmentStatus)) {
            throw new ApiError(409, "Only confirmed or processing seller items can be cancelled", "INVALID_ORDER_TRANSITION");
          }
        }
        const now = new Date();
        for (const item of items) {
          item.fulfillmentStatus = "cancelled";
          item.fulfillmentTimeline.push({
            status: "cancelled",
            note: reason || "Cancelled by seller",
            actor: new mongoose.Types.ObjectId(sellerId),
            createdAt: now,
          });
          await item.save({ session });
          const product = await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } }, { new: true, session }).lean();
          if (product && product.stock > 0 && product.availability === "out_of_stock") {
            await Product.updateOne({ _id: product._id }, { $set: { availability: "in_stock" } }, { session });
          }
        }
        const allItems = await OrderItem.find({ order: orderId }).session(session);
        await this.syncParentStatus(order, allItems, sellerId, reason || "Cancelled by seller", session);
      });
    } finally {
      await session.endSession();
    }
    return this.sellerDetails(sellerId, orderId);
  }

  async sellerTimeline(sellerId: string, orderId: string) {
    const order = await Order.findById(orderId).lean();
    if (!order) throw new ApiError(404, "Order not found", "ORDER_NOT_FOUND");
    const items = await OrderItem.find({ order: orderId, seller: sellerId }).lean();
    if (items.length === 0) throw new ApiError(404, "Seller order not found", "ORDER_NOT_FOUND");
    const timeline = items
      .flatMap((item) => (item.fulfillmentTimeline && item.fulfillmentTimeline.length > 0 ? item.fulfillmentTimeline : [{ status: "confirmed", note: "Order confirmed", createdAt: order.createdAt }]).map((event) => ({
        status: event.status,
        note: event.note,
        item_id: String(item._id),
        created_at: event.createdAt,
      })))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return {
      order_id: String(order._id),
      order_number: order.orderNumber,
      status: this.sellerStatus(items),
      parent_status: order.status,
      timeline,
    };
  }

  async reorder(userId: string, orderId: string) {
    const order = await this.own(userId, orderId); const items = await OrderItem.find({ order: order._id }).lean(); const added: string[] = [], unavailable: Record<string, unknown>[] = [];
    for (const item of items) { try { await CartService.addItem(userId, String(item.product), item.quantity); added.push(String(item.product)); } catch { unavailable.push({ product_id: String(item.product), name: item.productSnapshot.name, requested_quantity: item.quantity }); } }
    return { added_product_ids: added, unavailable, cart: await CartService.getCart(userId) };
  }

  async returnOrder(userId: string, orderId: string, reason: string) { const order = await this.own(userId, orderId); this.transition(order.status, "returned"); order.status = "returned"; order.returnReason = reason; order.timeline.push({ status: "returned", note: reason, actor: new mongoose.Types.ObjectId(userId), createdAt: new Date() }); await order.save(); return this.get(userId, orderId); }

  async refund(userId: string, orderId: string, reason: string) {
    const order = await this.own(userId, orderId); this.transition(order.status, "refunded"); if (!order.payment) throw new ApiError(409, "Order has no refundable payment", "PAYMENT_NOT_REFUNDABLE");
    const payment = await Payment.findOne({ _id: order.payment, user: userId }); if (!payment) throw new ApiError(404, "Payment not found", "PAYMENT_NOT_FOUND"); await PaymentService.refund(payment);
    order.status = "refunded"; order.paymentStatus = "refunded"; order.refundReason = reason; order.timeline.push({ status: "refunded", note: reason, actor: new mongoose.Types.ObjectId(userId), createdAt: new Date() }); await order.save(); return this.get(userId, orderId);
  }

  async tracking(userId: string, orderId: string) { const order = await this.own(userId, orderId); return { order_id: String(order._id), order_number: order.orderNumber, status: order.status, tracking_number: order.trackingNumber, carrier: order.carrier, estimated_delivery: order.estimatedDelivery, timeline: order.timeline.map((event) => ({ status: event.status, note: event.note, created_at: event.createdAt })) }; }
  async receipt(userId: string, orderId: string) { const order = await this.own(userId, orderId); return { receipt_number: order.orderNumber, issued_at: order.paidAt || order.createdAt, order: await this.details(order) }; }
}

export default new OrderService();
