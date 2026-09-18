import User from "../models/User";
import Referral from "../models/Referral";
import { ApiError } from "../utils/apiErrors";

const view = (item: any) => {
  const user = item.referredUser && typeof item.referredUser === "object" ? item.referredUser : undefined;
  return { id: String(item._id), code: item.code, status: item.status, referred_user: user ? { id: String(user._id), name: user.name, email: user.email } : String(item.referredUser), reward_amount: item.rewardAmount, reward_currency: item.rewardCurrency, applied_at: item.appliedAt, completed_at: item.completedAt, created_at: item.createdAt };
};

class ReferralService {
  private async codeFor(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found", "USER_NOT_FOUND");
    if (!user.referralCode) { user.referralCode = "FORTUNE-" + String(user._id).slice(-8).toUpperCase(); await user.save(); }
    return user.referralCode as string;
  }

  async summary(userId: string) {
    const code = await this.codeFor(userId); const rows = await Referral.find({ referrer: userId }).lean();
    return { referral_code: code, total_referrals: rows.length, pending: rows.filter((r) => r.status === "pending").length, completed: rows.filter((r) => r.status === "completed").length, rewarded: rows.filter((r) => r.status === "rewarded").length, total_rewards: rows.reduce((n, r) => n + (r.rewardAmount || 0), 0), currency: rows[0]?.rewardCurrency || "NGN" };
  }

  async list(userId: string, query: { page?: number; per_page?: number }) {
    await this.codeFor(userId); const page = query.page || 1; const perPage = query.per_page || 20; const filter = { referrer: userId };
    const [rows, total] = await Promise.all([Referral.find(filter).populate("referredUser", "name email").sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean(), Referral.countDocuments(filter)]);
    return { referrals: rows.map(view), pagination: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) } };
  }

  async apply(userId: string, code: string) {
    const normalized = code.toUpperCase(); const owner = await User.findOne({ referralCode: normalized });
    if (!owner) throw new ApiError(404, "Referral code not found", "REFERRAL_CODE_NOT_FOUND");
    if (String(owner._id) === userId) throw new ApiError(400, "You cannot apply your own referral code", "SELF_REFERRAL_NOT_ALLOWED");
    if (await Referral.exists({ referredUser: userId })) throw new ApiError(409, "A referral code has already been applied to this account", "REFERRAL_ALREADY_APPLIED");
    try { return view(await Referral.create({ referrer: owner._id, referredUser: userId, code: normalized })); }
    catch (error: any) { if (error?.code === 11000) throw new ApiError(409, "A referral code has already been applied to this account", "REFERRAL_ALREADY_APPLIED"); throw error; }
  }
}

export default new ReferralService();
