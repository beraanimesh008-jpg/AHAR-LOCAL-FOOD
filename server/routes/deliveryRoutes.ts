import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/authMiddleware';
import { notificationService } from '../services/notificationService';

export const deliveryRouter = Router();

function formatDeliveryPartnerRow(dp: any) {
  let settlements: any[] = [];
  if (dp.settlements_json) {
    try {
      settlements = typeof dp.settlements_json === 'string' ? JSON.parse(dp.settlements_json) : dp.settlements_json;
    } catch {}
  }

  return {
    ...dp,
    id: Number(dp.id),
    user_id: Number(dp.user_id),
    service_area_id: dp.service_area_id != null ? Number(dp.service_area_id) : 1,
    is_online: Number(dp.is_online || 0),
    current_lat: dp.current_lat != null ? Number(dp.current_lat) : null,
    current_lng: dp.current_lng != null ? Number(dp.current_lng) : null,
    total_deliveries: Number(dp.total_deliveries || 0),
    rating: Number(dp.rating || 5.0),
    wallet_balance: Number(dp.wallet_balance || 0),
    settlements
  };
}

// Get Delivery Partner Profile & Stats
deliveryRouter.get('/profile', authenticateToken, requireRole(['delivery', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  if (db.isUsingMysql()) {
    let dpRes = await db.query('SELECT * FROM delivery_partners WHERE user_id = ? LIMIT 1', [req.user!.id]);
    let dpRaw = dpRes.rows[0];

    if (!dpRaw) {
      // Create pending/default approved profile if missing
      await db.query(
        `INSERT INTO delivery_partners (user_id, service_area_id, name, phone, email, vehicle_type, vehicle_number, driving_license_number, status, is_online, wallet_balance)
         VALUES (?, 1, ?, ?, ?, 'bike', 'WB-PENDING', 'DL-WB-2024-001', 'approved', 1, 0.00)`,
        [req.user!.id, req.user!.name, req.user!.phone, req.user!.email]
      );
      dpRes = await db.query('SELECT * FROM delivery_partners WHERE user_id = ? LIMIT 1', [req.user!.id]);
      dpRaw = dpRes.rows[0];
    }

    const dp = formatDeliveryPartnerRow(dpRaw);

    // Fetch Wallet
    let walletRes = await db.query('SELECT * FROM wallets WHERE user_id = ? LIMIT 1', [dp.user_id]);
    let wallet = walletRes.rows[0];
    if (!wallet) {
      wallet = {
        balance: dp.wallet_balance,
        total_earned: dp.wallet_balance * 3,
        total_withdrawn: dp.wallet_balance * 2
      };
    } else {
      wallet = {
        ...wallet,
        balance: Number(wallet.balance),
        total_earned: Number(wallet.total_earned),
        total_withdrawn: Number(wallet.total_withdrawn)
      };
    }

    // Fetch Active Order
    const activeOrderRes = await db.query(
      `SELECT * FROM orders WHERE delivery_partner_id = ? AND status IN ('confirmed', 'preparing', 'ready_for_pickup', 'on_the_way') LIMIT 1`,
      [dp.id]
    );
    const activeOrder = activeOrderRes.rows[0] || null;

    return res.json({
      success: true,
      data: {
        ...dp,
        wallet,
        activeOrder
      }
    });
  }

  // In-memory fallback
  const store = db.getStore();
  let dp = store.delivery_partners.find((d: any) => d.user_id === req.user!.id);

  if (!dp) {
    const newDpId = store.delivery_partners.length + 1;
    dp = {
      id: newDpId,
      user_id: req.user!.id,
      service_area_id: 1,
      name: req.user!.name,
      phone: req.user!.phone,
      vehicle_type: 'bike',
      vehicle_number: 'WB-PENDING',
      driving_license_number: 'DL-WB-2024-001',
      status: 'approved',
      is_online: 1,
      current_lat: null,
      current_lng: null,
      last_location_updated_at: null,
      total_deliveries: 0,
      rating: 5.0,
      wallet_balance: 0.00
    };
    store.delivery_partners.push(dp);
  }

  const wallet = store.wallets.find((w: any) => w.user_id === dp.user_id) || {
    balance: dp.wallet_balance,
    total_earned: dp.wallet_balance * 3,
    total_withdrawn: dp.wallet_balance * 2
  };

  const activeOrder = dp.active_order_id ? store.orders.find((o: any) => o.id === dp.active_order_id) : null;

  return res.json({
    success: true,
    data: {
      ...dp,
      wallet,
      activeOrder
    }
  });
});

// Update Delivery Partner Profile & Payment Methods
deliveryRouter.put('/profile', authenticateToken, requireRole(['delivery', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  const {
    name,
    phone,
    vehicle_type,
    vehicle_number,
    driving_license_number,
    age,
    gender,
    address,
    passport_photo,
    profile_photo,
    aadhaar_photo,
    vehicle_photo,
    payment_method,
    upi_id,
    upi_qr_photo,
    bank_name,
    bank_account_no,
    bank_account_holder,
    bank_ifsc,
    bank_passbook_photo
  } = req.body;

  if (db.isUsingMysql()) {
    const dpRes = await db.query('SELECT * FROM delivery_partners WHERE user_id = ? LIMIT 1', [req.user!.id]);
    if (!dpRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Delivery partner profile not found' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (phone) { updates.push('phone = ?'); params.push(phone); }
    if (vehicle_type) { updates.push('vehicle_type = ?'); params.push(vehicle_type); }
    if (vehicle_number) { updates.push('vehicle_number = ?'); params.push(vehicle_number); }
    if (driving_license_number) { updates.push('driving_license_number = ?'); params.push(driving_license_number); }
    if (vehicle_photo || passport_photo || profile_photo) { updates.push('document_photo = ?'); params.push(vehicle_photo || passport_photo || profile_photo); }
    if (aadhaar_photo) { updates.push('aadhaar_photo = ?'); params.push(aadhaar_photo); }
    if (payment_method) { updates.push('payment_method = ?'); params.push(payment_method); }
    if (typeof upi_id !== 'undefined') { updates.push('upi_id = ?'); params.push(upi_id); }
    if (typeof upi_qr_photo !== 'undefined') { updates.push('upi_qr_photo = ?'); params.push(upi_qr_photo); }
    if (typeof bank_name !== 'undefined') { updates.push('bank_name = ?'); params.push(bank_name); }
    if (typeof bank_account_no !== 'undefined') { updates.push('bank_account_no = ?'); params.push(bank_account_no); }
    if (typeof bank_account_holder !== 'undefined') { updates.push('bank_account_holder = ?'); params.push(bank_account_holder); }
    if (typeof bank_ifsc !== 'undefined') { updates.push('bank_ifsc = ?'); params.push(bank_ifsc); }
    if (typeof bank_passbook_photo !== 'undefined') { updates.push('bank_passbook_photo = ?'); params.push(bank_passbook_photo); }

    if (updates.length > 0) {
      params.push(req.user!.id);
      await db.query(`UPDATE delivery_partners SET ${updates.join(', ')} WHERE user_id = ?`, params);
    }

    // Update user account details if name, phone, address or payment methods changed
    const userUpdates: string[] = [];
    const userParams: any[] = [];
    if (name) { userUpdates.push('name = ?'); userParams.push(name); }
    if (phone) { userUpdates.push('phone = ?'); userParams.push(phone); }
    if (profile_photo || passport_photo) { userUpdates.push('profile_photo = ?'); userParams.push(profile_photo || passport_photo); }
    if (address) { userUpdates.push('address = ?'); userParams.push(address); }
    if (payment_method) { userUpdates.push('payment_method = ?'); userParams.push(payment_method); }
    if (typeof upi_id !== 'undefined') { userUpdates.push('upi_id = ?'); userParams.push(upi_id); }
    if (typeof upi_qr_photo !== 'undefined') { userUpdates.push('upi_qr_photo = ?'); userParams.push(upi_qr_photo); }
    if (typeof bank_name !== 'undefined') { userUpdates.push('bank_name = ?'); userParams.push(bank_name); }
    if (typeof bank_account_no !== 'undefined') { userUpdates.push('bank_account_no = ?'); userParams.push(bank_account_no); }
    if (typeof bank_account_holder !== 'undefined') { userUpdates.push('bank_account_holder = ?'); userParams.push(bank_account_holder); }
    if (typeof bank_ifsc !== 'undefined') { userUpdates.push('bank_ifsc = ?'); userParams.push(bank_ifsc); }
    if (typeof bank_passbook_photo !== 'undefined') { userUpdates.push('bank_passbook_photo = ?'); userParams.push(bank_passbook_photo); }

    if (userUpdates.length > 0) {
      userParams.push(req.user!.id);
      await db.query(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
    }

    const updatedDpRes = await db.query('SELECT * FROM delivery_partners WHERE user_id = ? LIMIT 1', [req.user!.id]);
    const updatedDp = formatDeliveryPartnerRow(updatedDpRes.rows[0]);

    return res.json({
      success: true,
      message: 'Delivery partner profile and payment method updated successfully (রাইডার প্রোফাইল ও পেমেন্ট তথ্য সফলভাবে সংরক্ষিত হয়েছে)',
      data: updatedDp
    });
  }

  // In-memory fallback
  const store = db.getStore();
  const dp = store.delivery_partners.find((d: any) => d.user_id === req.user!.id);

  if (!dp) {
    return res.status(404).json({ success: false, message: 'Delivery partner profile not found' });
  }

  if (name) dp.name = name;
  if (phone) dp.phone = phone;
  if (vehicle_type) dp.vehicle_type = vehicle_type;
  if (vehicle_number) dp.vehicle_number = vehicle_number;
  if (driving_license_number) dp.driving_license_number = driving_license_number;
  if (age) dp.age = Number(age);
  if (gender) dp.gender = gender;
  if (address) dp.address = address;
  if (passport_photo) dp.passport_photo = passport_photo;
  if (profile_photo) dp.profile_photo = profile_photo;
  if (aadhaar_photo) dp.aadhaar_photo = aadhaar_photo;
  if (vehicle_photo) dp.vehicle_photo = vehicle_photo;

  if (payment_method) dp.payment_method = payment_method;
  if (typeof upi_id !== 'undefined') dp.upi_id = upi_id;
  if (typeof upi_qr_photo !== 'undefined') dp.upi_qr_photo = upi_qr_photo;
  if (typeof bank_name !== 'undefined') dp.bank_name = bank_name;
  if (typeof bank_account_no !== 'undefined') dp.bank_account_no = bank_account_no;
  if (typeof bank_account_holder !== 'undefined') dp.bank_account_holder = bank_account_holder;
  if (typeof bank_ifsc !== 'undefined') dp.bank_ifsc = bank_ifsc;
  if (typeof bank_passbook_photo !== 'undefined') dp.bank_passbook_photo = bank_passbook_photo;

  const riderUser = store.users.find((u: any) => u.id === dp.user_id);
  if (riderUser) {
    if (name) riderUser.name = name;
    if (phone) riderUser.phone = phone;
    if (passport_photo || profile_photo) riderUser.profile_photo = profile_photo || passport_photo;
    if (address) riderUser.address = address;
    if (payment_method) riderUser.payment_method = payment_method;
    if (typeof upi_id !== 'undefined') riderUser.upi_id = upi_id;
    if (typeof upi_qr_photo !== 'undefined') riderUser.upi_qr_photo = upi_qr_photo;
    if (typeof bank_name !== 'undefined') riderUser.bank_name = bank_name;
    if (typeof bank_account_no !== 'undefined') riderUser.bank_account_no = bank_account_no;
    if (typeof bank_account_holder !== 'undefined') riderUser.bank_account_holder = bank_account_holder;
    if (typeof bank_ifsc !== 'undefined') riderUser.bank_ifsc = bank_ifsc;
    if (typeof bank_passbook_photo !== 'undefined') riderUser.bank_passbook_photo = bank_passbook_photo;
  }

  return res.json({
    success: true,
    message: 'Delivery partner profile and payment method updated successfully (রাইডার প্রোফাইল ও পেমেন্ট তথ্য সফলভাবে সংরক্ষিত হয়েছে)',
    data: dp
  });
});

// Toggle Online/Offline Status
deliveryRouter.post('/status', authenticateToken, requireRole(['delivery']), async (req: AuthenticatedRequest, res: Response) => {
  const { is_online, lat, lng } = req.body;

  if (db.isUsingMysql()) {
    const dpRes = await db.query('SELECT * FROM delivery_partners WHERE user_id = ? LIMIT 1', [req.user!.id]);
    const dp = dpRes.rows[0];

    if (!dp) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found' });
    }

    if (dp.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: dp.status === 'blocked'
          ? 'Your account has been blocked by admin (আপনার অ্যাকাউন্টটি ব্লক করা রয়েছে)'
          : 'Account pending admin approval. You can only go online after Admin approves your profile. (অ্যাকাউন্টটি অ্যাডমিন অনুমোদনের অপেক্ষায় রয়েছে)'
      });
    }

    const nextOnlineState = is_online ? 1 : 0;
    if (nextOnlineState === 1) {
      if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
        await db.query(
          'UPDATE delivery_partners SET is_online = 1, current_lat = ?, current_lng = ?, last_location_updated_at = NOW() WHERE user_id = ?',
          [Number(lat), Number(lng), req.user!.id]
        );
      } else {
        await db.query(
          'UPDATE delivery_partners SET is_online = 1, last_location_updated_at = NOW() WHERE user_id = ?',
          [req.user!.id]
        );
      }
    } else {
      await db.query(
        'UPDATE delivery_partners SET is_online = 0, last_location_updated_at = NULL WHERE user_id = ?',
        [req.user!.id]
      );
    }

    const updatedDpRes = await db.query('SELECT * FROM delivery_partners WHERE user_id = ? LIMIT 1', [req.user!.id]);
    const updatedDp = formatDeliveryPartnerRow(updatedDpRes.rows[0]);

    return res.json({
      success: true,
      message: updatedDp.is_online ? 'You are now ONLINE and ready for orders' : 'You are now OFFLINE. Tracking stopped.',
      data: {
        is_online: updatedDp.is_online,
        current_lat: updatedDp.current_lat,
        current_lng: updatedDp.current_lng
      }
    });
  }

  // In-memory fallback
  const store = db.getStore();
  const dp = store.delivery_partners.find((d: any) => d.user_id === req.user!.id);

  if (!dp) {
    return res.status(404).json({ success: false, message: 'Delivery partner not found' });
  }

  if (dp.status !== 'approved') {
    return res.status(403).json({
      success: false,
      message: dp.status === 'blocked'
        ? 'Your account has been blocked by admin (আপনার অ্যাকাউন্টটি ব্লক করা রয়েছে)'
        : 'Account pending admin approval. You can only go online after Admin approves your profile. (অ্যাকাউন্টটি অ্যাডমিন অনুমোদনের অপেক্ষায় রয়েছে)'
    });
  }

  dp.is_online = is_online ? 1 : 0;

  if (dp.is_online) {
    if (lat && lng) {
      dp.current_lat = Number(lat);
      dp.current_lng = Number(lng);
      dp.last_location_updated_at = new Date().toISOString();
    }
  } else {
    dp.last_location_updated_at = null;
  }

  return res.json({
    success: true,
    message: dp.is_online ? 'You are now ONLINE and ready for orders' : 'You are now OFFLINE. Tracking stopped.',
    data: {
      is_online: dp.is_online,
      current_lat: dp.current_lat,
      current_lng: dp.current_lng
    }
  });
});

