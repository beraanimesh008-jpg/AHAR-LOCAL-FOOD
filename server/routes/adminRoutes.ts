import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/authMiddleware';
import { notificationService } from '../services/notificationService';
import { orderService } from '../services/orderService';
import { locationService } from '../services/locationService';

export const adminRouter = Router();

// Apply auth & admin role requirement across all admin routes
adminRouter.use(authenticateToken, requireRole(['admin']));

// Admin Dashboard KPI Analytics
adminRouter.get('/dashboard', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();

  const totalCustomers = store.users.filter((u: any) => u.role === 'customer').length;
  const totalRestaurants = store.restaurants.length;
  const approvedRestaurants = store.restaurants.filter((r: any) => r.status === 'approved').length;
  const pendingRestaurants = store.restaurants.filter((r: any) => r.status === 'pending').length;

  const totalPartners = store.delivery_partners.length;
  const onlinePartners = store.delivery_partners.filter((p: any) => p.is_online === 1).length;
  const pendingPartners = store.delivery_partners.filter((p: any) => p.status === 'pending').length;

  const orders = store.orders;
  const totalOrders = orders.length;
  const activeOrders = orders.filter((o: any) => ['pending', 'accepted', 'preparing', 'ready', 'assigned', 'picked_up', 'on_the_way'].includes(o.status)).length;
  const completedOrders = orders.filter((o: any) => o.status === 'delivered').length;
  const cancelledOrders = orders.filter((o: any) => o.status === 'cancelled').length;

  const grossSales = orders.reduce((sum: number, o: any) => sum + Number(o.subtotal), 0);
  const totalRevenue = orders.reduce((sum: number, o: any) => sum + Number(o.grand_total), 0);
  const platformCommission = Math.round(orders.reduce((sum: number, o: any) => {
    const rest = store.restaurants.find((r: any) => r.id === o.restaurant_id);
    const rate = rest ? Number(rest.commission_rate) : 15;
    return sum + (Number(o.subtotal) * (rate / 100));
  }, 0) * 100) / 100;

  return res.json({
    success: true,
    data: {
      metrics: {
        totalCustomers,
        totalRestaurants,
        approvedRestaurants,
        pendingRestaurants,
        totalPartners,
        onlinePartners,
        pendingPartners,
        totalOrders,
        activeOrders,
        completedOrders,
        cancelledOrders,
        grossSales,
        totalRevenue,
        platformCommission
      },
      recentOrders: orders.slice(0, 10),
      serviceAreas: store.service_areas
    }
  });
});

// Admin: Get all restaurants
adminRouter.get('/restaurants', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const enriched = store.restaurants.map((rest: any) => {
    const ownerUser = store.users.find((u: any) => u.id === rest.user_id);
    const menu = store.foods.filter((f: any) => f.restaurant_id === rest.id);
    const photos = rest.photos && Array.isArray(rest.photos) && rest.photos.length > 0
      ? rest.photos
      : [rest.banner_url || rest.photo_url, rest.photo_url, rest.banner_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600'].filter(Boolean);

    return {
      ...rest,
      photos,
      owner_photo: ownerUser?.profile_photo || ownerUser?.passport_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      owner_phone: rest.phone || ownerUser?.phone,
      owner_email: rest.email || ownerUser?.email,
      menu_count: menu.length,
      menu,
      trade_license: rest.trade_license || 'TL-WB-2024-8891',
      gst_number: rest.gst_number || '19AAAAA0000A1Z5',
      payment_method: rest.payment_method || 'upi',
      upi_id: rest.upi_id || 'kolkatabiryani@okhdfcbank',
      upi_qr_photo: rest.upi_qr_photo || 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400',
      bank_name: rest.bank_name || 'State Bank of India',
      bank_account_no: rest.bank_account_no || rest.bank_account_number || '38291048291',
      bank_account_holder: rest.bank_account_holder || rest.owner_name || rest.name,
      bank_ifsc: rest.bank_ifsc || 'SBIN0001234',
      bank_passbook_photo: rest.bank_passbook_photo || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
      settlements: rest.settlements || [],
      created_at: rest.created_at || '2026-01-15T10:00:00.000Z'
    };
  });
  return res.json({ success: true, data: enriched });
});

// Admin: Settle payment / payout to a restaurant
adminRouter.post('/restaurants/:id/settle', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const restId = Number(req.params.id);
  const rest = store.restaurants.find((r: any) => r.id === restId);

  if (!rest) {
    return res.status(404).json({ success: false, message: 'Restaurant not found' });
  }

  const { amount, method, transaction_id, remarks } = req.body;
  const numAmount = Number(amount);

  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid settlement amount is required' });
  }

  if (!rest.settlements) rest.settlements = [];
  const settlementRecord = {
    id: rest.settlements.length + 1,
    amount: numAmount,
    method: method || rest.payment_method || 'upi',
    transaction_id: transaction_id || `SETTLE-REST-${Date.now()}`,
    remarks: remarks || 'Platform payout settlement to restaurant',
    recipient: rest.name,
    upi_id: rest.upi_id,
    bank_name: rest.bank_name,
    bank_account_no: rest.bank_account_no,
    status: 'completed',
    created_at: new Date().toISOString()
  };

  rest.settlements.unshift(settlementRecord);

  notificationService.createNotification({
    userId: rest.user_id,
    role: 'restaurant',
    title: 'Payout Settled (টাকা প্রদান সম্পন্ন)',
    title_bn: 'রেস্তোরাঁর পেমেন্ট সেটেলমেন্ট সম্পন্ন হয়েছে',
    message: `Admin has settled ₹${numAmount} to your ${method === 'upi' ? `UPI (${rest.upi_id})` : `Bank Account (${rest.bank_account_no})`}. Ref: ${settlementRecord.transaction_id}`,
    message_bn: `অ্যাডমিন আপনার অ্যাকাউন্টে ₹${numAmount} টাকা পাঠিয়েছেন। রেফারেন্স আইডি: ${settlementRecord.transaction_id}`,
    type: 'admin_alert'
  });

  return res.json({
    success: true,
    message: `Successfully settled ₹${numAmount} to ${rest.name} (${method === 'upi' ? 'UPI' : 'Bank Account'})`,
    data: settlementRecord
  });
});

// Admin: Update restaurant approval status & commission
adminRouter.put('/restaurants/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const restId = Number(req.params.id);
  const { status, commission_rate, rejection_reason } = req.body;
  const rest = store.restaurants.find((r: any) => r.id === restId);

  if (!rest) {
    return res.status(404).json({ success: false, message: 'Restaurant not found' });
  }

  if (commission_rate !== undefined) {
    rest.commission_rate = Math.max(0, Math.min(100, Number(commission_rate)));
  }

  if (status) {
    rest.status = status;
    if (rejection_reason) rest.rejection_reason = rejection_reason;

    // Send notification to restaurant owner
    notificationService.createNotification({
      userId: rest.user_id,
      role: 'restaurant',
      title: `Restaurant Application ${status.toUpperCase()}`,
      title_bn: `রেস্তোরাঁর আবেদন ${status === 'approved' ? 'অনুমোদিত হয়েছে' : 'বাতিল করা হয়েছে'}`,
      message: status === 'approved'
        ? 'Congratulations! Your restaurant has been approved by admin. You can now accept orders.'
        : `Your application was rejected: ${rejection_reason || 'Incomplete business documents.'}`,
      message_bn: status === 'approved'
        ? 'অভিনন্দন! আপনার রেস্তোরাঁ অ্যাডমিন দ্বারা অনুমোদিত হয়েছে। এখন খাবার বিক্রি করতে পারেন।'
        : 'আপনার আবেদনটি বাতিল হয়েছে। প্রয়োজনীয় নথি সংশোধন করুন।',
      type: 'admin_alert'
    });
  } else if (commission_rate !== undefined) {
    notificationService.createNotification({
      userId: rest.user_id,
      role: 'restaurant',
      title: 'Commission Rate Updated',
      title_bn: 'কমিশন রেট আপডেট করা হয়েছে',
      message: `Admin has updated your restaurant commission rate to ${rest.commission_rate}%.`,
      message_bn: `অ্যাডমিন আপনার রেস্তোরাঁর কমিশন রেট ${rest.commission_rate}% নির্ধারণ করেছেন।`,
      type: 'admin_alert'
    });
  }

  return res.json({
    success: true,
    message: status
      ? `Restaurant status updated to ${status}`
      : `Restaurant commission updated to ${rest.commission_rate}%`,
    data: rest
  });
});

