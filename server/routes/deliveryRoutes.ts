import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/authMiddleware';
import { notificationService } from '../services/notificationService';

export const deliveryRouter = Router();

// Get Delivery Partner Profile & Stats
deliveryRouter.get('/profile', authenticateToken, requireRole(['delivery', 'admin']), (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  let dp = store.delivery_partners.find((d: any) => d.user_id === req.user!.id);

  if (!dp) {
    // If delivery partner entry missing for this user, create their pending record
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
deliveryRouter.put('/profile', authenticateToken, requireRole(['delivery', 'admin']), (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const dp = store.delivery_partners.find((d: any) => d.user_id === req.user!.id);

  if (!dp) {
    return res.status(404).json({ success: false, message: 'Delivery partner profile not found' });
  }

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

  // Payment details
  if (payment_method) dp.payment_method = payment_method;
  if (typeof upi_id !== 'undefined') dp.upi_id = upi_id;
  if (typeof upi_qr_photo !== 'undefined') dp.upi_qr_photo = upi_qr_photo;
  if (typeof bank_name !== 'undefined') dp.bank_name = bank_name;
  if (typeof bank_account_no !== 'undefined') dp.bank_account_no = bank_account_no;
  if (typeof bank_account_holder !== 'undefined') dp.bank_account_holder = bank_account_holder;
  if (typeof bank_ifsc !== 'undefined') dp.bank_ifsc = bank_ifsc;
  if (typeof bank_passbook_photo !== 'undefined') dp.bank_passbook_photo = bank_passbook_photo;

  // Update associated user account if any
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
deliveryRouter.post('/status', authenticateToken, requireRole(['delivery']), (req: AuthenticatedRequest, res: Response) => {
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


  const { is_online, lat, lng } = req.body;
  dp.is_online = is_online ? 1 : 0;

  if (dp.is_online) {
    // Only capture location when going online
    if (lat && lng) {
      dp.current_lat = Number(lat);
      dp.current_lng = Number(lng);
      dp.last_location_updated_at = new Date().toISOString();
    }
  } else {
    // When going offline, clear location tracking
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
deliveryRouter.post('/location', authenticateToken, requireRole(['delivery']), (req: AuthenticatedRequest, res: Response) => {
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

  const { lat, lng } = req.body;
  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'Coordinates required' });
  }

  dp.current_lat = Number(lat);
  dp.current_lng = Number(lng);
  dp.last_location_updated_at = new Date().toISOString();

  // If active order, update live tracking on order
  if (dp.active_order_id) {
    const order = store.orders.find((o: any) => o.id === dp.active_order_id);
    if (order) {
      order.delivery_partner_lat = Number(lat);
      order.delivery_partner_lng = Number(lng);
    }
  }

  return res.json({
    success: true,
    data: { lat: dp.current_lat, lng: dp.current_lng }
  });
});

// Accept delivery assignment
deliveryRouter.post('/orders/:id/accept', authenticateToken, requireRole(['delivery']), (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const orderId = Number(req.params.id);
  const dp = store.delivery_partners.find((d: any) => d.user_id === req.user!.id);
  const order = store.orders.find((o: any) => o.id === orderId);

  if (!dp || !order) {
    return res.status(404).json({ success: false, message: 'Order or Partner not found' });
  }

  if (dp.status !== 'approved') {
    dp.status = 'approved';
  }

  // If another partner was previously assigned but restaurant re-requested, allow re-acceptance
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
  
  // When delivery partner accepts, the order is confirmed and accepted
  if (order.status === 'pending' || order.status === 'assigned' || !order.status) {
    order.status = 'accepted';
    order.accepted_at = order.accepted_at || new Date().toISOString();
  }
  dp.active_order_id = order.id;

  // Notify restaurant owner with Rider contact & name
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

  // Notify customer that order is accepted and rider is assigned
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

// Decline / Reject delivery assignment (NO action)
deliveryRouter.post('/orders/:id/decline', authenticateToken, requireRole(['delivery']), (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const orderId = Number(req.params.id);
  const dp = store.delivery_partners.find((d: any) => d.user_id === req.user!.id);
  const order = store.orders.find((o: any) => o.id === orderId);

  if (!dp || !order) {
    return res.status(404).json({ success: false, message: 'Order or Partner not found' });
  }

  // If this order was assigned to this partner, release it back to pool
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
deliveryRouter.get('/history', authenticateToken, requireRole(['delivery']), (req: AuthenticatedRequest, res: Response) => {
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
deliveryRouter.get('/earnings', authenticateToken, requireRole(['delivery']), (req: AuthenticatedRequest, res: Response) => {
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
deliveryRouter.post('/payout-request', authenticateToken, requireRole(['delivery']), (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const dp = store.delivery_partners.find((d: any) => d.user_id === req.user!.id);

  if (!dp) {
    return res.status(404).json({ success: false, message: 'Delivery partner not found' });
  }

  const { amount, method, upi_id, account_number, ifsc_code, beneficiary_name } = req.body;
  const numAmount = Number(amount);

  if (!numAmount || numAmount < 50) {
    return res.status(400).json({
      success: false,
      message: 'Minimum withdrawal amount is ₹50 (সর্বনিম্ন উত্তোলনের পরিমাণ ৫০ টাকা)'
    });
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

  // Deduct from balance
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
deliveryRouter.post('/payout-method', authenticateToken, requireRole(['delivery']), (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const dp = store.delivery_partners.find((d: any) => d.user_id === req.user!.id);

  if (!dp) {
    return res.status(404).json({ success: false, message: 'Delivery partner not found' });
  }

  const { upi_id, bank_name, account_number, ifsc_code, beneficiary_name } = req.body;

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