// Live Location Ping (only allowed when rider is online or actively delivering)
deliveryRouter.post('/location', authenticateToken, requireRole(['delivery']), async (req: AuthenticatedRequest, res: Response) => {
  const { lat, lng } = req.body;
  const numLat = Number(lat);
  const numLng = Number(lng);

  if (isNaN(numLat) || isNaN(numLng) || numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) {
    return res.status(400).json({ success: false, message: 'Valid latitude (-90 to 90) and longitude (-180 to 180) are required' });
  }

  if (db.isUsingMysql()) {
    const dpRes = await db.query('SELECT * FROM delivery_partners WHERE user_id = ? LIMIT 1', [req.user!.id]);
    const dp = dpRes.rows[0];

    if (!dp) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found' });
    }

    const activeOrderRes = await db.query(
      `SELECT * FROM orders WHERE delivery_partner_id = ? AND status IN ('confirmed', 'preparing', 'ready_for_pickup', 'on_the_way') LIMIT 1`,
      [dp.id]
    );
    const activeOrder = activeOrderRes.rows[0];

    if (!dp.is_online && !activeOrder) {
      return res.status(400).json({
        success: false,
        message: 'Tracking rejected: Partner is offline and has no active delivery'
      });
    }

    await db.query(
      'UPDATE delivery_partners SET current_lat = ?, current_lng = ?, last_location_updated_at = NOW() WHERE id = ?',
      [numLat, numLng, dp.id]
    );

    if (activeOrder) {
      await db.query(
        'UPDATE orders SET delivery_partner_lat = ?, delivery_partner_lng = ? WHERE id = ?',
        [numLat, numLng, activeOrder.id]
      );
    }

    return res.json({
      success: true,
      data: { lat: numLat, lng: numLng }
    });
  }

  // In-memory fallback
  const store = db.getStore();
  const dp = store.delivery_partners.find((d: any) => d.user_id === req.user!.id);

  if (!dp) {
    return res.status(404).json({ success: false, message: 'Delivery partner not found' });
  }

  if (!dp.is_online && !dp.active_order_id) {
    return res.status(400).json({
      success: false,
      message: 'Tracking rejected: Partner is offline and has no active delivery'
    });
  }

  dp.current_lat = numLat;
  dp.current_lng = numLng;
  dp.last_location_updated_at = new Date().toISOString();

  if (dp.active_order_id) {
    const order = store.orders.find((o: any) => o.id === dp.active_order_id);
    if (order) {
      order.delivery_partner_lat = numLat;
      order.delivery_partner_lng = numLng;
    }
  }

  return res.json({
    success: true,
    data: { lat: dp.current_lat, lng: dp.current_lng }
  });
});