// Admin: Toggle Block/Unblock for a restaurant
adminRouter.put('/restaurants/:id/block', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const restId = Number(req.params.id);
  const rest = store.restaurants.find((r: any) => r.id === restId);

  if (!rest) {
    return res.status(404).json({ success: false, message: 'Restaurant not found' });
  }

  const isCurrentlyBlocked = rest.status === 'blocked' || rest.is_active === 0;
  const newStatus = isCurrentlyBlocked ? 'approved' : 'blocked';
  rest.status = newStatus;
  rest.is_active = isCurrentlyBlocked ? 1 : 0;

  // Also sync the owner's user account active status
  const ownerUser = store.users.find((u: any) => u.id === rest.user_id);
  if (ownerUser) {
    ownerUser.is_active = isCurrentlyBlocked ? 1 : 0;
  }

  // Send in-app notification to restaurant owner
  notificationService.createNotification({
    userId: rest.user_id,
    role: 'restaurant',
    title: isCurrentlyBlocked ? 'Restaurant Account Unblocked' : 'Restaurant Account Blocked',
    title_bn: isCurrentlyBlocked ? 'রেস্তোরাঁ আনব্লক করা হয়েছে' : 'রেস্তোরাঁ সাময়িক স্থগিত (Blocked)',
    message: isCurrentlyBlocked
      ? 'Your restaurant has been unblocked by the admin. You can now accept food orders.'
      : 'Your restaurant has been temporarily blocked by administration. Please contact support.',
    message_bn: isCurrentlyBlocked
      ? 'আপনার রেস্তোরাঁটি অ্যাডমিন দ্বারা আনব্লক করা হয়েছে। এখন নতুন অর্ডার গ্রহণ করতে পারবেন।'
      : 'প্রশাসনিক কারণে আপনার রেস্তোরাঁটি সাময়িকভাবে ব্লক করা হয়েছে। সাপোর্টে যোগাযোগ করুন।',
    type: 'admin_alert'
  });

  return res.json({
    success: true,
    message: `Restaurant "${rest.name}" has been ${isCurrentlyBlocked ? 'UNBLOCKED (Active)' : 'BLOCKED'}`,
    data: rest
  });
});

// Admin: Send custom message to a restaurant
adminRouter.post('/restaurants/:id/message', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const restId = Number(req.params.id);
  const { title, title_bn, message, message_bn, priority } = req.body;

  const rest = store.restaurants.find((r: any) => r.id === restId);
  if (!rest) {
    return res.status(404).json({ success: false, message: 'Restaurant not found' });
  }

  if (!message) {
    return res.status(400).json({ success: false, message: 'Message content is required' });
  }

  const notif = notificationService.createNotification({
    userId: rest.user_id,
    role: 'restaurant',
    title: title || 'Message from Admin Support',
    title_bn: title_bn || 'অ্যাডমিন সাপোর্ট থেকে বার্তা',
    message,
    message_bn: message_bn || message,
    type: 'admin_alert',
    data: {
      priority: priority || 'normal',
      sender: 'Platform Administration',
      sent_at: new Date().toISOString()
    }
  });

  return res.json({
    success: true,
    message: `Message sent successfully to ${rest.name}`,
    data: notif
  });
});

// Admin: Get all delivery partners
adminRouter.get('/delivery-partners', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const partners = store.delivery_partners.map((dp: any) => {
    const user = store.users.find((u: any) => u.id === dp.user_id);
    return {
      ...dp,
      email: dp.email || user?.email || 'rider@aharlocal.com',
      gender: dp.gender || user?.gender || 'Male',
      age: dp.age || user?.age || 26,
      address: dp.address || user?.address || '12/C Hazra Road, South Kolkata, West Bengal 700026',
      aadhaar_number: dp.aadhaar_number || '8921-4412-9021',
      pan_number: dp.pan_number || 'BKRPD4521E',
      payment_method: dp.payment_method || user?.payment_method || 'upi',
      upi_id: dp.upi_id || user?.upi_id || 'rahul.sen@okaxis',
      upi_qr_photo: dp.upi_qr_photo || user?.upi_qr_photo || 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400',
      bank_name: dp.bank_name || user?.bank_name || 'State Bank of India',
      bank_account_no: dp.bank_account_no || dp.bank_account_number || user?.bank_account_no || '20491820491',
      bank_account_holder: dp.bank_account_holder || user?.bank_account_holder || dp.name,
      bank_ifsc: dp.bank_ifsc || user?.bank_ifsc || 'SBIN0002341',
      bank_passbook_photo: dp.bank_passbook_photo || user?.bank_passbook_photo || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
      settlements: dp.settlements || [],
      passport_photo: dp.passport_photo || dp.photo_url || user?.passport_photo || user?.profile_photo || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200`,
      profile_photo: dp.profile_photo || dp.photo_url || user?.profile_photo || user?.passport_photo || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200`,
      created_at: dp.created_at || user?.created_at || '2026-02-01T09:30:00.000Z'
    };
  });
  return res.json({ success: true, data: partners });
});

// Admin: Settle earnings / payout to a delivery partner
adminRouter.post('/delivery-partners/:id/settle', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const dpId = Number(req.params.id);
  const dp = store.delivery_partners.find((d: any) => d.id === dpId);

  if (!dp) {
    return res.status(404).json({ success: false, message: 'Delivery partner not found' });
  }

  const { amount, method, transaction_id, remarks } = req.body;
  const numAmount = Number(amount);

  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid settlement amount is required' });
  }

  if (!dp.settlements) dp.settlements = [];
  const settlementRecord = {
    id: dp.settlements.length + 1,
    amount: numAmount,
    method: method || dp.payment_method || 'upi',
    transaction_id: transaction_id || `SETTLE-RIDER-${Date.now()}`,
    remarks: remarks || 'Rider earnings weekly payout settlement',
    recipient: dp.name,
    upi_id: dp.upi_id,
    bank_name: dp.bank_name,
    bank_account_no: dp.bank_account_no,
    status: 'completed',
    created_at: new Date().toISOString()
  };

  dp.settlements.unshift(settlementRecord);

  // Update wallet if present
  const wallet = store.wallets.find((w: any) => w.user_id === dp.user_id);
  if (wallet) {
    wallet.total_withdrawn = (wallet.total_withdrawn || 0) + numAmount;
  }

  notificationService.createNotification({
    userId: dp.user_id,
    role: 'delivery',
    title: 'Payout Dispatched (উপার্জন প্রদান সম্পন্ন)',
    title_bn: 'রাইডারের উপার্জনের টাকা সেটেল করা হয়েছে',
    message: `Admin has settled ₹${numAmount} to your ${method === 'upi' ? `UPI (${dp.upi_id})` : `Bank Account (${dp.bank_account_no})`}. Ref: ${settlementRecord.transaction_id}`,
    message_bn: `অ্যাডমিন আপনার অ্যাকাউন্টে ₹${numAmount} টাকা পাঠিয়েছেন। রেফারেন্স আইডি: ${settlementRecord.transaction_id}`,
    type: 'admin_alert'
  });

  return res.json({
    success: true,
    message: `Successfully settled ₹${numAmount} to Rider ${dp.name} (${method === 'upi' ? 'UPI' : 'Bank Account'})`,
    data: settlementRecord
  });
});

