import { Router, Request, Response } from 'express';
import { db } from '../db';
import { orderService } from '../services/orderService';
import { authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';

export const orderRouter = Router();

// Create new order
orderRouter.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      restaurantId,
      directRestaurantOnly,
      items,
      deliveryAddress,
      deliveryLandmark,
      deliveryLat,
      deliveryLng,
      couponCode,
      paymentMethod,
      customerNotes
    } = req.body;

    if (!items || !items.length || !deliveryAddress || !deliveryLat || !deliveryLng) {
      return res.status(400).json({
        success: false,
        message: 'Missing required order fields: items, address, coordinates'
      });
    }

    const order = orderService.createOrder({
      customerId: req.user!.id,
      restaurantId: Number(restaurantId || 1),
      directRestaurantOnly: Boolean(directRestaurantOnly),
      items,
      deliveryAddress,
      deliveryLandmark,
      deliveryLat: Number(deliveryLat),
      deliveryLng: Number(deliveryLng),
      couponCode,
      paymentMethod: paymentMethod || 'cod',
      customerNotes
    });

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully (অর্ডার সফলভাবে সম্পন্ন হয়েছে)',
      data: order
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to place order'
    });
  }
});

// List orders
orderRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const user = req.user!;
  let orders = [...store.orders];

  if (user.role === 'customer') {
    orders = orders.filter((o: any) => o.customer_id === user.id);
  } else if (user.role === 'restaurant') {
    const rest = store.restaurants.find((r: any) => r.user_id === user.id);
    if (rest) {
      orders = orders.filter((o: any) => o.restaurant_id === rest.id);
    } else {
      orders = [];
    }
  } else if (user.role === 'delivery') {
    let dp = store.delivery_partners.find((d: any) => d.user_id === user.id);
    if (!dp) {
      dp = {
        id: store.delivery_partners.length + 1,
        user_id: user.id,
        service_area_id: 1,
        name: user.name,
        phone: user.phone,
        vehicle_type: 'bike',
        vehicle_number: 'WB-01-BK-0001',
        driving_license_number: 'DL-WB-2024-001',
        status: 'approved',
        is_online: 1,
        current_lat: 22.5401,
        current_lng: 88.3610,
        last_location_updated_at: new Date().toISOString(),
        total_deliveries: 0,
        rating: 5.0,
        wallet_balance: 0.00
      };
      store.delivery_partners.push(dp);
    }

    orders = orders.filter((o: any) => {
      // 1. Orders assigned to this rider
      if (o.delivery_partner_id === dp.id) return true;

      // 2. Completed or cancelled orders are not available
      if (['delivered', 'cancelled'].includes(o.status)) return false;

      // 3. Orders where restaurant clicked "Request Rider"
      if (Boolean(o.rider_requested)) return true;

      // 4. Platform delivery orders that are unassigned
      const isSelfDelivery = o.is_self_delivery === 1 || o.is_self_delivery === true || o.delivery_mode === 'self_delivery';
      if (!isSelfDelivery && !o.delivery_partner_id) return true;

      return false;
    });
  }
  // admin gets all orders

  return res.json({
    success: true,
    data: orders
  });
});

// Get single order with live location info
orderRouter.get('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const orderId = Number(req.params.id);
  const order = store.orders.find((o: any) => o.id === orderId);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // Include delivery partner live location if active
  let deliveryPartnerLocation = null;
  if (order.delivery_partner_id && (order.status === 'picked_up' || order.status === 'on_the_way')) {
    const dp = store.delivery_partners.find((d: any) => d.id === order.delivery_partner_id);
    if (dp) {
      deliveryPartnerLocation = {
        lat: dp.current_lat || order.restaurant_lat,
        lng: dp.current_lng || order.restaurant_lng,
        name: dp.name,
        phone: dp.phone,
        vehicle_type: dp.vehicle_type,
        vehicle_number: dp.vehicle_number
      };
    }
  }

  return res.json({
    success: true,
    data: {
      ...order,
      deliveryPartnerLocation
    }
  });
});

// Update order status (Restaurant accept/reject, Driver pickup/deliver, etc.)
orderRouter.put('/:id/status', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const { status, preparation_minutes, reason, is_self_delivery, delivery_mode } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const updated = orderService.updateOrderStatus(orderId, status, {
      preparation_minutes: preparation_minutes ? Number(preparation_minutes) : undefined,
      reason,
      is_self_delivery,
      delivery_mode
    }, req.user);

    return res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: updated
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Status update failed'
    });
  }
});

// Restaurant: Request / Assign Delivery Partner Rider for an order
orderRouter.post('/:id/request-rider', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const result = orderService.manualRequestDeliveryPartner(orderId);
    return res.json({
      success: true,
      message: result.message,
      data: result.order,
      assigned: result.assigned
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to request delivery partner'
    });
  }
});

// Restaurant: Handover food package to the arrived rider
orderRouter.post('/:id/handover-to-rider', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const result = orderService.handoverOrderToRider(orderId);
    return res.json({
      success: true,
      message: 'Food package successfully handed over to the rider! (রাইডারকে খাবার বুঝিয়ে দেওয়া হয়েছে)',
      data: result
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to handover order to rider'
    });
  }
});

// Customer: Report issue / request refund during 24h Escrow Protection window
orderRouter.post('/:id/dispute', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const { reason, issueType } = req.body;
    const store = db.getStore();
    const order = store.orders.find((o: any) => o.id === orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customer_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to dispute this order' });
    }

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Please provide reason or issue description' });
    }

    order.escrow_status = 'disputed';
    order.dispute_reason = `[${issueType || 'Customer Issue'}]: ${reason}`;
    order.disputed_at = new Date().toISOString();

    return res.json({
      success: true,
      message: 'Issue reported to Admin Support. Escrow funds have been locked for investigation. (আপনার অভিযোগ অ্যাডমিন সাপোর্টে জমা হয়েছে, টাকা সাময়িক স্থগিত আছে।)',
      data: order
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});
