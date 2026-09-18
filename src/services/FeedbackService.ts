import AppFeedback from "../models/AppFeedback";

class FeedbackService {
  async create(userId: string, input: { rating?: number; category?: string; message: string; platform?: string; app_version?: string }) {
    const feedback = await AppFeedback.create({ user: userId, rating: input.rating, category: input.category, message: input.message, platform: input.platform, appVersion: input.app_version });
    return { id: String(feedback._id), message: feedback.message, rating: feedback.rating, category: feedback.category, created_at: feedback.createdAt };
  }
}

export default new FeedbackService();