// Admin: Update delivery partner status
adminRouter.put('/delivery-partners/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const dpId = Number(req.params.id);
  const { status } = req.body;
  const dp = store.delivery_partners.find((d: any) => d.id === dpId);

  if (!dp) {
    return res.status(404).json({ success: false, message: 'Delivery partner not found' });
  }

  dp.status = status;
  dp.is_active = status === 'approved' ? 1 : 0;
  if (status !== 'approved') {
    dp.is_online = 0;
  }

  // Sync rider user account active status
  const riderUser = store.users.find((u: any) => u.id === dp.user_id);
  if (riderUser) {
    riderUser.is_active = status === 'approved' ? 1 : 0;
  }

  notificationService.createNotification({
    userId: dp.user_id,
    role: 'delivery',
    title: status === 'approved' ? 'Rider Account Approved!' : 'Rider Application Rejected',
    title_bn: status === 'approved' ? 'রাইডার অ্যাকাউন্ট অনুমোদিত হয়েছে! ✓' : 'রাইডার আবেদন বাতিল করা হয়েছে ✕',
    message: status === 'approved'
      ? 'Congratulations! Your delivery partner profile has been approved by platform administration. You can now go online to accept delivery jobs.'
      : 'Your delivery partner registration was rejected by administration. Please check your license and vehicle details.',
    message_bn: status === 'approved'
      ? 'অভিনন্দন! আপনার রাইডার অ্যাকাউন্টটি অ্যাডমিন দ্বারা সফলভাবে অনুমোদিত হয়েছে। এখন আপনি অনলাইন হতে পারেন এবং ডেলিভারি অর্ডার নিতে পারেন।'
      : 'আপনার ডেলিভারি পার্টনার আবেদনটি বাতিল করা হয়েছে। তথ্যের অসঙ্গতি সংশোধন করতে সাপোর্টে যোগাযোগ করুন।',
    type: 'admin_alert'
  });

  return res.json({
    success: true,
    message: `Delivery partner "${dp.name}" status updated to ${status.toUpperCase()} by Admin`,
    data: dp
  });

});

// Admin: Toggle Block/Unblock for a delivery partner
adminRouter.put('/delivery-partners/:id/block', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const dpId = Number(req.params.id);
  const dp = store.delivery_partners.find((d: any) => d.id === dpId);

  if (!dp) {
    return res.status(404).json({ success: false, message: 'Delivery partner not found' });
  }

  const isCurrentlyBlocked = dp.status === 'blocked' || dp.is_active === 0;
  const newStatus = isCurrentlyBlocked ? 'approved' : 'blocked';
  dp.status = newStatus;
  dp.is_active = isCurrentlyBlocked ? 1 : 0;
  if (!isCurrentlyBlocked) {
    dp.is_online = 0; // Force offline when blocked
  }

  // Also sync the rider's user account active status
  const riderUser = store.users.find((u: any) => u.id === dp.user_id);
  if (riderUser) {
    riderUser.is_active = isCurrentlyBlocked ? 1 : 0;
  }

  notificationService.createNotification({
    userId: dp.user_id,
    role: 'delivery',
    title: isCurrentlyBlocked ? 'Rider Account Unblocked' : 'Rider Account Blocked',
    title_bn: isCurrentlyBlocked ? 'রাইডার আনব্লক করা হয়েছে' : 'রাইডার সাময়িক স্থগিত (Blocked)',
    message: isCurrentlyBlocked
      ? 'Your rider account has been unblocked by admin. You can now go online to accept deliveries.'
      : 'Your delivery partner account has been blocked by administration. Please contact support.',
    message_bn: isCurrentlyBlocked
      ? 'আপনার রাইডার অ্যাকাউন্টটি আনব্লক করা হয়েছে। এখন আপনি ডেলিভারির জন্য অনলাইন হতে পারেন।'
      : 'প্রশাসনিক কারণে আপনার রাইডার অ্যাকাউন্ট স্থগিত করা হয়েছে। সাপোর্টে যোগাযোগ করুন।',
    type: 'admin_alert'
  });

  return res.json({
    success: true,
    message: `Delivery Rider "${dp.name}" has been ${isCurrentlyBlocked ? 'UNBLOCKED (Active)' : 'BLOCKED'}`,
    data: dp
  });
});

// Admin: Send custom message to a delivery partner
adminRouter.post('/delivery-partners/:id/message', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const dpId = Number(req.params.id);
  const { title, title_bn, message, message_bn, priority } = req.body;

  const dp = store.delivery_partners.find((d: any) => d.id === dpId);
  if (!dp) {
    return res.status(404).json({ success: false, message: 'Delivery partner not found' });
  }

  if (!message) {
    return res.status(400).json({ success: false, message: 'Message content is required' });
  }

  const notif = notificationService.createNotification({
    userId: dp.user_id,
    role: 'delivery',
    title: title || 'Message from Dispatch Administration',
    title_bn: title_bn || 'ডিসপ্যাচ অ্যাডমিন থেকে বার্তা',
    message,
    message_bn: message_bn || message,
    type: 'admin_alert',
    data: {
      priority: priority || 'normal',
      sender: 'Dispatch Admin',
      sent_at: new Date().toISOString()
    }
  });

  return res.json({
    success: true,
    message: `Message sent successfully to Rider ${dp.name}`,
    data: notif
  });
});


// Admin: Service Area Management
adminRouter.get('/service-areas', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  return res.json({ success: true, data: store.service_areas });
});

adminRouter.post('/service-areas', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const { name, name_bn, min_delivery_charge, per_km_charge, polygon } = req.body;

  if (!name || !polygon || polygon.length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Name and at least 3 polygon boundary coordinates are required'
    });
  }

  const newId = store.service_areas.length + 1;
  const newArea = {
    id: newId,
    name,
    name_bn: name_bn || name,
    min_delivery_charge: Number(min_delivery_charge) || 25,
    per_km_charge: Number(per_km_charge) || 8,
    is_active: 1,
    polygon
  };

  store.service_areas.push(newArea);

  return res.status(201).json({
    success: true,
    message: 'Service area geofence created successfully',
    data: newArea
  });
});

// Admin: Update service area details and polygon boundary
adminRouter.put('/service-areas/:id', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const id = Number(req.params.id);
  const sa = store.service_areas.find((s: any) => s.id === id);
  if (!sa) {
    return res.status(404).json({ success: false, message: 'Service area not found' });
  }

  const { name, name_bn, min_delivery_charge, per_km_charge, polygon, is_active } = req.body;
  if (name !== undefined) sa.name = name;
  if (name_bn !== undefined) sa.name_bn = name_bn;
  if (min_delivery_charge !== undefined) sa.min_delivery_charge = Number(min_delivery_charge);
  if (per_km_charge !== undefined) sa.per_km_charge = Number(per_km_charge);
  if (is_active !== undefined) sa.is_active = is_active ? 1 : 0;
  if (polygon && Array.isArray(polygon)) {
    if (polygon.length < 3) {
      return res.status(400).json({ success: false, message: 'At least 3 boundary vertices required for a polygon geofence' });
    }
    sa.polygon = polygon.map((p: any) => ({
      lat: parseFloat(Number(p.lat).toFixed(6)),
      lng: parseFloat(Number(p.lng).toFixed(6))
    }));
  }

  return res.json({
    success: true,
    message: `Service area "${sa.name}" updated successfully`,
    data: sa
  });
});

// Admin: Delete a service area
adminRouter.delete('/service-areas/:id', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const id = Number(req.params.id);
  const idx = store.service_areas.findIndex((s: any) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Service area not found' });
  }

  const deleted = store.service_areas.splice(idx, 1)[0];
  return res.json({
    success: true,
    message: `Service area "${deleted.name}" deleted successfully`,
    data: deleted
  });
});