// Accept delivery assignment (Uses MySQL Transaction & Conditional UPDATE to prevent race conditions)
deliveryRouter.post('/orders/:id/accept', authenticateToken, requireRole(['delivery']), async (req: AuthenticatedRequest, res: Response) => {
  const orderId = Number(req.params.id);

  if (db.isUsingMysql()) {
    const pool = db.getPool();
    if (!pool) throw new Error('Database pool uninitialized');
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // Lock rider row
      const [dpRows]: any = await conn.execute('SELECT * FROM delivery_partners WHERE user_id = ? LIMIT 1 FOR UPDATE', [req.user!.id]);
      const dp = dpRows[0];

      if (!dp) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({ success: false, message: 'Delivery partner profile not found' });
      }

      // Lock order row
      const [orderRows]: any = await conn.execute('SELECT * FROM orders WHERE id = ? LIMIT 1 FOR UPDATE', [orderId]);
      const order = orderRows[0];

      if (!order) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      // Race condition check: Ensure job is not already accepted by another rider
      if (order.delivery_partner_id && Number(order.delivery_partner_id) !== Number(dp.id) && !order.rider_requested) {
        await conn.rollback();
        conn.release();
        return res.status(409).json({
          success: false,
          message: 'This delivery job was already accepted by another partner'
        });
      }

      // Auto-approve partner if needed
      if (dp.status !== 'approved') {
        await conn.execute("UPDATE delivery_partners SET status = 'approved' WHERE id = ?", [dp.id]);
      }

      // Execute conditional atomic update
      const [updateResult]: any = await conn.execute(
        `UPDATE orders SET
          delivery_partner_id = ?,
          delivery_partner_name = ?,
          delivery_partner_phone = ?,
          delivery_partner_lat = COALESCE(?, restaurant_lat),
          delivery_partner_lng = COALESCE(?, restaurant_lng),
          rider_accepted = 1,
          rider_accepted_at = NOW(),
          status = CASE WHEN status IN ('placed', 'pending') THEN 'confirmed' ELSE status END
         WHERE id = ? AND (delivery_partner_id IS NULL OR delivery_partner_id = ? OR rider_requested = 1)`,
        [dp.id, dp.name, dp.phone, dp.current_lat, dp.current_lng, orderId, dp.id]
      );

      if (updateResult.affectedRows === 0) {
        await conn.rollback();
        conn.release();
        return res.status(409).json({
          success: false,
          message: 'This delivery job was already accepted by another partner'
        });
      }

      await conn.execute('UPDATE delivery_partners SET is_online = 1 WHERE id = ?', [dp.id]);

      await conn.commit();
      conn.release();

      // Fetch updated order for response payload
      const [updatedOrderRows]: any = await db.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [orderId]);
      const updatedOrder = updatedOrderRows.rows[0];

      // Notify restaurant owner
      if (updatedOrder.restaurant_id) {
        const restRes = await db.query('SELECT user_id FROM restaurants WHERE id = ? LIMIT 1', [updatedOrder.restaurant_id]);
        if (restRes.rows[0]?.user_id) {
          notificationService.createNotification({
            userId: restRes.rows[0].user_id,
            role: 'restaurant',
            title: `Rider Accepted & Assigned: ${dp.name}`,
            title_bn: `রাইডার অর্ডার গ্রহণ করেছেন: ${dp.name}`,
            message: `Delivery partner ${dp.name} (Phone: ${dp.phone}) accepted order #${updatedOrder.order_number} and is heading to your restaurant. Order is confirmed!`,
            message_bn: `ডেলিভারি পার্টনার ${dp.name} (ফোন: ${dp.phone}) অর্ডার #${updatedOrder.order_number} গ্রহণ করেছেন ও রেস্তোরাঁয় আসছেন। অর্ডার কনফার্ম হয়েছে!`,
            type: 'assignment',
            data: { orderId: updatedOrder.id }
          });
        }
      }

      // Notify customer
      if (updatedOrder.customer_id) {
        notificationService.createNotification({
          userId: updatedOrder.customer_id,
          role: 'customer',
          title: `Order Accepted & Rider Assigned!`,
          title_bn: `অর্ডার কনফার্ম হয়েছে ও রাইডার অ্যাসাইন হয়েছে!`,
          message: `Rider ${dp.name} (${dp.phone}) accepted your order #${updatedOrder.order_number} from ${updatedOrder.restaurant_name}.`,
          message_bn: `রাইডার ${dp.name} (${dp.phone}) আপনার অর্ডার #${updatedOrder.order_number} গ্রহণ করেছেন। রেস্তোরাঁ খাবার প্রস্তুত করছে।`,
          type: 'order_status',
          data: { orderId: updatedOrder.id, status: 'accepted' }
        });
      }

      return res.json({
        success: true,
        message: `Delivery ride accepted! Assigned to you. (রাইড গ্রহণ করা হয়েছে: ${updatedOrder.order_number})`,
        data: updatedOrder
      });
    } catch (err: any) {
      await conn.rollback();
      conn.release();
      return res.status(500).json({ success: false, message: err.message || 'Failed to accept ride' });
    }
  }

  // In-memory fallback
  const store = db.getStore();
  const dp = store.delivery_partners.find((d: any) => d.user_id === req.user!.id);
  const order = store.orders.find((o: any) => o.id === orderId);

  if (!dp || !order) {
    return res.status(404).json({ success: false, message: 'Order or Partner not found' });
  }

  if (dp.status !== 'approved') {
    dp.status = 'approved';
  }

  if (order.delivery_partner_id && order.delivery_partner_id !== dp.id && !order.rider_requested) {
    return res.status(409).json({
      success: false,
      message: 'This delivery job was already accepted by another partner'
    });
  }

  dp.is_online = 1;
  order.delivery_partner_id = dp.id;
  order.delivery_partner_name = dp.name;
  order.delivery_partner_phone = dp.phone;
  order.delivery_partner_lat = dp.current_lat || order.restaurant_lat;
  order.delivery_partner_lng = dp.current_lng || order.restaurant_lng;
  order.rider_accepted = 1;
  order.rider_accepted_at = new Date().toISOString();

  if (order.status === 'pending' || order.status === 'assigned' || !order.status) {
    order.status = 'accepted';
    order.accepted_at = order.accepted_at || new Date().toISOString();
  }
  dp.active_order_id = order.id;

  const restaurant = store.restaurants.find((r: any) => r.id === order.restaurant_id);
  if (restaurant) {
    notificationService.createNotification({
      userId: restaurant.user_id,
      role: 'restaurant',
      title: `Rider Accepted & Assigned: ${dp.name}`,
      title_bn: `রাইডার অর্ডার গ্রহণ করেছেন: ${dp.name}`,
      message: `Delivery partner ${dp.name} (Phone: ${dp.phone}) accepted order #${order.order_number} and is heading to your restaurant. Order is confirmed!`,
      message_bn: `ডেলিভারি পার্টনার ${dp.name} (ফোন: ${dp.phone}) অর্ডার #${order.order_number} গ্রহণ করেছেন ও রেস্তোরাঁয় আসছেন। অর্ডার কনফার্ম হয়েছে!`,
      type: 'assignment',
      data: { orderId: order.id }
    });
  }

  notificationService.createNotification({
    userId: order.customer_id,
    role: 'customer',
    title: `Order Accepted & Rider Assigned!`,
    title_bn: `অর্ডার কনফার্ম হয়েছে ও রাইডার অ্যাসাইন হয়েছে!`,
    message: `Rider ${dp.name} (${dp.phone}) accepted your order #${order.order_number} from ${order.restaurant_name}.`,
    message_bn: `রাইডার ${dp.name} (${dp.phone}) আপনার অর্ডার #${order.order_number} গ্রহণ করেছেন। রেস্তোরাঁ খাবার প্রস্তুত করছে।`,
    type: 'order_status',
    data: { orderId: order.id, status: 'accepted' }
  });

  return res.json({
    success: true,
    message: `Delivery ride accepted! Assigned to you. (রাইড গ্রহণ করা হয়েছে: ${order.order_number})`,
    data: order
  });
});

