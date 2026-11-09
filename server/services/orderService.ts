import { db } from '../db';
import { locationService } from './locationService';
import { notificationService } from './notificationService';
import { paymentService } from './paymentService';

export interface CreateOrderInput {
  customerId: number;
  restaurantId: number;
  directRestaurantOnly?: boolean;
  items: {
    foodId: number;
    quantity: number;
    specialInstructions?: string;
  }[];
  deliveryAddress: string;
  deliveryLandmark?: string;
  deliveryLat: number;
  deliveryLng: number;
  couponCode?: string;
  paymentMethod: 'cod' | 'cashfree' | 'razorpay' | 'upi';
  customerNotes?: string;
}

export const orderService = {
  async createOrder(input: CreateOrderInput) {
    const store = db.getStore();
    const isDirectOnly = input.directRestaurantOnly === true;

    // Strict Service Area Geofence Boundary Check
    const matchedServiceArea = await locationService.findServiceAreaForLocation({
      lat: Number(input.deliveryLat),
      lng: Number(input.deliveryLng)
    });

    if (!matchedServiceArea) {
      throw new Error(
        'আপনার এই ডেলিভারি এলাকাটি আমাদের সার্ভিস সীমানার বাইরে (Not Serviceable)। সীমানার ভেতরের কোন স্থান নির্বাচন করুন।'
      );
    }

    // Fetch customer and restaurant information
    let primaryRestaurant: any = null;
    let customer: any = null;
    let foodsMap = new Map<number, any>();
    let restaurantsMap = new Map<number, any>();
    let couponsList: any[] = [];
    let settingsData: any = {};
    let promotionsData: any = {};

    if (db.isUsingMysql()) {
      const [restRes]: any = await db.query('SELECT * FROM restaurants WHERE id = ? LIMIT 1', [input.restaurantId]);
      primaryRestaurant = restRes[0] || null;
      if (!primaryRestaurant) {
        const [allRests]: any = await db.query('SELECT * FROM restaurants LIMIT 1', []);
        primaryRestaurant = allRests[0];
      }

      const [custRes]: any = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [input.customerId]);
      customer = custRes[0] || null;

      const [settingsRes]: any = await db.query('SELECT * FROM platform_settings LIMIT 1', []);
      if (settingsRes[0]?.settings_json) {
        try { settingsData = JSON.parse(settingsRes[0].settings_json); } catch {}
      }

      const [promosRes]: any = await db.query('SELECT * FROM promotions LIMIT 1', []);
      if (promosRes[0]) promotionsData = promosRes[0];

      const [couponsRes]: any = await db.query('SELECT * FROM coupons WHERE is_active = 1', []);
      couponsList = couponsRes;
    } else {
      primaryRestaurant = store.restaurants.find((r: any) => r.id === input.restaurantId) || store.restaurants[0];
      customer = store.users.find((u: any) => u.id === input.customerId);
      settingsData = store.settings || {};
      promotionsData = store.promotions || {};
      couponsList = store.coupons || [];
    }

    // Calculate subtotal & validate items
    let subtotal = 0;
    const orderItems: any[] = [];
    const involvedRestaurantIds = new Set<number>();

    for (const item of input.items) {
      let food: any = null;
      let itemRestaurant: any = null;

      if (db.isUsingMysql()) {
        const [foodRes]: any = await db.query('SELECT * FROM foods WHERE id = ? LIMIT 1', [item.foodId]);
        food = foodRes[0] || null;
        if (!food) throw new Error(`Item ID ${item.foodId} not found in menu`);

        const [restRes]: any = await db.query('SELECT * FROM restaurants WHERE id = ? LIMIT 1', [food.restaurant_id]);
        itemRestaurant = restRes[0] || null;
      } else {
        food = store.foods.find((f: any) => f.id === item.foodId);
        if (!food) throw new Error(`Item ID ${item.foodId} not found in menu`);
        itemRestaurant = store.restaurants.find((r: any) => r.id === food.restaurant_id);
      }

      const avail = food.is_available;
      if (avail === 0 || avail === '0' || avail === false || avail === null || avail === undefined) {
        throw new Error(`"${food.name || 'খাবারটি'}" বর্তমানে আউট অফ স্টক (স্টক শেষ) এবং এটি অর্ডার করা যাবে না।`);
      }

      involvedRestaurantIds.add(food.restaurant_id);

      const unitPrice = food.discount_price ? Number(food.discount_price) : Number(food.price);
      const totalItemPrice = unitPrice * item.quantity;
      subtotal += totalItemPrice;

      orderItems.push({
        food_id: food.id,
        food_name: food.name,
        food_name_bn: food.name_bn,
        price: unitPrice,
        quantity: item.quantity,
        total_price: totalItemPrice,
        restaurant_id: food.restaurant_id,
        restaurant_name: itemRestaurant ? itemRestaurant.name : primaryRestaurant.name,
        special_instructions: item.specialInstructions || ''
      });
    }

    if (involvedRestaurantIds.size > 0 && !isDirectOnly) {
      const firstRestId = Array.from(involvedRestaurantIds)[0];
      if (db.isUsingMysql()) {
        const [rRes]: any = await db.query('SELECT * FROM restaurants WHERE id = ? LIMIT 1', [firstRestId]);
        if (rRes[0]) primaryRestaurant = rRes[0];
      } else {
        const foundRest = store.restaurants.find((r: any) => r.id === firstRestId);
        if (foundRest) primaryRestaurant = foundRest;
      }
    }

    // COD Validation
    if (input.paymentMethod === 'cod') {
      const isGlobalCod = settingsData.global_cod_enabled === 1 || settingsData.global_cod_enabled === true;
      const isUserCodAllowed = customer?.cod_enabled === 1 || customer?.cod_enabled === true;
      if (!isGlobalCod && !isUserCodAllowed) {
        throw new Error(
          'Cash on Delivery (COD) is currently disabled. Please select Online Prepaid Payment (UPI / Cards). (ক্যাশ অন ডেলিভারি বর্তমানে বন্ধ আছে। অনলাইন পেমেন্ট করুন।)'
        );
      }
    }

    const targetRestaurant = primaryRestaurant;
    const distanceKm = locationService.calculateDistanceKm(
      Number(targetRestaurant.latitude),
      Number(targetRestaurant.longitude),
      input.deliveryLat,
      input.deliveryLng
    );
    const rawDeliveryFee = await locationService.calculateDeliveryFee(distanceKm, targetRestaurant.service_area_id);
    let deliveryFee = rawDeliveryFee;
    let deliveryDiscount = 0;

    const promos = promotionsData;
    if (promos.customer_delivery_discount_enabled) {
      if (promos.customer_delivery_discount_type === 'free_delivery_above') {
        const threshold = Number(promos.customer_min_order_for_free_delivery || 199);
        if (subtotal >= threshold) {
          deliveryDiscount = deliveryFee;
          deliveryFee = 0;
        }
      } else if (promos.customer_delivery_discount_type === 'flat_discount') {
        const flatOff = Number(promos.customer_flat_delivery_discount || 10);
        deliveryDiscount = Math.min(deliveryFee, flatOff);
        deliveryFee = Math.max(0, deliveryFee - deliveryDiscount);
      } else if (promos.customer_delivery_discount_type === 'percent_discount') {
        const pct = Math.min(100, Math.max(0, Number(promos.customer_delivery_discount_value || 50)));
        deliveryDiscount = Math.round((deliveryFee * (pct / 100)) * 100) / 100;
        deliveryFee = Math.max(0, deliveryFee - deliveryDiscount);
      }
    }

    // Coupon discount
    let discount = 0;
    if (input.couponCode) {
      const coupon = couponsList.find((c: any) => c.code.toUpperCase() === input.couponCode?.toUpperCase() && c.is_active);
      if (coupon && subtotal >= coupon.min_order_amount) {
        if (coupon.discount_type === 'percentage') {
          discount = Math.min((subtotal * coupon.discount_value) / 100, coupon.max_discount || 100);
        } else {
          discount = Math.min(coupon.discount_value, subtotal);
        }
      }
    }

    const tax = Math.round((subtotal * 0.05) * 100) / 100;
    const grandTotal = Math.max(0, Math.round(subtotal + deliveryFee - discount + tax));

    const isRestSelfDeliveryEnabled = Boolean(targetRestaurant.self_delivery_enabled);
    const selfRadius = Number(targetRestaurant.self_delivery_radius_km || 3);
    const isWithinSelfRadius = distanceKm <= selfRadius;
    const initialSelfDelivery = isRestSelfDeliveryEnabled && isWithinSelfRadius;

    let commRate = targetRestaurant.commission_rate
      ? Number(targetRestaurant.commission_rate)
      : Number(settingsData.restaurant_commission_percent ?? 15.0);

    if (promos.restaurant_discount_enabled) {
      if (promos.restaurant_discount_type === 'percent_off_commission') {
        const discountPct = Math.min(100, Math.max(0, Number(promos.restaurant_discount_value || 50)));
        commRate = commRate * ((100 - discountPct) / 100);
      } else if (promos.restaurant_discount_type === 'flat_commission_rate') {
        commRate = Math.max(0, Number(promos.restaurant_discount_value || 5));
      }
    }

    const platformRestFee = Math.round((subtotal * (commRate / 100)) * 100) / 100;
    const netFoodEarning = Math.round((subtotal - platformRestFee) * 100) / 100;

    let dpCommRate = Number(settingsData.delivery_partner_commission_percent ?? 10.0);
    let riderBonus = 0;

    if (promos.partner_discount_enabled) {
      if (promos.partner_discount_type === 'zero_fee') {
        dpCommRate = 0;
      } else if (promos.partner_discount_type === 'percent_off_fee') {
        const discountPct = Math.min(100, Math.max(0, Number(promos.partner_discount_value || 50)));
        dpCommRate = dpCommRate * ((100 - discountPct) / 100);
      } else if (promos.partner_discount_type === 'flat_fee_rate') {
        dpCommRate = Math.max(0, Number(promos.partner_discount_value || 5));
      }
      riderBonus = Math.max(0, Number(promos.partner_bonus_per_order || 0));
    }

    const riderShareRatio = Math.max(0, (100 - dpCommRate) / 100);
    const minFareGuarantee = Number(settingsData.min_delivery_fare ?? 20.0);
    const baseRiderPayout = Math.max(
      minFareGuarantee,
      Math.round((rawDeliveryFee * riderShareRatio) * 100) / 100
    );
    const dpEarning = baseRiderPayout + riderBonus;
    const netRestaurantAmount = initialSelfDelivery ? (netFoodEarning + deliveryFee) : netFoodEarning;

    const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let newOrderId = 1;

    if (db.isUsingMysql()) {
      const pool = db.getPool();
      if (!pool) throw new Error('MySQL pool not initialized');
      const conn = await pool.getConnection();
      await conn.beginTransaction();
      try {
        const [orderRes]: any = await conn.execute(
          `INSERT INTO orders (
            order_number, customer_id, customer_name, customer_phone, restaurant_id, restaurant_name, restaurant_phone, restaurant_address, restaurant_lat, restaurant_lng,
            service_area_id, status, delivery_address, delivery_landmark, delivery_lat, delivery_lng, distance_km, subtotal, delivery_fee, discount, tax, grand_total,
            payment_method, payment_status, is_self_delivery, delivery_mode, self_delivery_radius_km, restaurant_commission_rate, net_restaurant_amount, delivery_partner_earning,
            preparation_minutes, estimated_delivery_time, customer_notes, placed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 25, '30-40 mins', ?, NOW())`,
          [
            orderNumber,
            input.customerId,
            customer ? customer.name : 'Valued Customer',
            customer ? customer.phone : '',
            targetRestaurant.id,
            targetRestaurant.name,
            targetRestaurant.phone,
            targetRestaurant.address,
            targetRestaurant.latitude,
            targetRestaurant.longitude,
            targetRestaurant.service_area_id || 1,
            input.deliveryAddress,
            input.deliveryLandmark || '',
            input.deliveryLat,
            input.deliveryLng,
            distanceKm,
            subtotal,
            deliveryFee,
            discount,
            tax,
            grandTotal,
            input.paymentMethod,
            input.paymentMethod === 'cod' ? 'cod' : 'paid',
            initialSelfDelivery ? 1 : 0,
            initialSelfDelivery ? 'self_delivery' : 'platform_rider',
            selfRadius,
            commRate,
            netRestaurantAmount,
            initialSelfDelivery ? 0 : dpEarning,
            input.customerNotes || ''
          ]
        );
        newOrderId = orderRes.insertId;

        for (const it of orderItems) {
          await conn.execute(
            `INSERT INTO order_items (order_id, food_id, food_name, food_name_bn, price, quantity, total_price, restaurant_id, restaurant_name, special_instructions)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newOrderId,
              it.food_id,
              it.food_name,
              it.food_name_bn,
              it.price,
              it.quantity,
              it.total_price,
              it.restaurant_id,
              it.restaurant_name,
              it.special_instructions
            ]
          );
        }

        await conn.commit();
        conn.release();
      } catch (err) {
        await conn.rollback();
        conn.release();
        throw err;
      }
    } else {
      newOrderId = store.orders.length + 1;
      const newOrder = {
        id: newOrderId,
        order_number: orderNumber,
        customer_id: input.customerId,
        customer_name: customer ? customer.name : 'Valued Customer',
        customer_phone: customer ? customer.phone : '',
        restaurant_id: targetRestaurant.id,
        restaurant_name: targetRestaurant.name,
        restaurant_phone: targetRestaurant.phone,
        restaurant_address: targetRestaurant.address,
        restaurant_lat: targetRestaurant.latitude,
        restaurant_lng: targetRestaurant.longitude,
        delivery_partner_id: null,
        delivery_partner_name: null,
        delivery_partner_phone: null,
        delivery_partner_lat: null,
        delivery_partner_lng: null,
        service_area_id: targetRestaurant.service_area_id || 1,
        status: 'pending',
        delivery_address: input.deliveryAddress,
        delivery_landmark: input.deliveryLandmark || '',
        delivery_lat: input.deliveryLat,
        delivery_lng: input.deliveryLng,
        items: orderItems,
        distance_km: distanceKm,
        subtotal,
        delivery_fee: deliveryFee,
        discount,
        tax,
        grand_total: grandTotal,
        payment_method: input.paymentMethod,
        payment_status: input.paymentMethod === 'cod' ? 'cod' : 'paid',
        is_self_delivery: initialSelfDelivery ? 1 : 0,
        delivery_mode: initialSelfDelivery ? 'self_delivery' : 'platform_rider',
        self_delivery_radius_km: selfRadius,
        restaurant_commission_rate: commRate,
        net_restaurant_amount: netRestaurantAmount,
        delivery_partner_earning: initialSelfDelivery ? 0 : dpEarning,
        preparation_minutes: 25,
        estimated_delivery_time: '30-40 mins',
        customer_notes: input.customerNotes || '',
        placed_at: new Date().toISOString()
      };
      store.orders.unshift(newOrder);
    }

    // Process payment record
    await paymentService.processPayment({
      orderId: newOrderId,
      amount: grandTotal,
      method: input.paymentMethod,
      customerId: input.customerId
    });

    const createdOrderObject = {
      id: newOrderId,
      order_number: orderNumber,
      customer_id: input.customerId,
      customer_name: customer ? customer.name : 'Valued Customer',
      restaurant_id: targetRestaurant.id,
      restaurant_name: targetRestaurant.name,
      items: orderItems,
      subtotal,
      delivery_fee: deliveryFee,
      grand_total: grandTotal,
      payment_method: input.paymentMethod,
      payment_status: input.paymentMethod === 'cod' ? 'cod' : 'paid',
      status: 'pending',
      placed_at: new Date().toISOString()
    };

    // Notify Restaurant Owner & Customer
    try {
      await notificationService.createNotification({
        userId: targetRestaurant.user_id,
        role: 'restaurant',
        title: `New Order #${orderNumber}`,
        title_bn: `নতুন অর্ডার #${orderNumber}`,
        message: `New order received: ${orderItems.length} items worth ₹${grandTotal}. Please accept now.`,
        message_bn: `নতুন অর্ডার এসেছে: মোট ₹${grandTotal} টাকার ${orderItems.length}টি খাবার। অনুগ্রহ করে কনফার্ম করুন।`,
        type: 'new_order',
        data: { orderId: newOrderId }
      });

      await notificationService.createNotification({
        userId: input.customerId,
        role: 'customer',
        title: 'Order Placed Successfully!',
        title_bn: 'আপনার অর্ডার গৃহীত হয়েছে!',
        message: `Order #${orderNumber} sent to ${targetRestaurant.name}. Waiting for confirmation.`,
        message_bn: `আপনার অর্ডার #${orderNumber} ${targetRestaurant.name}-এ পাঠানো হয়েছে। কনফার্মেশন অপেক্ষমান।`,
        type: 'order_status',
        data: { orderId: newOrderId }
      });
    } catch {}

    return createdOrderObject;
  },

  async updateOrderStatus(orderId: number, newStatus: string, extra?: any, user?: { id: number; role: string }) {
    if (db.isUsingMysql()) {
      const [orderRes]: any = await db.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [orderId]);
      if (!orderRes[0]) throw new Error('Order not found');
      const order = orderRes[0];

      const [restRes]: any = await db.query('SELECT * FROM restaurants WHERE id = ? LIMIT 1', [order.restaurant_id]);
      const restaurant = restRes[0];
      const hasSelfDelivery = restaurant?.self_delivery_enabled === 1 || restaurant?.self_delivery_enabled === true;
      const isSelfDeliveryOrder = order.is_self_delivery === 1 || order.delivery_mode === 'self_delivery';

      if (user && user.role === 'restaurant') {
        const isOutOrDelivered = ['picked_up', 'on_the_way', 'out_for_delivery', 'delivered'].includes(newStatus);
        if (isOutOrDelivered && (!hasSelfDelivery || !isSelfDeliveryOrder)) {
          throw new Error(
            'আপনার রেস্তোরাঁ রেজিস্ট্রেশনের সময় Self Delivery No থাকায় আউট ফর ডেলিভারি ও ডেলিভারি সম্পন্ন করার দায়িত্ব প্ল্যাটফর্ম ডেলিভারি পার্টনারের (Rider)। রেস্তোরাঁ শুধুমাত্র খাবার প্রস্তুত (Ready for Pickup) করতে পারবে।'
          );
        }
      }

      let updateSql = 'UPDATE orders SET status = ?';
      const params: any[] = [newStatus];

      if (newStatus === 'accepted') {
        updateSql += ', accepted_at = NOW()';
      } else if (newStatus === 'ready') {
        updateSql += ', ready_at = NOW()';
      } else if (newStatus === 'picked_up' || newStatus === 'on_the_way' || newStatus === 'out_for_delivery') {
        updateSql += ', picked_up_at = COALESCE(picked_up_at, NOW()), status = "on_the_way"';
      } else if (newStatus === 'delivered') {
        updateSql += ', delivered_at = NOW(), payment_status = CASE WHEN payment_method = "cod" THEN "paid" ELSE payment_status END, escrow_status = "holding", holding_until = DATE_ADD(NOW(), INTERVAL 24 HOUR)';
        // Credit delivery partner wallet if assigned
        if (order.delivery_partner_id && order.delivery_partner_earning > 0) {
          const [dpRes]: any = await db.query('SELECT * FROM delivery_partners WHERE id = ? LIMIT 1', [order.delivery_partner_id]);
          if (dpRes[0]) {
            await paymentService.creditWallet(dpRes[0].user_id, 'delivery', Number(order.delivery_partner_earning), 'order_delivery', orderId, `Delivery earning for order #${order.order_number}`);
            await db.query('UPDATE delivery_partners SET total_deliveries = total_deliveries + 1, active_order_id = NULL WHERE id = ?', [order.delivery_partner_id]);
          }
        }
      } else if (newStatus === 'cancelled') {
        updateSql += ', cancelled_at = NOW()';
      }

      if (extra?.preparation_minutes) {
        updateSql += ', preparation_minutes = ?';
        params.push(extra.preparation_minutes);
      }

      updateSql += ' WHERE id = ?';
      params.push(orderId);

      await db.query(updateSql, params);
      const [updatedRes]: any = await db.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [orderId]);
      return updatedRes[0];
    }

    // Memory fallback
    const store = db.getStore();
    const order = store.orders.find((o: any) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    order.status = newStatus;
    if (newStatus === 'delivered') {
      order.delivered_at = new Date().toISOString();
      if (order.payment_method === 'cod') order.payment_status = 'paid';
      this.settleOrderCommissions(order);
    }
    return order;
  },

  async manualRequestDeliveryPartner(orderId: number) {
    if (db.isUsingMysql()) {
      await db.query('UPDATE orders SET is_self_delivery = 0, delivery_mode = "platform_rider", rider_requested = 1, rider_requested_at = NOW(), delivery_partner_id = NULL, rider_accepted = 0 WHERE id = ?', [orderId]);
      const [res]: any = await db.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [orderId]);
      return { assigned: false, message: 'Delivery request broadcasted to delivery partners.', order: res[0] };
    }
    const store = db.getStore();
    const order = store.orders.find((o: any) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    return { assigned: Boolean(order.delivery_partner_id), message: 'Delivery request broadcasted.', order };
  },

  async handoverOrderToRider(orderId: number) {
    if (db.isUsingMysql()) {
      await db.query('UPDATE orders SET is_handed_over = 1, handed_over_at = NOW() WHERE id = ?', [orderId]);
      const [res]: any = await db.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [orderId]);
      return res[0];
    }
    const store = db.getStore();
    const order = store.orders.find((o: any) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    order.is_handed_over = 1;
    return order;
  },

  settleOrderCommissions(order: any) {
    // Handled in updateOrderStatus or escrow settlement
  },

  async settleOrderEscrow(orderId: number, adminId?: number, note?: string) {
    if (db.isUsingMysql()) {
      const pool = db.getPool();
      if (!pool) throw new Error('MySQL pool not initialized');
      const conn = await pool.getConnection();
      await conn.beginTransaction();
      try {
        const [orders]: any = await conn.execute('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
        if (!orders[0]) {
          throw new Error('Order not found');
        }
        const order = orders[0];
        if (order.escrow_status === 'settled') {
          await conn.commit();
          conn.release();
          return order;
        }

        // Credit restaurant wallet if net_restaurant_amount > 0
        const [rests]: any = await conn.execute('SELECT user_id, name FROM restaurants WHERE id = ? LIMIT 1', [order.restaurant_id]);
        const rest = rests[0];
        if (rest && rest.user_id && Number(order.net_restaurant_amount) > 0) {
          await paymentService.creditWallet(
            rest.user_id,
            'restaurant',
            Number(order.net_restaurant_amount),
            'order_payout',
            order.id,
            `Escrow payout released for order #${order.order_number}`,
            conn // Passed connection
          );
        }

        await conn.execute(
          'UPDATE orders SET escrow_status = "settled", settled_at = NOW(), settlement_note = ? WHERE id = ?',
          [note || 'Direct payout settled by Admin', orderId]
        );

        const [updated]: any = await conn.execute('SELECT * FROM orders WHERE id = ? LIMIT 1', [orderId]);
        await conn.commit();
        conn.release();
        return updated[0];
      } catch (err) {
        await conn.rollback();
        conn.release();
        throw err;
      }
    }
    const store = db.getStore();
    const order = store.orders.find((o: any) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    order.escrow_status = 'settled';
    order.settled_at = new Date().toISOString();
    order.settlement_note = note || 'Direct payout settled by Admin';
    return order;
  },

  async refundOrderPayment(orderId: number, adminId?: number, reason?: string, refundAmount?: number, options?: any) {
    if (db.isUsingMysql()) {
      const pool = db.getPool();
      if (!pool) throw new Error('MySQL pool not initialized');
      const conn = await pool.getConnection();
      await conn.beginTransaction();
      try {
        const [orders]: any = await conn.execute('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
        if (!orders[0]) {
          throw new Error('Order not found');
        }
        const order = orders[0];
        const grandTotal = Number(order.grand_total);
        let calcRefundAmount = grandTotal;

        if (refundAmount !== undefined && refundAmount !== null && Number(refundAmount) > 0) {
          calcRefundAmount = Math.min(grandTotal, Number(refundAmount));
        } else if (options?.refundPercentage !== undefined && options.refundPercentage !== null) {
          calcRefundAmount = Math.round((grandTotal * Number(options.refundPercentage)) / 100);
        }

        const refundPct = grandTotal > 0 ? Math.round((calcRefundAmount / grandTotal) * 100) : 100;
        let newNetRestAmount = Number(order.net_restaurant_amount);

        if (options?.withholdRestaurantPct !== undefined) {
          const withholdPct = Number(options.withholdRestaurantPct);
          newNetRestAmount = Math.round((Number(order.subtotal) * (withholdPct / 100)) * 100) / 100;
        } else if (refundPct >= 100) {
          newNetRestAmount = 0;
        }

        // Credit customer wallet with refund amount if customer exists
        if (order.customer_id && calcRefundAmount > 0) {
          await paymentService.creditWallet(
            order.customer_id,
            'customer',
            calcRefundAmount,
            'order_refund',
            order.id,
            `Refund processed for order #${order.order_number}: ${reason || 'Admin refund'}`,
            conn // Passed connection
          );
        }

        await conn.execute(
          `UPDATE orders SET
            escrow_status = 'refunded',
            payment_status = 'refunded',
            refund_amount = ?,
            refund_reason = ?,
            refunded_at = NOW(),
            net_restaurant_amount = ?
           WHERE id = ?`,
          [calcRefundAmount, reason || 'Refund processed', newNetRestAmount, orderId]
        );

        const [updated]: any = await conn.execute('SELECT * FROM orders WHERE id = ? LIMIT 1', [orderId]);
        await conn.commit();
        conn.release();
        return updated[0];
      } catch (err) {
        await conn.rollback();
        conn.release();
        throw err;
      }
    }
    const store = db.getStore();
    const order = store.orders.find((o: any) => o.id === orderId);
    if (!order) throw new Error('Order not found');

    const grandTotal = Number(order.grand_total || 0);
    let calcRefundAmount = grandTotal;
    if (refundAmount !== undefined && refundAmount !== null && Number(refundAmount) > 0) {
      calcRefundAmount = Math.min(grandTotal, Number(refundAmount));
    } else if (options?.refundPercentage !== undefined && options.refundPercentage !== null) {
      calcRefundAmount = Math.round((grandTotal * Number(options.refundPercentage)) / 100);
    }
    const refundPct = grandTotal > 0 ? Math.round((calcRefundAmount / grandTotal) * 100) : 100;

    order.escrow_status = 'refunded';
    order.payment_status = 'refunded';
    order.refund_amount = calcRefundAmount;
    order.refund_percentage = refundPct;
    order.refund_reason = reason || 'Refund processed';
    order.refunded_at = new Date().toISOString();
    if (refundPct >= 100 && options?.withholdRestaurantPct === undefined) {
      order.net_restaurant_amount = 0;
    }
    return order;
  },

  async disputeOrderPayment(orderId: number, adminId?: number, reason?: string) {
    if (db.isUsingMysql()) {
      await db.query(
        'UPDATE orders SET escrow_status = "disputed", dispute_reason = ? WHERE id = ?',
        [reason || 'Disputed under review', orderId]
      );
      const [res]: any = await db.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [orderId]);
      if (!res[0]) throw new Error('Order not found');
      return res[0];
    }
    const store = db.getStore();
    const order = store.orders.find((o: any) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    order.escrow_status = 'disputed';
    order.dispute_reason = reason || 'Disputed under review';
    return order;
  }
};