// Admin: Toggle active/inactive status for a service area
adminRouter.put('/service-areas/:id/toggle-status', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const id = Number(req.params.id);
  const sa = store.service_areas.find((s: any) => s.id === id);
  if (!sa) {
    return res.status(404).json({ success: false, message: 'Service area not found' });
  }

  sa.is_active = sa.is_active ? 0 : 1;
  return res.json({
    success: true,
    message: `Service area "${sa.name}" is now ${sa.is_active ? 'ACTIVE' : 'INACTIVE'}`,
    data: sa
  });
});

// Admin: Get all customers with COD status and order count
adminRouter.get('/customers', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const customers = store.users.filter((u: any) => u.role === 'customer').map((c: any) => {
    const userOrders = store.orders.filter((o: any) => o.customer_id === c.id);
    const userAddress = store.addresses?.find((a: any) => a.user_id === c.id);
    const addressStr = c.address || (userAddress ? `${userAddress.address_line}${userAddress.landmark ? ` (${userAddress.landmark})` : ''}` : 'Flat 3B, Sunshine Heights, 14 Ballygunge Circular Road, Kolkata 700019');
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      cod_enabled: c.cod_enabled ?? 0,
      total_orders: userOrders.length,
      is_active: c.is_active ?? 1,
      dob: c.dob || '15/08/1996',
      gender: c.gender || 'Not specified',
      address: addressStr,
      payment_method: c.payment_method || 'upi',
      upi_id: c.upi_id || `${c.name.toLowerCase().replace(/\s+/g, '')}@okaxis`,
      upi_qr_photo: c.upi_qr_photo || 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400',
      bank_name: c.bank_name || 'HDFC Bank',
      bank_account_no: c.bank_account_no || '501004829104',
      bank_account_holder: c.bank_account_holder || c.name,
      bank_ifsc: c.bank_ifsc || 'HDFC0000456',
      bank_passbook_photo: c.bank_passbook_photo || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
      refunds: c.refunds || [],
      passport_photo: c.passport_photo || c.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      profile_photo: c.profile_photo || c.passport_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      created_at: c.created_at
    };
  });

  return res.json({
    success: true,
    data: {
      customers,
      global_cod_enabled: store.settings?.global_cod_enabled ?? 0
    }
  });
});

// Admin: Issue direct refund to customer (UPI / Bank Account)
adminRouter.post('/customers/:id/refund', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const customerId = Number(req.params.id);
  const customer = store.users.find((u: any) => u.id === customerId && u.role === 'customer');

  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  const { amount, method, transaction_id, reason, order_id } = req.body;
  const numAmount = Number(amount);

  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid refund amount is required' });
  }

  if (!customer.refunds) customer.refunds = [];
  const refundRecord = {
    id: customer.refunds.length + 1,
    amount: numAmount,
    method: method || customer.payment_method || 'upi',
    order_id: order_id || null,
    reason: reason || 'Order cancellation / Customer dispute refund',
    transaction_id: transaction_id || `REFUND-${Date.now()}`,
    recipient: customer.name,
    upi_id: customer.upi_id,
    bank_name: customer.bank_name,
    bank_account_no: customer.bank_account_no,
    status: 'completed',
    created_at: new Date().toISOString()
  };

  customer.refunds.unshift(refundRecord);

  // If order_id provided, mark order refunded or update payment status
  if (order_id) {
    const ord = store.orders.find((o: any) => o.id === Number(order_id));
    if (ord) {
      ord.payment_status = 'refunded';
    }
  }

  notificationService.createNotification({
    userId: customer.id,
    role: 'customer',
    title: 'Refund Processed (টাকা রিফান্ড করা হয়েছে)',
    title_bn: 'আপনার পেমেন্ট রিফান্ড সফল হয়েছে',
    message: `Admin has refunded ₹${numAmount} to your ${method === 'upi' ? `UPI (${customer.upi_id || 'Self'})` : `Bank Account (${customer.bank_account_no || 'Self'})`}. Ref: ${refundRecord.transaction_id}`,
    message_bn: `অ্যাডমিন আপনার অ্যাকাউন্টে ₹${numAmount} টাকা রিফান্ড পাঠিয়েছেন। ট্রানজেকশন আইডি: ${refundRecord.transaction_id}`,
    type: 'order_status'
  });

  return res.json({
    success: true,
    message: `Successfully refunded ₹${numAmount} to customer ${customer.name} via ${method === 'upi' ? 'UPI' : 'Bank Account'} (রিফান্ড সফল হয়েছে)`,
    data: refundRecord
  });
});

// Admin: Toggle COD for a specific customer
adminRouter.put('/customers/:id/cod', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const customerId = Number(req.params.id);
  const { cod_enabled } = req.body;

  const customer = store.users.find((u: any) => u.id === customerId && u.role === 'customer');
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  customer.cod_enabled = cod_enabled ? 1 : 0;

  // Send in-app notification to customer
  notificationService.createNotification({
    userId: customer.id,
    role: 'customer',
    title: customer.cod_enabled ? 'Cash on Delivery (COD) Enabled!' : 'COD Access Updated',
    title_bn: customer.cod_enabled ? 'ক্যাশ অন ডেলিভারি (COD) চালু হয়েছে!' : 'COD সুবিধা আপডেট হয়েছে',
    message: customer.cod_enabled
      ? 'Admin has approved Cash on Delivery (COD) for your account.'
      : 'Cash on Delivery (COD) is disabled. Please pay online via UPI or Cards.',
    message_bn: customer.cod_enabled
      ? 'অ্যাডমিন আপনার অ্যাকাউন্টের জন্য ক্যাশ অন ডেলিভারি সুবিধা অনুমোদন করেছেন।'
      : 'ক্যাশ অন ডেলিভারি বন্ধ করা হয়েছে। অনলাইন পেমেন্ট ব্যবহার করুন।',
    type: 'admin_alert'
  });

  return res.json({
    success: true,
    message: `COD access for ${customer.name} updated to ${customer.cod_enabled ? 'ENABLED' : 'DISABLED'}`,
    data: customer
  });
});

// Admin: Toggle Block/Unblock for a customer
adminRouter.put('/customers/:id/block', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const customerId = Number(req.params.id);
  const customer = store.users.find((u: any) => u.id === customerId && u.role === 'customer');

  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  const isCurrentlyBlocked = customer.is_active === 0;
  customer.is_active = isCurrentlyBlocked ? 1 : 0;

  notificationService.createNotification({
    userId: customer.id,
    role: 'customer',
    title: isCurrentlyBlocked ? 'Account Re-activated' : 'Account Suspended',
    title_bn: isCurrentlyBlocked ? 'অ্যাকাউন্ট আনব্লক করা হয়েছে' : 'অ্যাকাউন্ট স্থগিত করা হয়েছে (Blocked)',
    message: isCurrentlyBlocked
      ? 'Your account has been unblocked by admin. You can now browse restaurants and place orders.'
      : 'Your account has been temporarily blocked by administration. Please contact support.',
    message_bn: isCurrentlyBlocked
      ? 'আপনার অ্যাকাউন্টটি আনব্লক করা হয়েছে। এখন আপনি খাবার অর্ডার করতে পারবেন।'
      : 'প্রশাসনিক কারণে আপনার অ্যাকাউন্ট স্থগিত করা হয়েছে। সাপোর্টে যোগাযোগ করুন।',
    type: 'admin_alert'
  });

  return res.json({
    success: true,
    message: `Customer "${customer.name}" has been ${isCurrentlyBlocked ? 'UNBLOCKED (Active)' : 'BLOCKED'}`,
    data: {
      ...customer,
      is_active: customer.is_active
    }
  });
});

// Admin: Send custom message to a customer
adminRouter.post('/customers/:id/message', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const customerId = Number(req.params.id);
  const { title, title_bn, message, message_bn, priority } = req.body;

  const customer = store.users.find((u: any) => u.id === customerId && u.role === 'customer');
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  if (!message) {
    return res.status(400).json({ success: false, message: 'Message content is required' });
  }

  const notif = notificationService.createNotification({
    userId: customer.id,
    role: 'customer',
    title: title || 'Message from AharLocal Support',
    title_bn: title_bn || 'আহারলোকাল সাপোর্ট থেকে বার্তা',
    message,
    message_bn: message_bn || message,
    type: 'admin_alert',
    data: {
      priority: priority || 'normal',
      sender: 'Platform Administration',
      sent_at: new Date().toISOString()
    }
  });

  return res.json({
    success: true,
    message: `Message sent successfully to ${customer.name}`,
    data: notif
  });
});

