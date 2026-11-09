import { Router, Request, Response } from 'express';
import { db } from '../db';
import { orderService } from '../services/orderService';
import { authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';

export const orderRouter = Router();

// Create new order (Phase 2B - unchanged)
orderRouter.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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

    const order = await orderService.createOrder({
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

// List orders (Phase 3C MySQL Migration)
orderRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  if (db.isUsingMysql()) {
    let sql = 'SELECT * FROM orders';
    const params: any[] = [];

    if (user.role === 'customer') {
      sql += ' WHERE customer_id = ? ORDER BY id DESC';
      params.push(user.id);
    } else if (user.role === 'restaurant') {
      const restRes = await db.query('SELECT id FROM restaurants WHERE user_id = ? LIMIT 1', [user.id]);
      const restId = restRes.rows[0]?.id;
      if (!restId) {
        return res.json({ success: true, data: [] });
      }
      sql += ' WHERE restaurant_id = ? ORDER BY id DESC';
      params.push(restId);
    } else if (user.role === 'delivery') {
      const dpRes = await db.query('SELECT id FROM delivery_partners WHERE user_id = ? LIMIT 1', [user.id]);
      const dpId = dpRes.rows[0]?.id;
      if (!dpId) {
        return res.json({ success: true, data: [] });
      }
      sql += ` WHERE (delivery_partner_id = ? OR (status NOT IN ('delivered', 'cancelled') AND (rider_requested = 1 OR (is_self_delivery = 0 AND delivery_partner_id IS NULL)))) ORDER BY id DESC`;
      params.push(dpId);
    } else {
      // admin
      sql += ' ORDER BY id DESC';
    }

    const ordersRes = await db.query(sql, params);
    const rawOrders = ordersRes.rows;

    const formattedOrders = await Promise.all(
      rawOrders.map(async (o: any) => {
        let items: any[] = [];
        if (o.items_json) {
          try {
            items = typeof o.items_json === 'string' ? JSON.parse(o.items_json) : o.items_json;
          } catch {}
        }
        if (!items || items.length === 0) {
          const itemsRes = await db.query('SELECT * FROM order_items WHERE order_id = ?', [o.id]);
          items = itemsRes.rows.map((it: any) => ({
            food_id: it.food_id,
            food_name: it.food_name,
            food_name_bn: it.food_name_bn || it.food_name,
            price: Number(it.unit_price || it.price),
            quantity: Number(it.quantity),
            total_price: Number(it.total_price),
            restaurant_id: o.restaurant_id,
            restaurant_name: o.restaurant_name,
            special_instructions: it.special_instructions || ''
          }));
        }

        return {
          ...o,
          id: Number(o.id),
          customer_id: Number(o.customer_id),
          restaurant_id: Number(o.restaurant_id),
          delivery_partner_id: o.delivery_partner_id != null ? Number(o.delivery_partner_id) : null,
          subtotal: Number(o.subtotal || 0),
          delivery_fee: Number(o.delivery_fee || 0),
          discount: Number(o.discount || 0),
          tax: Number(o.tax || 0),
          grand_total: Number(o.grand_total || 0),
          distance_km: Number(o.distance_km || 1.0),
          is_self_delivery: Number(o.is_self_delivery || 0),
          rider_requested: Number(o.rider_requested || 0),
          items
        };
      })
    );

    return res.json({
      success: true,
      data: formattedOrders
    });
  }

  // In-memory fallback
  const store = db.getStore();
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
      if (o.delivery_partner_id === dp.id) return true;
      if (['delivered', 'cancelled'].includes(o.status)) return false;
      if (Boolean(o.rider_requested)) return true;
      const isSelfDelivery = o.is_self_delivery === 1 || o.is_self_delivery === true || o.delivery_mode === 'self_delivery';
      if (!isSelfDelivery && !o.delivery_partner_id) return true;
      return false;
    });
  }

  return res.json({
    success: true,
    data: orders
  });
});

