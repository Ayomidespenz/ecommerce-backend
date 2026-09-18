import Product from "../models/Product";
import PromotionPlan from "../models/PromotionPlan";
import ListingPromotion from "../models/ListingPromotion";
import SellerFinanceService from "./SellerFinanceService";
import { ApiError } from "../utils/apiErrors";

const DEFAULT_PLANS = [
  { code: "BOOST_7", name: "7-day Boost", description: "Promote a listing for seven days.", price: 5000, durationDays: 7, features: ["Search boost", "Promoted badge"] },
  { code: "BOOST_14", name: "14-day Boost", description: "Promote a listing for fourteen days.", price: 9000, durationDays: 14, features: ["Search boost", "Promoted badge", "Homepage rotation"] },
  { code: "BOOST_30", name: "30-day Boost", description: "Promote a listing for thirty days.", price: 15000, durationDays: 30, features: ["Search boost", "Promoted badge", "Homepage rotation"] },
];

function planView(plan: any) {
  return {
    id: String(plan._id),
    code: plan.code,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    duration_days: plan.durationDays,
    features: plan.features || [],
    is_active: plan.isActive,
  };
}

function promotionView(row: any) {
  return {
    id: String(row._id),
    listing_id: String(row.listing),
    plan: row.plan && typeof row.plan === "object" ? planView(row.plan) : String(row.plan),
    amount: row.amount,
    starts_at: row.startsAt,
    ends_at: row.endsAt,
    status: row.status,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

class SellerPromotionService {
  private async ensurePlans() {
    await PromotionPlan.bulkWrite(DEFAULT_PLANS.map((plan) => ({
      updateOne: {
        filter: { code: plan.code },
        update: { $setOnInsert: plan },
        upsert: true,
      },
    })));
  }

  async plans() {
    await this.ensurePlans();
    const rows = await PromotionPlan.find({ isActive: true }).sort({ price: 1 }).lean();
    return { plans: rows.map(planView) };
  }

  private async ownListing(sellerId: string, listingId: string) {
    const listing = await Product.findOne({ _id: listingId, seller: sellerId });
    if (!listing) throw new ApiError(404, "Listing not found", "LISTING_NOT_FOUND");
    return listing;
  }

  async list(sellerId: string, listingId: string) {
    await this.ownListing(sellerId, listingId);
    await ListingPromotion.updateMany(
      { seller: sellerId, listing: listingId, status: "active", endsAt: { $lte: new Date() } },
      { $set: { status: "expired" } }
    );
    const rows = await ListingPromotion.find({ seller: sellerId, listing: listingId })
      .populate("plan")
      .sort({ createdAt: -1 })
      .lean();
    return { promotions: rows.map(promotionView) };
  }

  async create(sellerId: string, listingId: string, planId: string) {
    await this.ownListing(sellerId, listingId);
    const plan = await PromotionPlan.findOne({ _id: planId, isActive: true });
    if (!plan) throw new ApiError(404, "Promotion plan not found", "PROMOTION_PLAN_NOT_FOUND");
    const existing = await ListingPromotion.findOne({
      seller: sellerId,
      listing: listingId,
      status: "active",
      endsAt: { $gt: new Date() },
    });
    if (existing) throw new ApiError(409, "This listing already has an active promotion", "PROMOTION_ALREADY_ACTIVE");

    await SellerFinanceService.chargeWallet(
      sellerId,
      plan.price,
      `Promotion purchase: ${plan.name}`,
      { listing_id: listingId, plan_id: String(plan._id) }
    );

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    const promotion = await ListingPromotion.create({
      seller: sellerId,
      listing: listingId,
      plan: plan._id,
      amount: plan.price,
      startsAt,
      endsAt,
      status: "active",
    });
    return promotionView(await ListingPromotion.findById(promotion._id).populate("plan").lean());
  }

  async cancel(sellerId: string, promotionId: string) {
    const promotion = await ListingPromotion.findOne({ _id: promotionId, seller: sellerId });
    if (!promotion) throw new ApiError(404, "Promotion not found", "PROMOTION_NOT_FOUND");
    if (promotion.status !== "active") throw new ApiError(409, "Promotion is no longer active", "PROMOTION_NOT_ACTIVE");
    promotion.status = "cancelled";
    await promotion.save();
    return promotionView(promotion);
  }
}

export default new SellerPromotionService();