// Admin: Toggle global platform COD status

adminRouter.put('/settings/cod', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const { global_cod_enabled } = req.body;

  if (!store.settings) store.settings = {};
  store.settings.global_cod_enabled = global_cod_enabled ? 1 : 0;

  return res.json({
    success: true,
    message: `Global COD status set to ${store.settings.global_cod_enabled ? 'ENABLED for all' : 'DISABLED (Whitelisted customers only)'}`,
    data: { global_cod_enabled: store.settings.global_cod_enabled }
  });
});

// Admin: Get platform settings (commissions, per-km delivery fare, COD)
adminRouter.get('/settings', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  if (!store.settings) store.settings = {};
  return res.json({
    success: true,
    data: {
      global_cod_enabled: store.settings.global_cod_enabled ?? 0,
      restaurant_commission_percent: Number(store.settings.restaurant_commission_percent ?? 15.0),
      delivery_partner_commission_percent: Number(store.settings.delivery_partner_commission_percent ?? 10.0),
      delivery_base_fare: Number(store.settings.delivery_base_fare ?? 25.0),
      delivery_base_distance_km: Number(store.settings.delivery_base_distance_km ?? 2.0),
      delivery_per_km_rate: Number(store.settings.delivery_per_km_rate ?? 10.0),
      min_delivery_fare: Number(store.settings.min_delivery_fare ?? 20.0)
    }
  });
});

// Admin: Update platform commissions and delivery per-km rates
adminRouter.put('/settings/rates', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  if (!store.settings) store.settings = {};

  const {
    restaurant_commission_percent,
    delivery_partner_commission_percent,
    delivery_base_fare,
    delivery_base_distance_km,
    delivery_per_km_rate,
    min_delivery_fare
  } = req.body;

  if (restaurant_commission_percent !== undefined) {
    store.settings.restaurant_commission_percent = Math.max(0, Math.min(100, Number(restaurant_commission_percent)));
  }
  if (delivery_partner_commission_percent !== undefined) {
    store.settings.delivery_partner_commission_percent = Math.max(0, Math.min(100, Number(delivery_partner_commission_percent)));
  }
  if (delivery_base_fare !== undefined) {
    store.settings.delivery_base_fare = Math.max(0, Number(delivery_base_fare));
  }
  if (delivery_base_distance_km !== undefined) {
    store.settings.delivery_base_distance_km = Math.max(0.5, Number(delivery_base_distance_km));
  }
  if (delivery_per_km_rate !== undefined) {
    store.settings.delivery_per_km_rate = Math.max(0, Number(delivery_per_km_rate));
  }
  if (min_delivery_fare !== undefined) {
    store.settings.min_delivery_fare = Math.max(0, Number(min_delivery_fare));
  }

  // Synchronize to primary service area
  if (store.service_areas && store.service_areas.length > 0) {
    store.service_areas[0].min_delivery_charge = store.settings.delivery_base_fare;
    store.service_areas[0].per_km_charge = store.settings.delivery_per_km_rate;
  }

  return res.json({
    success: true,
    message: 'Platform commissions and per-km fare rates updated successfully (কমিশন ও প্রতি কিমি রেট আপডেট হয়েছে)',
    data: store.settings
  });
});

// Admin: Get all promotions and platform charge discount settings
adminRouter.get('/promotions', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  if (!store.promotions) {
    store.promotions = {
      restaurant_discount_enabled: 1,
      restaurant_discount_type: 'percent_off_commission',
      restaurant_discount_value: 50.0,
      restaurant_discount_title: 'Festival Partner Offer: 50% Off Platform Fee',
      restaurant_discount_title_bn: 'রেস্তোরাঁ উৎসব অফার: প্ল্যাটফর্ম ফি-তে ৫০% বিশেষ ছাড়!',
      restaurant_discount_note: 'All restaurant partners enjoy 50% discount on standard commission rates.',

      partner_discount_enabled: 1,
      partner_discount_type: 'zero_fee',
      partner_discount_value: 100.0,
      partner_bonus_per_order: 5.0,
      partner_discount_title: 'Rider Super Bonus: 0% Platform Deduction + ₹5 Extra Payout',
      partner_discount_title_bn: 'রাইডার ধামাকা বোনাস: ০% প্ল্যাটফর্ম কর্তন ও প্রতি ডেলিভারিতে অতিরিক্ত ₹৫ ইনসেনটিভ',
      partner_discount_note: 'Riders retain 100% of delivery fees with zero platform deduction and receive extra bonus.',

      customer_delivery_discount_enabled: 1,
      customer_delivery_discount_type: 'free_delivery_above',
      customer_delivery_discount_value: 100.0,
      customer_min_order_for_free_delivery: 199.0,
      customer_flat_delivery_discount: 10.0,
      customer_first_order_free_delivery: 1,
      customer_promo_banner_enabled: 1,
      customer_promo_banner_text: '🎉 বিশেষ অফার: ₹১৯৯ টাকার বেশি অর্ডারে সম্পূর্ণ ফ্রি ডেলিভারি!',
      customer_promo_banner_text_en: '🎉 Limited Time Offer: FREE Delivery on all food orders above ₹199!'
    };
  }

  return res.json({
    success: true,
    data: store.promotions
  });
});