// Get single order with live location info (Phase 3C MySQL Migration)
orderRouter.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const orderId = Number(req.params.id);
  const user = req.user!;

  if (db.isUsingMysql()) {
    const orderRes = await db.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [orderId]);
    const rawOrder = orderRes.rows[0];

    if (!rawOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Role-based Access Control Check
    if (user.role === 'customer' && Number(rawOrder.customer_id) !== user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }
    if (user.role === 'restaurant') {
      const restRes = await db.query('SELECT id FROM restaurants WHERE user_id = ? LIMIT 1', [user.id]);
      const restId = restRes.rows[0]?.id;
      if (!restId || Number(rawOrder.restaurant_id) !== Number(restId)) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
      }
    }
    if (user.role === 'delivery') {
      const dpRes = await db.query('SELECT id FROM delivery_partners WHERE user_id = ? LIMIT 1', [user.id]);
      const dpId = dpRes.rows[0]?.id;
      const isAssigned = dpId && Number(rawOrder.delivery_partner_id) === Number(dpId);
      const isAvailableJob = !['delivered', 'cancelled'].includes(rawOrder.status) &&
        (Boolean(rawOrder.rider_requested) || (rawOrder.is_self_delivery === 0 && !rawOrder.delivery_partner_id));

      if (!isAssigned && !isAvailableJob) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
      }
    }

    let items: any[] = [];
    if (rawOrder.items_json) {
      try {
        items = typeof rawOrder.items_json === 'string' ? JSON.parse(rawOrder.items_json) : rawOrder.items_json;
      } catch {}
    }
    if (!items || items.length === 0) {
      const itemsRes = await db.query('SELECT * FROM order_items WHERE order_id = ?', [rawOrder.id]);
      items = itemsRes.rows.map((it: any) => ({
        food_id: it.food_id,
        food_name: it.food_name,
        food_name_bn: it.food_name_bn || it.food_name,
        price: Number(it.unit_price || it.price),
        quantity: Number(it.quantity),
        total_price: Number(it.total_price),
        restaurant_id: rawOrder.restaurant_id,
        restaurant_name: rawOrder.restaurant_name,
        special_instructions: it.special_instructions || ''
      }));
    }

    let deliveryPartnerLocation = null;
    if (rawOrder.delivery_partner_id && (rawOrder.status === 'picked_up' || rawOrder.status === 'on_the_way')) {
      const dpRes = await db.query('SELECT * FROM delivery_partners WHERE id = ? LIMIT 1', [rawOrder.delivery_partner_id]);
      const dp = dpRes.rows[0];
      if (dp) {
        deliveryPartnerLocation = {
          lat: dp.current_lat != null ? Number(dp.current_lat) : Number(rawOrder.restaurant_lat),
          lng: dp.current_lng != null ? Number(dp.current_lng) : Number(rawOrder.restaurant_lng),
          name: dp.name,
          phone: dp.phone,
          vehicle_type: dp.vehicle_type,
          vehicle_number: dp.vehicle_number
        };
      }
    }

    const orderData = {
      ...rawOrder,
      id: Number(rawOrder.id),
      customer_id: Number(rawOrder.customer_id),
      restaurant_id: Number(rawOrder.restaurant_id),
      delivery_partner_id: rawOrder.delivery_partner_id != null ? Number(rawOrder.delivery_partner_id) : null,
      subtotal: Number(rawOrder.subtotal || 0),
      delivery_fee: Number(rawOrder.delivery_fee || 0),
      discount: Number(rawOrder.discount || 0),
      tax: Number(rawOrder.tax || 0),
      grand_total: Number(rawOrder.grand_total || 0),
      distance_km: Number(rawOrder.distance_km || 1.0),
      is_self_delivery: Number(rawOrder.is_self_delivery || 0),
      rider_requested: Number(rawOrder.rider_requested || 0),
      items,
      deliveryPartnerLocation
    };

    return res.json({
      success: true,
      data: orderData
    });
  }

  // In-memory fallback
  const store = db.getStore();
  const order = store.orders.find((o: any) => o.id === orderId);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

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

// Update order status (Phase 2B - unchanged)
orderRouter.put('/:id/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const { status, preparation_minutes, reason, is_self_delivery, delivery_mode } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const updated = await orderService.updateOrderStatus(orderId, status, {
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

// Restaurant: Request / Assign Delivery Partner Rider for an order (Phase 2B - unchanged)
orderRouter.post('/:id/request-rider', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const result = await orderService.manualRequestDeliveryPartner(orderId);
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

// Restaurant: Handover food package to the arrived rider (Phase 2B - unchanged)
orderRouter.post('/:id/handover-to-rider', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const result = await orderService.handoverOrderToRider(orderId);
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

// Customer: Report issue / request refund during 24h Escrow Protection window (Phase 2B - unchanged)
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
