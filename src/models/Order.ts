import mongoose, { Document, Schema } from "mongoose";
import { AddressSnapshot } from "./CheckoutQuote";

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "completed" | "cancelled" | "returned" | "refunded";
export type OrderPaymentStatus = "unpaid" | "paid" | "failed" | "refunded";

export interface OrderTimelineEntry {
  status: OrderStatus;
  note?: string;
  actor?: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface OrderDocument extends Document {
  user: mongoose.Types.ObjectId;
  orderNumber: string;
  quote: mongoose.Types.ObjectId;
  payment?: mongoose.Types.ObjectId;
  shippingAddress: AddressSnapshot;
  promoCode?: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  serviceFee: number;
  total: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: Date;
  cancellationReason?: string;
  returnReason?: string;
  refundReason?: string;
  paidAt?: Date;
  timeline: OrderTimelineEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const addressSnapshotSchema = new Schema<AddressSnapshot>(
  {
    recipientName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String },
    country: { type: String, required: true },
    landmark: { type: String },
  },
  { _id: false }
);

const timelineSchema = new Schema<OrderTimelineEntry>(
  {
    status: { type: String, enum: ["pending", "confirmed", "processing", "shipped", "delivered", "completed", "cancelled", "returned", "refunded"], required: true },
    note: { type: String, maxlength: 500 },
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new Schema<OrderDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    orderNumber: { type: String, required: true, unique: true, index: true },
    quote: { type: Schema.Types.ObjectId, ref: "CheckoutQuote", required: true },
    payment: { type: Schema.Types.ObjectId, ref: "Payment" },
    shippingAddress: { type: addressSnapshotSchema, required: true },
    promoCode: { type: String, uppercase: true, trim: true },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0 },
    serviceFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true },
    status: { type: String, enum: ["pending", "confirmed", "processing", "shipped", "delivered", "completed", "cancelled", "returned", "refunded"], default: "confirmed", index: true },
    paymentStatus: { type: String, enum: ["unpaid", "paid", "failed", "refunded"], default: "paid", index: true },
    trackingNumber: { type: String, trim: true },
    carrier: { type: String, trim: true },
    estimatedDelivery: { type: Date },
    cancellationReason: { type: String, maxlength: 500 },
    returnReason: { type: String, maxlength: 500 },
    refundReason: { type: String, maxlength: 500 },
    paidAt: { type: Date },
    timeline: { type: [timelineSchema], default: [] },
  },
  { timestamps: true, collection: "orders" }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ user: 1, status: 1, createdAt: -1 });

export default mongoose.model<OrderDocument>("Order", orderSchema);