// Admin: Update promotions and discount settings
adminRouter.put('/promotions', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  if (!store.promotions) store.promotions = {};

  const {
    restaurant_discount_enabled,
    restaurant_discount_type,
    restaurant_discount_value,
    restaurant_discount_title,
    restaurant_discount_title_bn,
    restaurant_discount_note,

    partner_discount_enabled,
    partner_discount_type,
    partner_discount_value,
    partner_bonus_per_order,
    partner_discount_title,
    partner_discount_title_bn,
    partner_discount_note,

    customer_delivery_discount_enabled,
    customer_delivery_discount_type,
    customer_delivery_discount_value,
    customer_min_order_for_free_delivery,
    customer_flat_delivery_discount,
    customer_first_order_free_delivery,
    customer_promo_banner_enabled,
    customer_promo_banner_text,
    customer_promo_banner_text_en
  } = req.body;

  // 1. Restaurant platform charge discount
  if (restaurant_discount_enabled !== undefined) {
    store.promotions.restaurant_discount_enabled = restaurant_discount_enabled ? 1 : 0;
  }
  if (restaurant_discount_type !== undefined) {
    store.promotions.restaurant_discount_type = restaurant_discount_type;
  }
  if (restaurant_discount_value !== undefined) {
    store.promotions.restaurant_discount_value = Math.max(0, Math.min(100, Number(restaurant_discount_value)));
  }
  if (restaurant_discount_title !== undefined) {
    store.promotions.restaurant_discount_title = String(restaurant_discount_title);
  }
  if (restaurant_discount_title_bn !== undefined) {
    store.promotions.restaurant_discount_title_bn = String(restaurant_discount_title_bn);
  }
  if (restaurant_discount_note !== undefined) {
    store.promotions.restaurant_discount_note = String(restaurant_discount_note);
  }

  // 2. Delivery partner platform charge discount & bonus
  if (partner_discount_enabled !== undefined) {
    store.promotions.partner_discount_enabled = partner_discount_enabled ? 1 : 0;
  }
  if (partner_discount_type !== undefined) {
    store.promotions.partner_discount_type = partner_discount_type;
  }
  if (partner_discount_value !== undefined) {
    store.promotions.partner_discount_value = Math.max(0, Math.min(100, Number(partner_discount_value)));
  }
  if (partner_bonus_per_order !== undefined) {
    store.promotions.partner_bonus_per_order = Math.max(0, Number(partner_bonus_per_order));
  }
  if (partner_discount_title !== undefined) {
    store.promotions.partner_discount_title = String(partner_discount_title);
  }
  if (partner_discount_title_bn !== undefined) {
    store.promotions.partner_discount_title_bn = String(partner_discount_title_bn);
  }
  if (partner_discount_note !== undefined) {
    store.promotions.partner_discount_note = String(partner_discount_note);
  }

  // 3. Customer delivery charge discount & banner
  if (customer_delivery_discount_enabled !== undefined) {
    store.promotions.customer_delivery_discount_enabled = customer_delivery_discount_enabled ? 1 : 0;
  }
  if (customer_delivery_discount_type !== undefined) {
    store.promotions.customer_delivery_discount_type = customer_delivery_discount_type;
  }
  if (customer_delivery_discount_value !== undefined) {
    store.promotions.customer_delivery_discount_value = Math.max(0, Math.min(100, Number(customer_delivery_discount_value)));
  }
  if (customer_min_order_for_free_delivery !== undefined) {
    store.promotions.customer_min_order_for_free_delivery = Math.max(0, Number(customer_min_order_for_free_delivery));
  }
  if (customer_flat_delivery_discount !== undefined) {
    store.promotions.customer_flat_delivery_discount = Math.max(0, Number(customer_flat_delivery_discount));
  }
  if (customer_first_order_free_delivery !== undefined) {
    store.promotions.customer_first_order_free_delivery = customer_first_order_free_delivery ? 1 : 0;
  }
  if (customer_promo_banner_enabled !== undefined) {
    store.promotions.customer_promo_banner_enabled = customer_promo_banner_enabled ? 1 : 0;
  }
  if (customer_promo_banner_text !== undefined) {
    store.promotions.customer_promo_banner_text = String(customer_promo_banner_text);
  }
  if (customer_promo_banner_text_en !== undefined) {
    store.promotions.customer_promo_banner_text_en = String(customer_promo_banner_text_en);
  }

  // Broadcast system notifications to restaurants and delivery partners
  if (store.promotions.restaurant_discount_enabled) {
    store.restaurants.forEach((r: any) => {
      notificationService.createNotification({
        userId: r.user_id,
        role: 'restaurant',
        title: store.promotions.restaurant_discount_title || 'Platform Fee Discount Offer Active!',
        title_bn: store.promotions.restaurant_discount_title_bn || 'প্ল্যাটফর্ম ফি ছাড় অফার সক্রিয়!',
        message: `Admin has updated the promotional platform fee discount for all restaurants.`,
        message_bn: `রেস্তোরাঁর জন্য প্ল্যাটফর্ম চার্জের বিশেষ ছাড়ের অফার চালু করা হয়েছে।`,
        type: 'admin_alert'
      });
    });
  }

  if (store.promotions.partner_discount_enabled) {
    store.delivery_partners.forEach((dp: any) => {
      notificationService.createNotification({
        userId: dp.user_id,
        role: 'delivery',
        title: store.promotions.partner_discount_title || 'Rider Incentive & Zero Platform Fee Active!',
        title_bn: store.promotions.partner_discount_title_bn || 'রাইডার স্পেশাল ইনসেনটিভ ও প্ল্যাটফর্ম ছাড় সক্রিয়!',
        message: `Enjoy reduced platform deductions + bonus per delivery!`,
        message_bn: `০% বা কম প্ল্যাটফর্ম ফি এবং প্রতি ডেলিভারিতে অতিরিক্ত বোনাস চালু হয়েছে।`,
        type: 'admin_alert'
      });
    });
  }

  return res.json({
    success: true,
    message: 'Offers and discount settings successfully updated! (অফার ও ডিসকাউন্ট সফলভাবে আপডেট হয়েছে)',
    data: store.promotions
  });
});


// Admin: Escrow Funds & Support Resolution Center
adminRouter.get('/escrow', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const deliveredOrders = store.orders.filter((o: any) => o.status === 'delivered');

  // Check auto-maturity for orders where 24 hours have passed and not refunded/disputed
  const nowTime = Date.now();
  for (const ord of deliveredOrders) {
    if (ord.escrow_status === 'holding' && ord.holding_until) {
      if (nowTime >= new Date(ord.holding_until).getTime()) {
        ord.escrow_status = 'matured';
      }
    }
  }

  const holdingFunds = deliveredOrders
    .filter((o: any) => o.escrow_status === 'holding')
    .reduce((sum: number, o: any) => sum + Number(o.net_restaurant_amount || o.subtotal * 0.85), 0);

  const maturedFunds = deliveredOrders
    .filter((o: any) => o.escrow_status === 'matured')
    .reduce((sum: number, o: any) => sum + Number(o.net_restaurant_amount || o.subtotal * 0.85), 0);

  const settledFunds = deliveredOrders
    .filter((o: any) => o.escrow_status === 'settled')
    .reduce((sum: number, o: any) => sum + Number(o.net_restaurant_amount || o.subtotal * 0.85), 0);

  const refundedFunds = deliveredOrders
    .filter((o: any) => o.escrow_status === 'refunded')
    .reduce((sum: number, o: any) => sum + Number(o.refund_amount || o.grand_total), 0);

  const disputedOrdersCount = deliveredOrders.filter((o: any) => o.escrow_status === 'disputed').length;

  return res.json({
    success: true,
    data: {
      metrics: {
        holdingFunds: Math.round(holdingFunds * 100) / 100,
        maturedFunds: Math.round(maturedFunds * 100) / 100,
        settledFunds: Math.round(settledFunds * 100) / 100,
        refundedFunds: Math.round(refundedFunds * 100) / 100,
        disputedOrdersCount,
        totalDelivered: deliveredOrders.length
      },
      orders: deliveredOrders
    }
  });
});