// Decline / Reject delivery assignment
deliveryRouter.post('/orders/:id/decline', authenticateToken, requireRole(['delivery']), async (req: AuthenticatedRequest, res: Response) => {
  const orderId = Number(req.params.id);

  if (db.isUsingMysql()) {
    const dpRes = await db.query('SELECT * FROM delivery_partners WHERE user_id = ? LIMIT 1', [req.user!.id]);
    const dp = dpRes.rows[0];

    const orderRes = await db.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [orderId]);
    const order = orderRes.rows[0];

    if (!dp || !order) {
      return res.status(404).json({ success: false, message: 'Order or Partner not found' });
    }

    if (order.delivery_partner_id === dp.id) {
      await db.query(
        'UPDATE orders SET delivery_partner_id = NULL, delivery_partner_name = NULL, delivery_partner_phone = NULL, rider_accepted = 0 WHERE id = ?',
        [orderId]
      );
    }

    const updatedOrderRes = await db.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [orderId]);

    return res.json({
      success: true,
      message: `Delivery order #${order.order_number} declined. (অর্ডারটি বাদ দেওয়া হয়েছে)`,
      data: updatedOrderRes.rows[0]
    });
  }

  // In-memory fallback
  const store = db.getStore();
  const dp = store.delivery_partners.find((d: any) => d.user_id === req.user!.id);
  const order = store.orders.find((o: any) => o.id === orderId);

  if (!dp || !order) {
    return res.status(404).json({ success: false, message: 'Order or Partner not found' });
  }

  if (order.delivery_partner_id === dp.id) {
    order.delivery_partner_id = null;
    order.delivery_partner_name = null;
    order.delivery_partner_phone = null;
    order.rider_accepted = 0;
  }
  if (dp.active_order_id === order.id) {
    dp.active_order_id = null;
  }

  return res.json({
    success: true,
    message: `Delivery order #${order.order_number} declined. (অর্ডারটি বাদ দেওয়া হয়েছে)`,
    data: order
  });
});

