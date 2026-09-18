import SellerVerification from "../models/SellerVerification";
import VerificationDocument from "../models/VerificationDocument";
import SellerSettings from "../models/SellerSettings";
import { ApiError } from "../utils/apiErrors";

function verificationView(verification: any, documents: any[]) {
  return {
    id: String(verification._id),
    status: verification.status,
    business_name: verification.businessName,
    business_type: verification.businessType,
    business_address: verification.businessAddress,
    rejection_reason: verification.rejectionReason,
    submitted_at: verification.submittedAt,
    reviewed_at: verification.reviewedAt,
    documents: documents.map((document) => ({
      id: String(document._id),
      type: document.type,
      url: document.url,
      public_id: document.publicId,
      status: document.status,
      created_at: document.createdAt,
      updated_at: document.updatedAt,
    })),
    created_at: verification.createdAt,
    updated_at: verification.updatedAt,
  };
}

function settingsView(settings: any) {
  return {
    id: String(settings._id),
    storefront_name: settings.storefrontName,
    returns_policy: settings.returnsPolicy,
    shipping_information: settings.shippingInformation,
    notifications: {
      order_updates: settings.notifications?.orderUpdates ?? true,
      payout_updates: settings.notifications?.payoutUpdates ?? true,
      marketing: settings.notifications?.marketing ?? false,
    },
    created_at: settings.createdAt,
    updated_at: settings.updatedAt,
  };
}

class SellerVerificationService {
  private async getOrCreate(sellerId: string) {
    let verification = await SellerVerification.findOne({ seller: sellerId });
    if (!verification) verification = await SellerVerification.create({ seller: sellerId, status: "draft" });
    return verification;
  }

  async getVerification(sellerId: string) {
    const verification = await this.getOrCreate(sellerId);
    const documents = await VerificationDocument.find({ verification: verification._id }).sort({ createdAt: -1 }).lean();
    return verificationView(verification, documents);
  }

  async addDocument(sellerId: string, input: { type: string; url: string; public_id?: string }) {
    const verification = await this.getOrCreate(sellerId);
    if (["submitted", "under_review", "approved"].includes(verification.status)) {
      throw new ApiError(409, "Verification documents cannot be changed after submission", "VERIFICATION_LOCKED");
    }
    const document = await VerificationDocument.findOneAndUpdate(
      { seller: sellerId, verification: verification._id, type: input.type },
      { $set: { url: input.url, publicId: input.public_id, status: "pending" } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const documents = await VerificationDocument.find({ verification: verification._id }).sort({ createdAt: -1 }).lean();
    return verificationView(verification, documents);
  }

  async submit(sellerId: string, input: { business_name?: string; business_type?: string; business_address?: string }) {
    const verification = await this.getOrCreate(sellerId);
    if (["under_review", "approved"].includes(verification.status)) {
      throw new ApiError(409, "Verification has already been submitted", "VERIFICATION_LOCKED");
    }
    const documents = await VerificationDocument.find({ verification: verification._id, status: { $ne: "rejected" } }).lean();
    const required = new Set(documents.map((document) => document.type));
    if (!required.has("government_id") || !required.has("proof_of_address")) {
      throw new ApiError(400, "Government ID and proof of address are required", "VERIFICATION_DOCUMENTS_INCOMPLETE");
    }
    verification.businessName = input.business_name;
    verification.businessType = input.business_type;
    verification.businessAddress = input.business_address;
    verification.status = "submitted";
    verification.submittedAt = new Date();
    verification.rejectionReason = undefined;
    await verification.save();
    return this.getVerification(sellerId);
  }

  async settings(sellerId: string) {
    const settings = await SellerSettings.findOneAndUpdate(
      { seller: sellerId },
      { $setOnInsert: { seller: sellerId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return settingsView(settings);
  }

  async updateSettings(sellerId: string, input: any) {
    const settings = await SellerSettings.findOneAndUpdate(
      { seller: sellerId },
      {
        $set: {
          ...(input.storefront_name !== undefined ? { storefrontName: input.storefront_name } : {}),
          ...(input.returns_policy !== undefined ? { returnsPolicy: input.returns_policy } : {}),
          ...(input.shipping_information !== undefined ? { shippingInformation: input.shipping_information } : {}),
          ...(input.notifications?.order_updates !== undefined ? { "notifications.orderUpdates": input.notifications.order_updates } : {}),
          ...(input.notifications?.payout_updates !== undefined ? { "notifications.payoutUpdates": input.notifications.payout_updates } : {}),
          ...(input.notifications?.marketing !== undefined ? { "notifications.marketing": input.notifications.marketing } : {}),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return settingsView(settings);
  }
}

export default new SellerVerificationService();
