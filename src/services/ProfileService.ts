import User from "../models/User";
import UserProfile from "../models/UserProfile";
import { ApiError } from "../utils/apiErrors";

function publicUser(user: any) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    registration_id: user.registrationId,
    status: user.status,
    email_verified: user.emailVerified,
    phone_verified: user.phoneVerified,
    avatar: user.avatar,
    created_at: user.createdAt,
  };
}

function preferencesResponse(preferences: any) {
  const value = preferences || {};
  return {
    language: value.language,
    currency: value.currency,
    theme: value.theme,
    push_notifications: value.pushNotifications,
    email_notifications: value.emailNotifications,
    sms_notifications: value.smsNotifications,
    order_updates: value.orderUpdates,
    promotional_notifications: value.promotionalNotifications,
    marketing_emails: value.marketingEmails,
  };
}

class ProfileService {
  private async profileFor(userId: string) {
    const profile = await UserProfile.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return profile;
  }

  async getProfile(userId: string) {
    const user = await User.findById(userId).lean();
    if (!user) throw new ApiError(404, "User not found", "USER_NOT_FOUND");
    const profile = await this.profileFor(userId);
    return { user: publicUser(user), profile: { bio: profile.bio, gender: profile.gender, date_of_birth: profile.dateOfBirth, preferences: preferencesResponse(profile.preferences) } };
  }

  async updateProfile(userId: string, input: { name?: string; phone?: string; bio?: string; gender?: string; date_of_birth?: Date }) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found", "USER_NOT_FOUND");
    if (input.phone && input.phone !== user.phone) {
      const duplicate = await User.findOne({ phone: input.phone, _id: { $ne: userId } });
      if (duplicate) throw new ApiError(409, "An account with this phone number already exists", "PHONE_IN_USE");
      user.phone = input.phone;
      user.phoneVerified = false;
      user.phoneVerifiedAt = undefined;
    }
    if (input.name !== undefined) user.name = input.name;
    await user.save();
    const profile = await UserProfile.findOneAndUpdate(
      { user: userId },
      { $set: { ...(input.bio !== undefined ? { bio: input.bio } : {}), ...(input.gender !== undefined ? { gender: input.gender } : {}), ...(input.date_of_birth !== undefined ? { dateOfBirth: input.date_of_birth } : {}) }, $setOnInsert: { user: userId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return { user: publicUser(user), profile: { bio: profile.bio, gender: profile.gender, date_of_birth: profile.dateOfBirth, preferences: preferencesResponse(profile.preferences) } };
  }

  async updatePhoto(userId: string, url: string, publicId?: string) {
    const user = await User.findByIdAndUpdate(userId, { avatar: url, ...(publicId ? { avatarPublicId: publicId } : {}) }, { new: true }).lean();
    if (!user) throw new ApiError(404, "User not found", "USER_NOT_FOUND");
    return { avatar: user.avatar, avatar_public_id: user.avatarPublicId };
  }

  async getPreferences(userId: string) {
    const profile = await this.profileFor(userId);
    return preferencesResponse(profile.preferences);
  }

  async updatePreferences(userId: string, input: Record<string, any>) {
    const mapping: Record<string, string> = {
      language: "language", currency: "currency", theme: "theme", push_notifications: "pushNotifications",
      email_notifications: "emailNotifications", sms_notifications: "smsNotifications", order_updates: "orderUpdates",
      promotional_notifications: "promotionalNotifications", marketing_emails: "marketingEmails",
    };
    const updates: Record<string, unknown> = {};
    for (const [key, path] of Object.entries(mapping)) if (input[key] !== undefined) updates[`preferences.${path}`] = input[key];
    const notifications = input.notifications || {};
    const nested: Record<string, string> = { push: "pushNotifications", email: "emailNotifications", sms: "smsNotifications", order_updates: "orderUpdates", promotions: "promotionalNotifications" };
    for (const [key, path] of Object.entries(nested)) if (notifications[key] !== undefined) updates[`preferences.${path}`] = notifications[key];
    const profile = await UserProfile.findOneAndUpdate({ user: userId }, { $set: updates, $setOnInsert: { user: userId } }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
    return preferencesResponse(profile.preferences);
  }
}

export default new ProfileService();
