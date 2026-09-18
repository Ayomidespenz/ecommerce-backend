import Notification from "../models/Notification";
import { ApiError } from "../utils/apiErrors";

interface NotificationQuery { read?: boolean; page?: number; per_page?: number; }

function serialize(notification: any) {
  return {
    id: String(notification._id), type: notification.type, title: notification.title, message: notification.message,
    data: notification.data, read: Boolean(notification.readAt), read_at: notification.readAt,
    created_at: notification.createdAt, updated_at: notification.updatedAt,
  };
}

class NotificationService {
  async create(input: { userId: string; type: string; title: string; message: string; data?: Record<string, unknown> }) {
    return Notification.create({ user: input.userId, type: input.type, title: input.title, message: input.message, data: input.data });
  }
  async list(userId: string, query: NotificationQuery) {
    const page = query.page || 1, perPage = query.per_page || 20;
    const filter: Record<string, unknown> = { user: userId };
    if (query.read === true) filter.readAt = { $ne: null };
    if (query.read === false) filter.readAt = null;
    const [total, notifications] = await Promise.all([
      Notification.countDocuments(filter),
      Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean(),
    ]);
    return { notifications: notifications.map(serialize), meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) } };
  }
  async unreadCount(userId: string) { return { unread_count: await Notification.countDocuments({ user: userId, readAt: null }) }; }
  async markRead(userId: string, id: string) {
    const notification = await Notification.findOneAndUpdate({ _id: id, user: userId }, { $set: { readAt: new Date() } }, { new: true }).lean();
    if (!notification) throw new ApiError(404, "Notification not found", "NOTIFICATION_NOT_FOUND");
    return serialize(notification);
  }
  async readAll(userId: string) { await Notification.updateMany({ user: userId, readAt: null }, { $set: { readAt: new Date() } }); return { message: "All notifications marked as read" }; }
  async remove(userId: string, id: string) {
    const result = await Notification.deleteOne({ _id: id, user: userId });
    if (!result.deletedCount) throw new ApiError(404, "Notification not found", "NOTIFICATION_NOT_FOUND");
  }
}

export default new NotificationService();