// Delivery History: List all completed / past deliveries for current delivery partner
deliveryRouter.get('/history', authenticateToken, requireRole(['delivery']), async (req: AuthenticatedRequest, res: Response) => {
  if (db.isUsingMysql()) {
    const dpRes = await db.query('SELECT id FROM delivery_partners WHERE user_id = ? LIMIT 1', [req.user!.id]);
    const dp = dpRes.rows[0];

    if (!dp) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found' });
    }

    const partnerOrdersRes = await db.query('SELECT * FROM orders WHERE delivery_partner_id = ? ORDER BY id DESC', [dp.id]);

    return res.json({
      success: true,
      data: partnerOrdersRes.rows
    });
  }

  // In-memory fallback
  const store = db.getStore();
  const dp = store.delivery_partners.find((d: any) => d.user_id === req.user!.id);

  if (!dp) {
    return res.status(404).json({ success: false, message: 'Delivery partner not found' });
  }

  const partnerOrders = store.orders.filter((o: any) => o.delivery_partner_id === dp.id);

  return res.json({
    success: true,
    data: partnerOrders
  });
});

// Commission & Payment: Detailed earnings, wallet balance, payout breakdown
deliveryRouter.get('/earnings', authenticateToken, requireRole(['delivery']), async (req: AuthenticatedRequest, res: Response) => {
  if (db.isUsingMysql()) {
    const dpRes = await db.query('SELECT * FROM delivery_partners WHERE user_id = ? LIMIT 1', [req.user!.id]);
    const dpRaw = dpRes.rows[0];

    if (!dpRaw) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found' });
    }

    const dp = formatDeliveryPartnerRow(dpRaw);

    let walletRes = await db.query('SELECT * FROM wallets WHERE user_id = ? LIMIT 1', [dp.user_id]);
    let wallet = walletRes.rows[0];

    if (!wallet) {
      const insW = await db.query(
        `INSERT INTO wallets (user_id, role, balance, total_earned, total_withdrawn)
         VALUES (?, 'delivery', ?, ?, 0.00)`,
        [dp.user_id, dp.wallet_balance || 0, (dp.wallet_balance || 0) + 120]
      );
      const newWalletId = insW.insertId || (insW.rows as any)?.insertId || 1;
      walletRes = await db.query('SELECT * FROM wallets WHERE id = ? LIMIT 1', [newWalletId]);
      wallet = walletRes.rows[0] || {
        id: newWalletId,
        user_id: dp.user_id,
        role: 'delivery',
        balance: dp.wallet_balance || 0,
        total_earned: (dp.wallet_balance || 0) + 120,
        total_withdrawn: 0
      };
    } else {
      wallet = {
        ...wallet,
        balance: Number(wallet.balance),
        total_earned: Number(wallet.total_earned),
        total_withdrawn: Number(wallet.total_withdrawn)
      };
    }

    let settings: any = {};
    const settingsRes = await db.query('SELECT * FROM platform_settings LIMIT 1', []);
    if (settingsRes.rows[0]?.setting_value) {
      try { settings = JSON.parse(settingsRes.rows[0].setting_value); } catch {}
    }

    const commissionRate = Number(settings.delivery_partner_commission_percent ?? 10.0);
    const minFareGuarantee = Number(settings.min_delivery_fare ?? 20.0);

    const completedOrdersRes = await db.query(
      "SELECT * FROM orders WHERE delivery_partner_id = ? AND status = 'delivered' ORDER BY id DESC",
      [dp.id]
    );

    const transactionsRes = await db.query(
      'SELECT * FROM wallet_transactions WHERE wallet_id = ? ORDER BY id DESC',
      [wallet.id]
    );

    return res.json({
      success: true,
      data: {
        wallet,
        commission_rate_percent: commissionRate,
        rider_share_percent: 100 - commissionRate,
        min_fare_guarantee: minFareGuarantee,
        total_completed_trips: completedOrdersRes.rows.length,
        payout_account: {
          upi_id: dp.upi_id || `${dp.phone}@upi`,
          bank_name: dp.bank_name || 'State Bank of India',
          account_number: dp.bank_account_no || '•••• •••• 4421',
          ifsc_code: dp.bank_ifsc || 'SBIN0001234',
          beneficiary_name: dp.bank_account_holder || dp.name
        },
        completed_orders: completedOrdersRes.rows,
        transactions: transactionsRes.rows
      }
    });
  }

  // In-memory fallback
  const store = db.getStore();
  const dp = store.delivery_partners.find((d: any) => d.user_id === req.user!.id);

  if (!dp) {
    return res.status(404).json({ success: false, message: 'Delivery partner not found' });
  }

  let wallet = store.wallets.find((w: any) => w.user_id === dp.user_id);
  if (!wallet) {
    wallet = {
      id: store.wallets.length + 1,
      user_id: dp.user_id,
      role: 'delivery',
      balance: dp.wallet_balance || 0,
      total_earned: (dp.wallet_balance || 0) + 120,
      total_withdrawn: 0
    };
    store.wallets.push(wallet);
  }

  const settings = store.settings || {};
  const commissionRate = Number(settings.delivery_partner_commission_percent ?? 10.0);
  const minFareGuarantee = Number(settings.min_delivery_fare ?? 20.0);

  const completedOrders = store.orders.filter(
    (o: any) => o.delivery_partner_id === dp.id && o.status === 'delivered'
  );

  const transactions = (store.wallet_transactions || []).filter(
    (t: any) => t.wallet_id === wallet.id
  );

  return res.json({
    success: true,
    data: {
      wallet,
      commission_rate_percent: commissionRate,
      rider_share_percent: 100 - commissionRate,
      min_fare_guarantee: minFareGuarantee,
      total_completed_trips: completedOrders.length,
      payout_account: dp.payout_account || {
        upi_id: `${dp.phone}@upi`,
        bank_name: 'State Bank of India',
        account_number: '•••• •••• 4421',
        ifsc_code: 'SBIN0001234',
        beneficiary_name: dp.name
      },
      completed_orders: completedOrders,
      transactions
    }
  });
});

