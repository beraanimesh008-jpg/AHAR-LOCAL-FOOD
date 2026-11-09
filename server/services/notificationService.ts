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
  async createNotification(payload: NotificationPayload) {
    if (db.isUsingMysql()) {
      const dataJson = payload.data ? JSON.stringify(payload.data) : null;
      const res = await db.query(
        `INSERT INTO notifications (user_id, role, title, title_bn, message, message_bn, type, is_read, data_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          payload.userId,
          payload.role,
          payload.title,
          payload.title_bn,
          payload.message,
          payload.message_bn,
          payload.type,
          dataJson
        ]
      );
      return {
        id: res.insertId || 1,
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
    }

    // In-memory fallback
    const store = db.getStore();
    const newId = (store.notifications || []).length + 1;
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
    if (!store.notifications) store.notifications = [];
    store.notifications.unshift(notif);
    return notif;
  },

  async getUserNotifications(userId: number, role?: string) {
    if (db.isUsingMysql()) {
      let query = 'SELECT * FROM notifications WHERE user_id = ?';
      const params: any[] = [userId];
      if (role) {
        query += ' OR role = ?';
        params.push(role);
      }
      query += ' ORDER BY created_at DESC';

      const res = await db.query(query, params);
      return res.rows.map((n: any) => ({
        id: n.id,
        user_id: n.user_id,
        role: n.role,
        title: n.title,
        title_bn: n.title_bn,
        message: n.message,
        message_bn: n.message_bn,
        type: n.type,
        is_read: n.is_read,
        data: n.data_json ? JSON.parse(n.data_json) : null,
        created_at: n.created_at
      }));
    }

    const store = db.getStore();
    return (store.notifications || []).filter(
      (n: any) => n.user_id === userId || (role && n.role === role)
    );
  },

  async markAsRead(notificationId: number) {
    if (db.isUsingMysql()) {
      await db.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [notificationId]);
      const res = await db.query('SELECT * FROM notifications WHERE id = ? LIMIT 1', [notificationId]);
      const n = res.rows[0];
      if (!n) return null;
      return {
        id: n.id,
        user_id: n.user_id,
        role: n.role,
        title: n.title,
        title_bn: n.title_bn,
        message: n.message,
        message_bn: n.message_bn,
        type: n.type,
        is_read: n.is_read,
        data: n.data_json ? JSON.parse(n.data_json) : null,
        created_at: n.created_at
      };
    }

    const store = db.getStore();
    const notif = (store.notifications || []).find((n: any) => n.id === notificationId);
    if (notif) {
      notif.is_read = 1;
    }
    return notif;
  }
};
