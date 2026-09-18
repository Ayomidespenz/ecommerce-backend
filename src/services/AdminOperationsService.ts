import mongoose from "mongoose";
import Product from "../models/Product";
import SellerVerification from "../models/SellerVerification";
import VerificationDocument from "../models/VerificationDocument";
import User from "../models/User";
import Order from "../models/Order";
import OrderItem from "../models/OrderItem";
import Payment from "../models/Payment";
import SupportTicket from "../models/SupportTicket";
import SupportTicketMessage from "../models/SupportTicketMessage";
import Withdrawal from "../models/Withdrawal";
import PaymentService from "./PaymentService";
import { ApiError } from "../utils/apiErrors";

const id = (value: unknown) => (value ? String(value) : undefined);

// Keep admin review metadata backward-compatible with existing product documents.
(Product.schema as any).add({
  adminReviewStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  adminReviewReason: { type: String, maxlength: 500 },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
});

function listingView(listing: any) {
  const seller = listing.seller && typeof listing.seller === "object" ? listing.seller : undefined;
  const category = listing.category && typeof listing.category === "object" ? listing.category : undefined;
  return { id: id(listing._id), name: listing.name, slug: listing.slug, status: listing.status,
    is_active: listing.isActive, review_status: listing.adminReviewStatus || "pending",
    review_reason: listing.adminReviewReason, reviewed_by: id(listing.reviewedBy), reviewed_at: listing.reviewedAt,
    seller: seller ? { id: id(seller._id), name: seller.name, email: seller.email } : id(listing.seller),
    category: category ? { id: id(category._id), name: category.name } : id(listing.category),
    price: listing.price, stock: listing.stock, created_at: listing.createdAt, updated_at: listing.updatedAt };
}

function verificationView(verification: any, documents: any[] = []) {
  const seller = verification.seller && typeof verification.seller === "object" ? verification.seller : undefined;
  return { id: id(verification._id), status: verification.status, business_name: verification.businessName,
    business_type: verification.businessType, business_address: verification.businessAddress,
    rejection_reason: verification.rejectionReason, submitted_at: verification.submittedAt, reviewed_at: verification.reviewedAt,
    seller: seller ? { id: id(seller._id), name: seller.name, email: seller.email, phone: seller.phone } : id(verification.seller),
    documents: documents.map((document) => ({ id: id(document._id), type: document.type, url: document.url,
      status: document.status, created_at: document.createdAt, updated_at: document.updatedAt })),
    created_at: verification.createdAt, updated_at: verification.updatedAt };
}

function orderView(order: any, items: any[] = []) {
  const user = order.user && typeof order.user === "object" ? order.user : undefined;
  const payment = order.payment && typeof order.payment === "object" ? order.payment : undefined;
  return { id: id(order._id), order_number: order.orderNumber, status: order.status, payment_status: order.paymentStatus,
    total: order.total, currency: order.currency, tracking_number: order.trackingNumber, carrier: order.carrier,
    estimated_delivery: order.estimatedDelivery, cancellation_reason: order.cancellationReason,
    return_reason: order.returnReason, refund_reason: order.refundReason,
    user: user ? { id: id(user._id), name: user.name, email: user.email, phone: user.phone } : id(order.user),
    payment: payment ? { id: id(payment._id), reference: payment.reference, status: payment.status, amount: payment.amount, currency: payment.currency } : id(order.payment),
    timeline: (order.timeline || []).map((entry: any) => ({ status: entry.status, note: entry.note, actor: id(entry.actor), created_at: entry.createdAt })),
    items: items.map((item) => { const seller = item.seller && typeof item.seller === "object" ? item.seller : undefined;
      const product = item.product && typeof item.product === "object" ? item.product : undefined;
      return { id: id(item._id), product: product ? { id: id(product._id), name: product.name } : id(item.product),
        seller: seller ? { id: id(seller._id), name: seller.name, email: seller.email } : id(item.seller),
        product_snapshot: item.productSnapshot, quantity: item.quantity, unit_price: item.unitPrice,
        line_total: item.lineTotal, fulfillment_status: item.fulfillmentStatus }; }),
    created_at: order.createdAt, updated_at: order.updatedAt };
}

function ticketView(ticket: any, messages: any[] = []) {
  const user = ticket.user && typeof ticket.user === "object" ? ticket.user : undefined;
  return { id: id(ticket._id), ticket_number: ticket.ticketNumber, subject: ticket.subject, category: ticket.category,
    status: ticket.status, priority: ticket.priority, last_message_at: ticket.lastMessageAt, closed_at: ticket.closedAt,
    user: user ? { id: id(user._id), name: user.name, email: user.email } : id(ticket.user),
    messages: messages.map((message) => ({ id: id(message._id), sender: id(message.sender), sender_role: message.senderRole,
      message: message.message, attachments: message.attachments || [], created_at: message.createdAt })),
    created_at: ticket.createdAt, updated_at: ticket.updatedAt };
}