// Request Payout / Withdrawal
deliveryRouter.post('/payout-request', authenticateToken, requireRole(['delivery']), async (req: AuthenticatedRequest, res: Response) => {
  const { amount, method, upi_id, bank_name, account_number, ifsc_code, beneficiary_name } = req.body;
  const numAmount = Number(amount);

  if (!numAmount || numAmount < 50) {
    return res.status(400).json({
      success: false,
      message: 'Minimum withdrawal amount is ₹50 (সর্বনিম্ন উত্তোলনের পরিমাণ ৫০ টাকা)'
    });
  }

  if (db.isUsingMysql()) {
    const pool = db.getPool();
    if (!pool) throw new Error('Database pool uninitialized');
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [dpRows]: any = await conn.execute('SELECT * FROM delivery_partners WHERE user_id = ? LIMIT 1 FOR UPDATE', [req.user!.id]);
      const dp = dpRows[0];

      if (!dp) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({ success: false, message: 'Delivery partner not found' });
      }

      let [walletRows]: any = await conn.execute('SELECT * FROM wallets WHERE user_id = ? LIMIT 1 FOR UPDATE', [dp.user_id]);
      let wallet = walletRows[0];

      if (!wallet) {
        const [wIns]: any = await conn.execute(
          `INSERT INTO wallets (user_id, role, balance, total_earned, total_withdrawn) VALUES (?, 'delivery', ?, ?, 0.00)`,
          [dp.user_id, dp.wallet_balance || 0, dp.wallet_balance || 0]
        );
        const [wRef]: any = await conn.execute('SELECT * FROM wallets WHERE id = ? LIMIT 1', [wIns.insertId]);
        wallet = wRef[0];
      }

      if (Number(wallet.balance) < numAmount) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({
          success: false,
          message: `Insufficient wallet balance. Available: ₹${wallet.balance} (পর্যাপ্ত ব্যালেন্স নেই)`
        });
      }

      const newBalance = Number(wallet.balance) - numAmount;
      const newWithdrawn = Number(wallet.total_withdrawn || 0) + numAmount;

      await conn.execute('UPDATE wallets SET balance = ?, total_withdrawn = ? WHERE id = ?', [newBalance, newWithdrawn, wallet.id]);
      await conn.execute('UPDATE delivery_partners SET wallet_balance = ? WHERE id = ?', [newBalance, dp.id]);

      const [txRes]: any = await conn.execute(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, description, reference_id)
         VALUES (?, 'debit', ?, ?, ?, ?)`,
        [
          wallet.id,
          numAmount,
          newBalance,
          `Payout requested via ${method === 'upi' ? `UPI (${upi_id || dp.upi_id || 'Self'})` : 'Bank Transfer'}`,
          `payout_${Date.now()}`
        ]
      );

      await conn.execute(
        `INSERT INTO payout_requests (user_id, role, amount, method, upi_id, bank_name, bank_account_no, bank_ifsc, status)
         VALUES (?, 'delivery', ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          dp.user_id,
          numAmount,
          method === 'bank' ? 'bank' : 'upi',
          upi_id || dp.upi_id || null,
          bank_name || dp.bank_name || null,
          account_number || dp.bank_account_no || null,
          ifsc_code || dp.bank_ifsc || null
        ]
      );

      await conn.commit();
      conn.release();

      const updatedWallet = {
        ...wallet,
        balance: newBalance,
        total_withdrawn: newWithdrawn
      };

      const newTxn = {
        id: txRes.insertId,
        wallet_id: wallet.id,
        amount: numAmount,
        type: 'debit',
        description: `Payout requested via ${method === 'upi' ? `UPI (${upi_id || 'Self'})` : 'Bank Transfer'}`,
        status: 'completed',
        created_at: new Date().toISOString()
      };

      return res.json({
        success: true,
        message: `Payout request of ₹${numAmount} submitted successfully! (₹${numAmount} টাকা উত্তোলনের অনুরোধ গৃহীত হয়েছে)`,
        data: {
          wallet: updatedWallet,
          transaction: newTxn
        }
      });
    } catch (err: any) {
      await conn.rollback();
      conn.release();
      return res.status(500).json({ success: false, message: err.message || 'Payout request failed' });
    }
  }

  // In-memory fallback
  const store = db.getStore();
  const dp = store.delivery_partners.find((d: any) => d.user_id === req.user!.id);

  if (!dp) {
    return res.status(404).json({ success: false, message: 'Delivery partner not found' });
  }

  let wallet = store.wallets.find((w: any) => w.user_id === dp.user_id);
  if (!wallet) {
    wallet = {
      id: store.wallets.length + 1,
      user_id: dp.user_id,
      role: 'delivery',
      balance: dp.wallet_balance || 0,
      total_earned: dp.wallet_balance || 0,
      total_withdrawn: 0
    };
    store.wallets.push(wallet);
  }

  if (Number(wallet.balance) < numAmount) {
    return res.status(400).json({
      success: false,
      message: `Insufficient wallet balance. Available: ₹${wallet.balance} (পর্যাপ্ত ব্যালেন্স নেই)`
    });
  }

  wallet.balance = Number(wallet.balance) - numAmount;
  wallet.total_withdrawn = Number(wallet.total_withdrawn || 0) + numAmount;
  dp.wallet_balance = wallet.balance;

  const newTxnId = (store.wallet_transactions?.length || 0) + 1;
  const newTxn = {
    id: newTxnId,
    wallet_id: wallet.id,
    amount: numAmount,
    type: 'debit',
    reference_type: 'payout_withdrawal',
    reference_id: newTxnId,
    description: `Payout requested via ${method === 'upi' ? `UPI (${upi_id || 'Self'})` : 'Bank Transfer'}`,
    status: 'completed',
    created_at: new Date().toISOString()
  };

  if (!store.wallet_transactions) {
    store.wallet_transactions = [];
  }
  store.wallet_transactions.unshift(newTxn);

  return res.json({
    success: true,
    message: `Payout request of ₹${numAmount} submitted successfully! (₹${numAmount} টাকা উত্তোলনের অনুরোধ গৃহীত হয়েছে)`,
    data: {
      wallet,
      transaction: newTxn
    }
  });
});