// Admin: Manually settle escrow payment to restaurant (immediate release override)
adminRouter.post('/escrow/:orderId/settle', (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = Number(req.params.orderId);
    const { note } = req.body;
    const settled = orderService.settleOrderEscrow(orderId, req.user?.id, note);
    return res.json({
      success: true,
      message: `Payment of ₹${settled.net_restaurant_amount} successfully released to ${settled.restaurant_name}`,
      data: settled
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// Admin: Process full or partial refund to customer
adminRouter.post('/escrow/:orderId/refund', (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = Number(req.params.orderId);
    const { reason, amount, refund_percentage, withhold_restaurant_pct, withhold_delivery_pct } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Refund reason is required (রিফান্ডের কারণ আবশ্যক)' });
    }
    const refunded = orderService.refundOrderPayment(orderId, req.user?.id, reason, amount, {
      refundPercentage: refund_percentage !== undefined ? Number(refund_percentage) : undefined,
      withholdRestaurantPct: withhold_restaurant_pct !== undefined ? Number(withhold_restaurant_pct) : undefined,
      withholdDeliveryPct: withhold_delivery_pct !== undefined ? Number(withhold_delivery_pct) : undefined
    });
    return res.json({
      success: true,
      message: `Refund of ₹${refunded.refund_amount} (${refunded.refund_percentage || 100}%) processed for ${refunded.customer_name}. Restaurant payout set to ₹${refunded.net_restaurant_amount}.`,
      data: refunded
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// Admin: Flag / Freeze order payment for dispute investigation
adminRouter.post('/escrow/:orderId/dispute', (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = Number(req.params.orderId);
    const { reason } = req.body;
    const disputed = orderService.disputeOrderPayment(orderId, req.user?.id, reason);
    return res.json({
      success: true,
      message: `Order #${disputed.order_number} payment has been frozen under dispute review`,
      data: disputed
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// Admin: Batch settle all matured 24h escrow orders
adminRouter.post('/escrow/settle-all-matured', (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = db.getStore();
    const nowTime = Date.now();
    const maturedOrders = store.orders.filter(
      (o: any) =>
        o.status === 'delivered' &&
        (o.escrow_status === 'matured' ||
          (o.escrow_status === 'holding' && o.holding_until && nowTime >= new Date(o.holding_until).getTime()))
    );

    const settledList: any[] = [];
    for (const ord of maturedOrders) {
      const settled = orderService.settleOrderEscrow(ord.id, req.user?.id, 'Batch 24h maturity auto-release');
      settledList.push(settled);
    }

    return res.json({
      success: true,
      message: `Successfully released ${settledList.length} matured payments to restaurants.`,
      data: {
        settledCount: settledList.length,
        settledOrders: settledList
      }
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ==========================================
// Admin: Service Area & Boundary Management
// ==========================================

// 1. Get all service areas with enriched restaurant & order counts
adminRouter.get('/service-areas', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const areas = (store.service_areas || []).map((sa: any) => {
    const restaurantCount = (store.restaurants || []).filter((r: any) => r.service_area_id === sa.id).length;
    const orderCount = (store.orders || []).filter((o: any) => o.service_area_id === sa.id).length;
    return {
      ...sa,
      restaurant_count: restaurantCount,
      order_count: orderCount
    };
  });
  return res.json({ success: true, data: areas });
});

// 2. Create new service area boundary
adminRouter.post('/service-areas', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const { name, name_bn, min_delivery_charge, per_km_charge, is_active, polygon } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Service area name is required (সার্ভিস এরিয়ার নাম আবশ্যক)' });
  }

  if (!polygon || !Array.isArray(polygon) || polygon.length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Boundary polygon must contain at least 3 valid GPS coordinate points (কমপক্ষে ৩টি কোঅর্ডিনেট পয়েন্ট থাকতে হবে)'
    });
  }

  const nextId = (store.service_areas || []).reduce((max: number, a: any) => Math.max(max, a.id || 0), 0) + 1;
  const newArea = {
    id: nextId,
    name: name.trim(),
    name_bn: (name_bn || name).trim(),
    min_delivery_charge: Number(min_delivery_charge) || 25,
    per_km_charge: Number(per_km_charge) || 8,
    is_active: is_active === undefined ? 1 : (is_active ? 1 : 0),
    polygon: polygon.map((pt: any) => ({
      lat: Number(pt.lat),
      lng: Number(pt.lng)
    }))
  };

  if (!store.service_areas) store.service_areas = [];
  store.service_areas.push(newArea);

  return res.json({
    success: true,
    message: `Service area "${newArea.name}" created successfully (সার্ভিস এরিয়া বাউন্ডারি সফলভাবে যুক্ত হয়েছে)`,
    data: newArea
  });
});

// 3. Update existing service area boundary
adminRouter.put('/service-areas/:id', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const areaId = Number(req.params.id);
  if (!store.service_areas) store.service_areas = [];
  const area = store.service_areas.find((a: any) => Number(a.id) === areaId);

  if (!area) {
    return res.status(404).json({ success: false, message: 'Service area not found (সার্ভিস এরিয়া খুঁজে পাওয়া যায়নি)' });
  }

  const { name, name_bn, min_delivery_charge, per_km_charge, is_active, polygon } = req.body;

  if (name !== undefined && String(name).trim()) area.name = String(name).trim();
  if (name_bn !== undefined && String(name_bn).trim()) area.name_bn = String(name_bn).trim();
  if (min_delivery_charge !== undefined) area.min_delivery_charge = Math.max(0, Number(min_delivery_charge) || 0);
  if (per_km_charge !== undefined) area.per_km_charge = Math.max(0, Number(per_km_charge) || 0);
  if (is_active !== undefined) area.is_active = is_active ? 1 : 0;
  if (polygon && Array.isArray(polygon)) {
    const validPoints = polygon
      .map((pt: any) => ({
        lat: Number(Number(pt.lat).toFixed(5)),
        lng: Number(Number(pt.lng).toFixed(5))
      }))
      .filter((pt: any) => !isNaN(pt.lat) && !isNaN(pt.lng));

    if (validPoints.length < 3) {
      return res.status(400).json({ success: false, message: 'Boundary polygon must contain at least 3 points (কমপক্ষে ৩টি পয়েন্ট থাকতে হবে)' });
    }
    area.polygon = validPoints;
  }

  return res.json({
    success: true,
    message: `Service area "${area.name}" boundary updated successfully (বাউন্ডারি সফলভাবে আপডেট হয়েছে)`,
    data: area
  });
});

// 4. Toggle active status of service area
adminRouter.put('/service-areas/:id/toggle', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const areaId = Number(req.params.id);
  const area = (store.service_areas || []).find((a: any) => a.id === areaId);

  if (!area) {
    return res.status(404).json({ success: false, message: 'Service area not found' });
  }

  area.is_active = area.is_active ? 0 : 1;
  return res.json({
    success: true,
    message: `Service area "${area.name}" is now ${area.is_active ? 'ACTIVE (সক্রিয়)' : 'INACTIVE (নিষ্ক্রিয়)'}`,
    data: area
  });
});

// 5. Delete service area
adminRouter.delete('/service-areas/:id', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const areaId = Number(req.params.id);
  const index = (store.service_areas || []).findIndex((a: any) => a.id === areaId);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Service area not found (সার্ভিস এরিয়া খুঁজে পাওয়া যায়নি)' });
  }

  const removed = store.service_areas.splice(index, 1)[0];

  // If any restaurants had this service_area_id, reassign to remaining service area if available
  if (store.service_areas && store.service_areas.length > 0) {
    const fallbackId = store.service_areas[0].id;
    store.restaurants.forEach((r: any) => {
      if (r.service_area_id === areaId) {
        r.service_area_id = fallbackId;
      }
    });
  }

  return res.json({
    success: true,
    message: `Service area "${removed.name}" deleted successfully (সার্ভিস এরিয়া সফলভাবে ডিলিট হয়েছে)`,
    data: {
      deletedId: areaId,
      remainingCount: (store.service_areas || []).length
    }
  });
});

// 6. Test location coordinates inside boundary
adminRouter.post('/service-areas/test-location', (req: AuthenticatedRequest, res: Response) => {
  const { lat, lng } = req.body;
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
  }

  const point = { lat: Number(lat), lng: Number(lng) };
  const store = db.getStore();
  
  let matchedArea: any = null;
  for (const sa of store.service_areas || []) {
    if (sa.is_active && locationService.isPointInPolygon(point, sa.polygon)) {
      matchedArea = sa;
      break;
    }
  }

  return res.json({
    success: true,
    data: {
      point,
      isInside: Boolean(matchedArea),
      matchedArea: matchedArea || null
    }
  });
});

// ==========================================
// ADMIN CATEGORY MANAGEMENT (ক্যাটাগরি পরিচালনা)
// ==========================================

// Get all categories
adminRouter.get('/categories', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const categories = store.food_categories || [];
  return res.json({
    success: true,
    data: categories
  });
});

// Create a new category
adminRouter.post('/categories', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  if (!store.food_categories) store.food_categories = [];

  const { name, name_bn, image_url, icon, description, sort_order, is_active } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Category name is required (ক্যাটাগরির নাম আবশ্যক)' });
  }

  const existing = store.food_categories.find(
    (c: any) => c.name.toLowerCase().trim() === name.toLowerCase().trim()
  );
  if (existing) {
    return res.status(400).json({ success: false, message: 'A category with this name already exists' });
  }

  const newId = store.food_categories.length > 0 ? Math.max(...store.food_categories.map((c: any) => c.id || 0)) + 1 : 1;
  const newCat = {
    id: newId,
    name: name.trim(),
    name_bn: (name_bn && name_bn.trim()) || name.trim(),
    image_url: image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    icon: icon || '🍽️',
    description: description || '',
    sort_order: Number(sort_order) || newId,
    is_active: typeof is_active !== 'undefined' ? (is_active ? 1 : 0) : 1,
    created_at: new Date().toISOString()
  };

  store.food_categories.push(newCat);

  return res.status(201).json({
    success: true,
    message: `Category "${newCat.name}" added successfully (নতুন ক্যাটাগরি তৈরি হয়েছে)`,
    data: newCat
  });
});

// Update an existing category
adminRouter.put('/categories/:id', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const catId = Number(req.params.id);
  const cat = (store.food_categories || []).find((c: any) => c.id === catId);

  if (!cat) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  const { name, name_bn, image_url, icon, description, sort_order, is_active } = req.body;

  const oldName = cat.name;
  if (name) cat.name = name.trim();
  if (name_bn) cat.name_bn = name_bn.trim();
  if (image_url) cat.image_url = image_url;
  if (icon) cat.icon = icon;
  if (typeof description !== 'undefined') cat.description = description;
  if (typeof sort_order !== 'undefined') cat.sort_order = Number(sort_order);
  if (typeof is_active !== 'undefined') cat.is_active = is_active ? 1 : 0;

  // If category name updated, optionally sync foods associated
  if (name && oldName !== name.trim()) {
    (store.foods || []).forEach((f: any) => {
      if (f.category === oldName) {
        f.category = name.trim();
        if (name_bn) f.category_bn = name_bn.trim();
      }
    });
  }

  return res.json({
    success: true,
    message: `Category "${cat.name}" updated successfully (ক্যাটাগরি আপডেট হয়েছে)`,
    data: cat
  });
});

// Delete a category
adminRouter.delete('/categories/:id', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const catId = Number(req.params.id);
  const index = (store.food_categories || []).findIndex((c: any) => c.id === catId);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  const removed = store.food_categories.splice(index, 1)[0];

  return res.json({
    success: true,
    message: `Category "${removed.name}" deleted successfully (ক্যাটাগরি ডিলিট করা হয়েছে)`,
    data: removed
  });
});

