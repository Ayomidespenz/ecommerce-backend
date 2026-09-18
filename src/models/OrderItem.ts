import mongoose, { Document, Schema } from "mongoose";

export type SellerFulfillmentStatus = "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

export interface SellerFulfillmentTimelineEntry {
  status: SellerFulfillmentStatus;
  note?: string;
  actor?: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface OrderItemDocument extends Document {
  order: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  productSnapshot: {
    name: string;
    sku?: string;
    image?: string;
  };
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  fulfillmentStatus: SellerFulfillmentStatus;
  fulfillmentTimeline: SellerFulfillmentTimelineEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const fulfillmentTimelineSchema = new Schema<SellerFulfillmentTimelineEntry>(
  {
    status: {
      type: String,
      enum: ["confirmed", "processing", "shipped", "delivered", "cancelled"],
      required: true,
    },
    note: { type: String, maxlength: 500 },
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderItemSchema = new Schema<OrderItemDocument>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    productSnapshot: {
      name: { type: String, required: true },
      sku: { type: String },
      image: { type: String },
    },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    fulfillmentStatus: {
      type: String,
      enum: ["confirmed", "processing", "shipped", "delivered", "cancelled"],
      default: "confirmed",
      index: true,
    },
    fulfillmentTimeline: {
      type: [fulfillmentTimelineSchema],
      default: [],
    },
  },
  { timestamps: true, collection: "order_items" }
);

orderItemSchema.index({ order: 1, seller: 1 });
orderItemSchema.index({ seller: 1, fulfillmentStatus: 1, createdAt: -1 });

export default mongoose.model<OrderItemDocument>("OrderItem", orderItemSchema);