function payoutView(withdrawal: any) {
  const seller = withdrawal.seller && typeof withdrawal.seller === "object" ? withdrawal.seller : undefined;
  const bankAccount = withdrawal.bankAccount && typeof withdrawal.bankAccount === "object" ? withdrawal.bankAccount : undefined;
  return { id: id(withdrawal._id), reference: withdrawal.reference, status: withdrawal.status, amount: withdrawal.amount,
    fee: withdrawal.fee, total_debit: withdrawal.totalDebit, currency: withdrawal.currency,
    provider_transfer_code: withdrawal.providerTransferCode, failure_reason: withdrawal.failureReason, processed_at: withdrawal.processedAt,
    seller: seller ? { id: id(seller._id), name: seller.name, email: seller.email } : id(withdrawal.seller),
    bank_account: bankAccount ? { id: id(bankAccount._id), bank_name: bankAccount.bankName, account_name: bankAccount.accountName,
      account_number_last4: bankAccount.accountNumberLast4, is_verified: bankAccount.isVerified } : id(withdrawal.bankAccount),
    created_at: withdrawal.createdAt, updated_at: withdrawal.updatedAt };
}

class AdminOperationsService {
  async getListingReview(listingId: string) {
    const listing = await Product.findById(listingId).populate("seller", "name email").populate("category", "name").lean();
    if (!listing) throw new ApiError(404, "Listing not found", "LISTING_NOT_FOUND");
    return listingView(listing);
  }

  async updateListingReview(listingId: string, adminId: string, input: any) {
    const listing = await Product.findById(listingId);
    if (!listing) throw new ApiError(404, "Listing not found", "LISTING_NOT_FOUND");
    const reviewStatus = input.review_status || (["pending", "approved", "rejected"].includes(input.status) ? input.status : undefined);
    const listingStatus = input.listing_status || (["draft", "published", "paused", "archived"].includes(input.status) ? input.status : undefined);
    if (reviewStatus) {
      (listing as any).adminReviewStatus = reviewStatus;
      (listing as any).adminReviewReason = input.reason;
      (listing as any).reviewedBy = new mongoose.Types.ObjectId(adminId);
      (listing as any).reviewedAt = new Date();
      if (reviewStatus === "approved" && !listingStatus) { listing.status = "published"; listing.isActive = true; listing.publishedAt = listing.publishedAt || new Date(); }
      if (reviewStatus === "rejected" && !listingStatus) { listing.status = "paused"; listing.isActive = false; }
    }
    if (listingStatus) {
      listing.status = listingStatus;
      if (listingStatus === "published") { listing.isActive = input.is_active === undefined ? true : input.is_active; listing.publishedAt = listing.publishedAt || new Date(); }
      else if (["paused", "archived"].includes(listingStatus) && input.is_active === undefined) listing.isActive = false;
    }
    if (input.is_active !== undefined) listing.isActive = input.is_active;
    await listing.save();
    return this.getListingReview(listingId);
  }

  async getVerification(verificationId: string) {
    const verification = await SellerVerification.findById(verificationId).populate("seller", "name email phone role").lean();
    if (!verification) throw new ApiError(404, "Seller verification not found", "VERIFICATION_NOT_FOUND");
    const documents = await VerificationDocument.find({ verification: verification._id }).sort({ createdAt: 1 }).lean();
    return verificationView(verification, documents);
  }

  async updateVerification(verificationId: string, input: any) {
    const verification = await SellerVerification.findById(verificationId);
    if (!verification) throw new ApiError(404, "Seller verification not found", "VERIFICATION_NOT_FOUND");
    if (input.status === "rejected" && !input.rejection_reason) throw new ApiError(400, "A rejection reason is required", "REJECTION_REASON_REQUIRED");
    if (input.status) {
      verification.status = input.status;
      verification.reviewedAt = ["approved", "rejected"].includes(input.status) ? new Date() : verification.reviewedAt;
      if (input.status === "rejected") verification.rejectionReason = input.rejection_reason;
      if (input.status === "approved") {
        verification.rejectionReason = undefined;
        await VerificationDocument.updateMany({ verification: verification._id }, { $set: { status: "accepted" } });
        await User.updateOne({ _id: verification.seller }, { $set: { status: "active" } });
      }
      if (input.status === "rejected") await VerificationDocument.updateMany({ verification: verification._id }, { $set: { status: "rejected" } });
    }
    await verification.save();
    return this.getVerification(verificationId);
  }

  private async findOrder(orderId: string) {
    const order = await Order.findById(orderId).populate("user", "name email phone").populate("payment", "reference status amount currency");
    if (!order) throw new ApiError(404, "Order not found", "ORDER_NOT_FOUND");
    return order;
  }

  private async orderWithItems(order: any) {
    const items = await OrderItem.find({ order: order._id }).populate("seller", "name email").populate("product", "name").lean();
    return orderView(order, items);
  }