// ==========================================
// ADMIN NEARBY RESTAURANT RANKING (রেস্তোরাঁ র‍্যাঙ্কিং ও পজিশন)
// ==========================================

// Get all location-wise restaurant rankings
adminRouter.get('/restaurant-rankings', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  if (!store.location_rankings) store.location_rankings = [];
  if (!store.restaurant_rankings) store.restaurant_rankings = [];

  return res.json({
    success: true,
    data: {
      location_rankings: store.location_rankings,
      service_area_rankings: store.restaurant_rankings
    }
  });
});

// GET all location radius ranking rules
adminRouter.get('/location-rankings', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  if (!store.location_rankings) store.location_rankings = [];

  return res.json({
    success: true,
    data: store.location_rankings
  });
});

// CREATE or UPDATE a Location Radius Ranking Rule
adminRouter.post('/location-rankings', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  if (!store.location_rankings) store.location_rankings = [];

  const { id, name, name_bn, lat, lng, radius_km, is_active, rankings } = req.body;

  if (!name || !lat || !lng) {
    return res.status(400).json({
      success: false,
      message: 'Location rule name and latitude/longitude center coordinates are required.'
    });
  }

  // Strict Service Area Boundary Check for Ranking Rules
  const matchedServiceArea = locationService.findServiceAreaForLocation({
    lat: Number(lat),
    lng: Number(lng)
  });

  if (!matchedServiceArea) {
    return res.status(400).json({
      success: false,
      message: 'Selected location is Out of Service Area! (নির্বাচিত অবস্থানটি সার্ভিস সীমানার বাইরে। দয়া করে সার্ভিস এরিয়ার ভেতরে পিন সিলেক্ট করুন)'
    });
  }

  const cleanRankings = Array.isArray(rankings)
    ? rankings
        .map((r: any) => ({
          restaurant_id: Number(r.restaurant_id),
          rank: Number(r.rank)
        }))
        .filter((r: any) => r.restaurant_id > 0 && r.rank >= 1 && r.rank <= 5)
    : [];

  let rule: any = null;
  if (id) {
    const idx = store.location_rankings.findIndex((r: any) => r.id === Number(id));
    if (idx !== -1) {
      rule = {
        ...store.location_rankings[idx],
        name: name.trim(),
        name_bn: name_bn ? name_bn.trim() : store.location_rankings[idx].name_bn,
        lat: Number(lat),
        lng: Number(lng),
        radius_km: Number(radius_km || 3.0),
        is_active: typeof is_active !== 'undefined' ? (is_active ? 1 : 0) : 1,
        rankings: cleanRankings,
        updated_at: new Date().toISOString()
      };
      store.location_rankings[idx] = rule;
    }
  }

  if (!rule) {
    const newId = store.location_rankings.length > 0
      ? Math.max(...store.location_rankings.map((r: any) => Number(r.id) || 0)) + 1
      : 1;
    rule = {
      id: newId,
      name: name.trim(),
      name_bn: name_bn ? name_bn.trim() : '',
      lat: Number(lat),
      lng: Number(lng),
      radius_km: Number(radius_km || 3.0),
      is_active: 1,
      rankings: cleanRankings,
      created_at: new Date().toISOString()
    };
    store.location_rankings.push(rule);
  }

  return res.json({
    success: true,
    message: 'Location Radius Ranking Rule saved successfully! (রেডিয়াস র‍্যাঙ্কিং রুল সেভ করা হয়েছে)',
    data: rule
  });
});

// DELETE a Location Radius Ranking Rule
adminRouter.delete('/location-rankings/:id', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  if (!store.location_rankings) store.location_rankings = [];

  const paramId = req.params.id;
  const ruleId = Number(paramId);
  const idx = store.location_rankings.findIndex(
    (r: any) => Number(r.id) === ruleId || String(r.id) === String(paramId)
  );

  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Location ranking rule not found' });
  }

  const deleted = store.location_rankings.splice(idx, 1)[0];

  return res.json({
    success: true,
    message: `Location ranking rule "${deleted.name}" deleted successfully! (রুলটি ডিলিট করা হয়েছে)`,
    data: deleted
  });
});

// TOGGLE Status for Location Radius Ranking Rule
adminRouter.put('/location-rankings/:id/toggle-status', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  if (!store.location_rankings) store.location_rankings = [];

  const ruleId = Number(req.params.id);
  const rule = store.location_rankings.find((r: any) => r.id === ruleId);

  if (!rule) {
    return res.status(404).json({ success: false, message: 'Location ranking rule not found' });
  }

  rule.is_active = rule.is_active ? 0 : 1;

  return res.json({
    success: true,
    message: `Rule status toggled to ${rule.is_active ? 'Active' : 'Inactive'}`,
    data: rule
  });
});

// Update or set location-wise restaurant rankings (Top 1..5)
adminRouter.post('/restaurant-rankings', (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  if (!store.restaurant_rankings) store.restaurant_rankings = [];

  const { service_area_id, rankings } = req.body;
  const areaId = typeof service_area_id !== 'undefined' && service_area_id !== null ? Number(service_area_id) : 0;

  if (!Array.isArray(rankings)) {
    return res.status(400).json({ success: false, message: 'Rankings must be an array of { restaurant_id, rank }' });
  }

  // Clean rankings array
  const cleanRankings = rankings
    .map((r: any) => ({
      restaurant_id: Number(r.restaurant_id),
      rank: Number(r.rank)
    }))
    .filter((r: any) => r.restaurant_id > 0 && r.rank >= 1 && r.rank <= 5);

  const existingIdx = store.restaurant_rankings.findIndex((r: any) => Number(r.service_area_id) === areaId);
  const ruleData = {
    service_area_id: areaId,
    rankings: cleanRankings,
    updated_at: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    store.restaurant_rankings[existingIdx] = ruleData;
  } else {
    store.restaurant_rankings.push(ruleData);
  }

  return res.json({
    success: true,
    message: 'Location restaurant rankings saved successfully! (রেস্তোরাঁর র‍্যাঙ্কিং ও অবস্থান সেভ করা হয়েছে)',
    data: ruleData
  });
});