// Update Payout Method / Bank Account / UPI
deliveryRouter.post('/payout-method', authenticateToken, requireRole(['delivery']), async (req: AuthenticatedRequest, res: Response) => {
  const { upi_id, bank_name, account_number, ifsc_code, beneficiary_name } = req.body;

  if (db.isUsingMysql()) {
    const dpRes = await db.query('SELECT * FROM delivery_partners WHERE user_id = ? LIMIT 1', [req.user!.id]);
    const dp = dpRes.rows[0];

    if (!dp) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (typeof upi_id !== 'undefined') { updates.push('upi_id = ?'); params.push(upi_id); }
    if (typeof bank_name !== 'undefined') { updates.push('bank_name = ?'); params.push(bank_name); }
    if (typeof account_number !== 'undefined') { updates.push('bank_account_no = ?'); params.push(account_number); }
    if (typeof ifsc_code !== 'undefined') { updates.push('bank_ifsc = ?'); params.push(ifsc_code); }
    if (typeof beneficiary_name !== 'undefined') { updates.push('bank_account_holder = ?'); params.push(beneficiary_name); }

    if (updates.length > 0) {
      params.push(req.user!.id);
      await db.query(`UPDATE delivery_partners SET ${updates.join(', ')} WHERE user_id = ?`, params);
    }

    const updatedDpRes = await db.query('SELECT * FROM delivery_partners WHERE user_id = ? LIMIT 1', [req.user!.id]);
    const updatedDp = updatedDpRes.rows[0];

    const payout_account = {
      upi_id: updatedDp.upi_id || `${updatedDp.phone}@upi`,
      bank_name: updatedDp.bank_name || 'State Bank of India',
      account_number: updatedDp.bank_account_no || '•••• •••• 4421',
      ifsc_code: updatedDp.bank_ifsc || 'SBIN0001234',
      beneficiary_name: updatedDp.bank_account_holder || updatedDp.name
    };

    return res.json({
      success: true,
      message: 'Payout payment method updated successfully (পেমেন্ট ডিটেইলস আপডেট করা হয়েছে)',
      data: payout_account
    });
  }

  // In-memory fallback
  const store = db.getStore();
  const dp = store.delivery_partners.find((d: any) => d.user_id === req.user!.id);

  if (!dp) {
    return res.status(404).json({ success: false, message: 'Delivery partner not found' });
  }

  dp.payout_account = {
    upi_id: upi_id || '',
    bank_name: bank_name || '',
    account_number: account_number || '',
    ifsc_code: ifsc_code || '',
    beneficiary_name: beneficiary_name || dp.name
  };

  return res.json({
    success: true,
    message: 'Payout payment method updated successfully (পেমেন্ট ডিটেইলস আপডেট করা হয়েছে)',
    data: dp.payout_account
  });
});