  async getOrder(orderId: string) { return this.orderWithItems(await this.findOrder(orderId)); }

  async updateOrder(orderId: string, adminId: string, input: any) {
    const order = await this.findOrder(orderId);
    if (input.status) {
      order.status = input.status;
      order.timeline.push({ status: input.status, note: input.note, actor: new mongoose.Types.ObjectId(adminId), createdAt: new Date() } as any);
    } else if (input.note) order.timeline.push({ status: order.status, note: input.note, actor: new mongoose.Types.ObjectId(adminId), createdAt: new Date() } as any);
    if (input.payment_status) order.paymentStatus = input.payment_status;
    if (input.tracking_number !== undefined) order.trackingNumber = input.tracking_number;
    if (input.carrier !== undefined) order.carrier = input.carrier;
    if (input.estimated_delivery !== undefined) order.estimatedDelivery = input.estimated_delivery;
    if (input.cancellation_reason !== undefined) order.cancellationReason = input.cancellation_reason;
    if (input.return_reason !== undefined) order.returnReason = input.return_reason;
    if (input.refund_reason !== undefined) order.refundReason = input.refund_reason;
    if (input.status === "refunded") order.paymentStatus = "refunded";
    await order.save();
    return this.getOrder(orderId);
  }

  private async paymentForRefund(resourceId: string) {
    let payment = await Payment.findById(resourceId);
    let order: any;
    if (!payment) {
      order = await Order.findById(resourceId).select("payment user total currency");
      if (order?.payment) payment = await Payment.findById(order.payment);
      if (!payment && order) throw new ApiError(409, "Order has no payment to refund", "REFUND_PAYMENT_NOT_FOUND");
    }
    if (!payment) throw new ApiError(404, "Refund payment not found", "REFUND_NOT_FOUND");
    return { payment, order };
  }

  private refundView(resourceId: string, payment: any, order?: any, statusOverride?: string, reason?: string) {
    const status = statusOverride || (payment.status === "refunded" ? "processed" : "requested");
    return { id: resourceId, status, reason,
      payment: { id: id(payment._id), reference: payment.reference, status: payment.status, amount: payment.amount, currency: payment.currency },
      order: order ? { id: id(order._id), total: order.total, currency: order.currency } : undefined,
      processed_at: payment.status === "refunded" ? payment.updatedAt : undefined, created_at: payment.createdAt, updated_at: payment.updatedAt };
  }

  async getRefund(resourceId: string) { const { payment, order } = await this.paymentForRefund(resourceId); return this.refundView(resourceId, payment, order); }

  async updateRefund(resourceId: string, adminId: string, input: any) {
    const { payment, order } = await this.paymentForRefund(resourceId);
    if (input.status === "processed" && payment.status !== "refunded") {
      await PaymentService.refund(payment);
      if (order) {
        order.status = "refunded"; order.paymentStatus = "refunded"; order.refundReason = input.reason;
        order.timeline.push({ status: "refunded", note: input.reason || "Refund processed by admin", actor: new mongoose.Types.ObjectId(adminId), createdAt: new Date() } as any);
        await order.save();
      }
      return this.refundView(resourceId, payment, order, "processed", input.reason);
    }
    return this.refundView(resourceId, payment, order, input.status, input.reason);
  }

  async getSupportTicket(ticketId: string) {
    const ticket = await SupportTicket.findById(ticketId).populate("user", "name email phone").lean();
    if (!ticket) throw new ApiError(404, "Support ticket not found", "SUPPORT_TICKET_NOT_FOUND");
    const messages = await SupportTicketMessage.find({ ticket: ticket._id }).sort({ createdAt: 1 }).lean();
    return ticketView(ticket, messages);
  }

  async updateSupportTicket(ticketId: string, adminId: string, input: any) {
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) throw new ApiError(404, "Support ticket not found", "SUPPORT_TICKET_NOT_FOUND");
    if (input.status) { ticket.status = input.status; ticket.closedAt = input.status === "closed" ? new Date() : undefined; }
    if (input.priority) ticket.priority = input.priority;
    if (input.message) {
      await SupportTicketMessage.create({ ticket: ticket._id, sender: adminId, senderRole: "admin", message: input.message, attachments: [] });
      ticket.lastMessageAt = new Date();
      if (ticket.status === "resolved") ticket.status = "in_progress";
    }
    await ticket.save();
    return this.getSupportTicket(ticketId);
  }

  async payouts(query: { status?: string; seller_id?: string; page?: number; per_page?: number }) {
    const page = query.page || 1; const perPage = query.per_page || 20;
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.seller_id) filter.seller = query.seller_id;
    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(filter).populate("seller", "name email").populate("bankAccount", "bankName accountName accountNumberLast4 isVerified").sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean(),
      Withdrawal.countDocuments(filter),
    ]);
    return { payouts: withdrawals.map(payoutView), pagination: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) } };
  }
}

export default new AdminOperationsService();
