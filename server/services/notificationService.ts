import { db } from '../db';

export interface NotificationPayload {
  userId: number;
  role: 'customer' | 'restaurant' | 'delivery' | 'admin';
  title: string;
  title_bn: string;
  message: string;
  message_bn: string;
  type: 'order_status' | 'new_order' | 'assignment' | 'admin_alert';
  data?: any;
}

export const notificationService = {
  createNotification(payload: NotificationPayload) {
    const store = db.getStore();
    const newId = store.notifications.length + 1;
    const notif = {
      id: newId,
      user_id: payload.userId,
      role: payload.role,
      title: payload.title,
      title_bn: payload.title_bn,
      message: payload.message,
      message_bn: payload.message_bn,
      type: payload.type,
      is_read: 0,
      data: payload.data || null,
      created_at: new Date().toISOString()
    };
    store.notifications.unshift(notif);
    return notif;
  },

  getUserNotifications(userId: number, role?: string) {
    const store = db.getStore();
    return store.notifications.filter((n: any) => n.user_id === userId || (role && n.role === role));
  },

  markAsRead(notificationId: number) {
    const store = db.getStore();
    const notif = store.notifications.find((n: any) => n.id === notificationId);
    if (notif) {
      notif.is_read = 1;
    }
    return notif;
  }
};
