import crypto from "crypto";
import mongoose from "mongoose";
import Payment from "../models/Payment";
import User from "../models/User";
import CheckoutService from "./CheckoutService";
import PaystackService from "./PaystackService";
import { ApiError } from "../utils/apiErrors";

function serialize(payment: any): Record<string, unknown> {
  return {
    id: String(payment._id),
    reference: payment.reference,
    provider: payment.provider,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    authorization_url: payment.authorizationUrl,
    access_code: payment.accessCode,
    provider_transaction_id: payment.providerTransactionId,
    paid_at: payment.paidAt,
    created_at: payment.createdAt,
    updated_at: payment.updatedAt,
  };
}

class PaymentService {
  async initialize(userId: string, quoteId: string, email?: string) {
    const quote = await CheckoutService.getOpenQuote(userId, quoteId);
    const user = await User.findById(userId).select("email").lean();
    if (!user) throw new ApiError(404, "User not found", "USER_NOT_FOUND");
    const reference = `FM_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;

    if (quote.total === 0) {
      const payment = await Payment.create({
        user: userId,
        quote: quote._id,
        reference,
        amount: quote.total,
        currency: quote.currency,
        status: "success",
        paidAt: new Date(),
      });
      return { payment: serialize(payment), authorization_url: null, access_code: null };
    }

    const payment = await Payment.create({
      user: userId,
      quote: quote._id,
      reference,
      amount: quote.total,
      currency: quote.currency,
      status: "initialized",
    });
    try {
      const provider = await PaystackService.initialize({
        email: email || user.email,
        amount: quote.total,
        currency: quote.currency,
        reference,
        metadata: { quote_id: String(quote._id), user_id: userId },
      });
      payment.status = "pending";
      payment.authorizationUrl = provider.authorization_url;
      payment.accessCode = provider.access_code;
      payment.providerResponse = provider;
      await payment.save();
      return {
        payment: serialize(payment),
        authorization_url: provider.authorization_url,
        access_code: provider.access_code,
      };
    } catch (error) {
      payment.status = "failed";
      await payment.save();
      throw error;
    }
  }

  async getForUser(userId: string, reference: string) {
    const payment = await Payment.findOne({ user: userId, reference }).lean();
    if (!payment) throw new ApiError(404, "Payment not found", "PAYMENT_NOT_FOUND");
    return serialize(payment);
  }

  async ensureSuccessful(userId: string, reference: string) {
    const payment = await Payment.findOne({ user: userId, reference });
    if (!payment) throw new ApiError(404, "Payment not found", "PAYMENT_NOT_FOUND");
    if (payment.status === "success") return payment;
    if (payment.status === "refunded" || payment.status === "failed") {
      throw new ApiError(409, "Payment is not successful", "PAYMENT_NOT_SUCCESSFUL");
    }
    const provider = await PaystackService.verify(reference);
    const amountMatches = Number(provider.amount) === Math.round(payment.amount * 100);
    if (provider.status !== "success" || !amountMatches || String(provider.currency).toUpperCase() !== payment.currency) {
      payment.status = provider.status === "failed" ? "failed" : "pending";
      await payment.save();
      throw new ApiError(409, "Payment has not been verified successfully", "PAYMENT_NOT_VERIFIED");
    }
    payment.status = "success";
    payment.providerTransactionId = provider.id ? String(provider.id) : undefined;
    payment.providerResponse = provider;
    payment.paidAt = new Date();
    await payment.save();
    return payment;
  }

  async handleWebhook(payload: any, signature: string | undefined, rawBody?: Buffer) {
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key) throw new ApiError(503, "Paystack is not configured", "PAYMENT_PROVIDER_NOT_CONFIGURED");
    if (!signature) throw new ApiError(401, "Missing payment webhook signature", "INVALID_WEBHOOK_SIGNATURE");
    const raw = rawBody || Buffer.from(JSON.stringify(payload));
    const expected = crypto.createHmac("sha512", key).update(raw).digest("hex");
    const received = Buffer.from(signature);
    if (received.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), received)) {
      throw new ApiError(401, "Invalid payment webhook signature", "INVALID_WEBHOOK_SIGNATURE");
    }
    const reference = payload?.data?.reference;
    if (!reference) throw new ApiError(400, "Webhook payment reference is missing", "INVALID_WEBHOOK_PAYLOAD");
    const payment = await Payment.findOne({ reference });
    if (!payment) return { received: true, ignored: true };
    if (payload.event === "charge.success") {
      const providerAmount = Number(payload.data.amount);
      const amountMatches = providerAmount === Math.round(payment.amount * 100);
      if (amountMatches) {
        payment.status = "success";
        payment.providerTransactionId = payload.data.id ? String(payload.data.id) : undefined;
        payment.providerResponse = payload.data;
        payment.paidAt = new Date();
      }
    } else if (["charge.failed", "transaction.failed"].includes(payload.event)) {
      payment.status = "failed";
      payment.providerResponse = payload.data;
    }
    await payment.save();
    return { received: true };
  }

  async refund(payment: mongoose.Document & { status: string; amount: number; reference: string; providerTransactionId?: string }) {
    if (payment.status !== "success") throw new ApiError(409, "Only successful payments can be refunded", "PAYMENT_NOT_REFUNDABLE");
    const provider = await PaystackService.refund(payment.providerTransactionId || payment.reference, payment.amount);
    payment.status = "refunded";
    (payment as any).providerResponse = provider;
    await payment.save();
    return payment;
  }
}

export default new PaymentService();
