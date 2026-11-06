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
  createOrder(input: CreateOrderInput) {
    const store = db.getStore();
    const isDirectOnly = input.directRestaurantOnly === true; // DEFAULT IS NO/false

    // Strict Service Area Geofence Boundary Check
    const matchedServiceArea = locationService.findServiceAreaForLocation({
      lat: Number(input.deliveryLat),
      lng: Number(input.deliveryLng)
    });

    if (!matchedServiceArea) {
      throw new Error(
        'আপনার এই ডেলিভারি এলাকাটি আমাদের সার্ভিস সীমানার বাইরে (Not Serviceable)। সীমানার ভেতরের কোন স্থান নির্বাচন করুন।'
      );
    }

    // Primary restaurant specified or default to #1
    let primaryRestaurant = store.restaurants.find((r: any) => r.id === input.restaurantId) || store.restaurants[0];

    const customer = store.users.find((u: any) => u.id === input.customerId);

    // Calculate subtotal & validate items (supports items from multiple restaurants!)
    let subtotal = 0;
    const orderItems: any[] = [];
    const involvedRestaurantIds = new Set<number>();

    for (const item of input.items) {
      // Find food item globally across store.foods to support multi-store add-ons
      const food = store.foods.find((f: any) => f.id === item.foodId);
      if (!food) {
        throw new Error(`Item ID ${item.foodId} not found in menu`);
      }
      const avail = food.is_available;
      if (avail === 0 || avail === '0' || avail === false || avail === null || avail === undefined) {
        throw new Error(`"${food.name || 'খাবারটি'}" বর্তমানে আউট অফ স্টক (স্টক শেষ) এবং এটি অর্ডার করা যাবে না।`);
      }

      involvedRestaurantIds.add(food.restaurant_id);

      const itemRestaurant = store.restaurants.find((r: any) => r.id === food.restaurant_id);

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
      // Set primary restaurant to the first involved restaurant
      const firstRestId = Array.from(involvedRestaurantIds)[0];
      const foundRest = store.restaurants.find((r: any) => r.id === firstRestId);
      if (foundRest) primaryRestaurant = foundRest;
    }

    // COD Validation
    if (input.paymentMethod === 'cod') {
      const isGlobalCod = store.settings?.global_cod_enabled === 1 || store.settings?.global_cod_enabled === true;
      const isUserCodAllowed = customer?.cod_enabled === 1 || customer?.cod_enabled === true;
      if (!isGlobalCod && !isUserCodAllowed) {
        throw new Error(
          'Cash on Delivery (COD) is currently disabled. Please select Online Prepaid Payment (UPI / Cards). (ক্যাশ অন ডেলিভারি বর্তমানে বন্ধ আছে। অনলাইন পেমেন্ট করুন।)'
        );
      }
    }

    // Proximity Broadcast Calculation (when directRestaurantOnly is NO / false)
    const openRestaurants = store.restaurants.filter((r: any) => r.is_open === 1 && r.status === 'approved');

    // Calculate distance from Customer's Live GPS location to open restaurants
    const rankedRestaurants = openRestaurants
      .map((r: any) => {
        const dist = locationService.calculateDistanceKm(
          r.latitude,
          r.longitude,
          input.deliveryLat,
          input.deliveryLng
        );
        return { restaurant: r, distanceKm: dist };
      })
      .sort((a: any, b: any) => a.distanceKm - b.distanceKm);

    // Selected target restaurant: Always target primaryRestaurant where the items were ordered from
    const targetRestaurant = primaryRestaurant || (rankedRestaurants.length > 0 ? rankedRestaurants[0].restaurant : store.restaurants[0]);

    const distanceKm = locationService.calculateDistanceKm(
      targetRestaurant.latitude,
      targetRestaurant.longitude,
      input.deliveryLat,
      input.deliveryLng
    );
    const rawDeliveryFee = locationService.calculateDeliveryFee(distanceKm, targetRestaurant.service_area_id);
    let deliveryFee = rawDeliveryFee;
    let deliveryDiscount = 0;

    const promos = store.promotions || {};
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
      const coupon = store.coupons.find((c: any) => c.code.toUpperCase() === input.couponCode?.toUpperCase() && c.is_active);
      if (coupon && subtotal >= coupon.min_order_amount) {
        if (coupon.discount_type === 'percentage') {
          discount = Math.min((subtotal * coupon.discount_value) / 100, coupon.max_discount || 100);
        } else {
          discount = Math.min(coupon.discount_value, subtotal);
        }
      }
    }

    const tax = Math.round((subtotal * 0.05) * 100) / 100; // 5% GST
    const grandTotal = Math.max(0, Math.round(subtotal + deliveryFee - discount + tax));

    const newOrderId = store.orders.length + 1;
    const orderNumber = `ORD-${new Date().getFullYear()}-${8800 + newOrderId}`;

    // Self-delivery check based on restaurant's self_delivery_enabled setting and registered radius
    const isRestSelfDeliveryEnabled = Boolean(targetRestaurant.self_delivery_enabled);
    const selfRadius = Number(targetRestaurant.self_delivery_radius_km || 3);
    const isWithinSelfRadius = distanceKm <= selfRadius;
    const initialSelfDelivery = isRestSelfDeliveryEnabled && isWithinSelfRadius;

    let commRate = targetRestaurant.commission_rate
      ? Number(targetRestaurant.commission_rate)
      : Number(store.settings?.restaurant_commission_percent ?? 15.0);

    // Apply restaurant platform fee promotional discount
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

    // Delivery Partner earnings with platform fee discount and per-order bonus
    let dpCommRate = Number(store.settings?.delivery_partner_commission_percent ?? 10.0);
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
    const minFareGuarantee = Number(store.settings?.min_delivery_fare ?? 20.0);
    const baseRiderPayout = Math.max(
      minFareGuarantee,
      Math.round((rawDeliveryFee * riderShareRatio) * 100) / 100
    );
    const dpEarning = baseRiderPayout + riderBonus;

    // If restaurant does self delivery, they earn food net + full delivery fee.
    // If restaurant does NOT do self delivery, delivery commission & rider fee are deducted, restaurant earns food net only!
    const netRestaurantAmount = initialSelfDelivery ? (netFoodEarning + deliveryFee) : netFoodEarning;

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

    // Notify Restaurant Owner
    notificationService.createNotification({
      userId: targetRestaurant.user_id,
      role: 'restaurant',
      title: `New Order #${orderNumber}`,
      title_bn: `নতুন অর্ডার #${orderNumber}`,
      message: `New order received: ${orderItems.length} items worth ₹${grandTotal}. Please accept now.`,
      message_bn: `নতুন অর্ডার এসেছে: মোট ₹${grandTotal} টাকার ${orderItems.length}টি খাবার। অনুগ্রহ করে কনফার্ম করুন।`,
      type: 'new_order',
      data: { orderId: newOrderId }
    });

    // Notify Customer
    notificationService.createNotification({
      userId: input.customerId,
      role: 'customer',
      title: 'Order Placed Successfully!',
      title_bn: 'আপনার অর্ডার গৃহীত হয়েছে!',
      message: `Order #${orderNumber} sent to ${targetRestaurant.name}. Waiting for confirmation.`,
      message_bn: `আপনার অর্ডার #${orderNumber} ${targetRestaurant.name}-এ পাঠানো হয়েছে। কনফার্মেশন অপেক্ষমান।`,
      type: 'order_status',
      data: { orderId: newOrderId }
    });

    return newOrder;
  },

  updateOrderStatus(orderId: number, newStatus: string, extra?: any, user?: { id: number; role: string }) {
    const store = db.getStore();
    const order = store.orders.find((o: any) => o.id === orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const restaurant = store.restaurants.find((r: any) => r.id === order.restaurant_id);
    const hasSelfDelivery = restaurant?.self_delivery_enabled === 1 || restaurant?.self_delivery_enabled === true;
    const isSelfDeliveryOrder = order.is_self_delivery === 1 || order.delivery_mode === 'self_delivery';

    // Role check: If a restaurant user is updating the status:
    if (user && user.role === 'restaurant') {
      const isOutOrDelivered = ['picked_up', 'on_the_way', 'out_for_delivery', 'delivered'].includes(newStatus);
      if (isOutOrDelivered && (!hasSelfDelivery || !isSelfDeliveryOrder)) {
        throw new Error(
          'আপনার রেস্তোরাঁ রেজিস্ট্রেশনের সময় Self Delivery No থাকায় আউট ফর ডেলিভারি ও ডেলিভারি সম্পন্ন করার দায়িত্ব প্ল্যাটফর্ম ডেলিভারি পার্টনারের (Rider)। রেস্তোরাঁ শুধুমাত্র খাবার প্রস্তুত (Ready for Pickup) করতে পারবে।'
        );
      }
    }

    order.status = newStatus;
    if (extra?.preparation_minutes) {
      order.preparation_minutes = extra.preparation_minutes;
      order.estimated_delivery_time = `${extra.preparation_minutes + 15} mins`;
    }

    // Workflow actions
    if (newStatus === 'accepted') {
      order.accepted_at = new Date().toISOString();
      this.dispatchOrderToDeliveryPartners(order);
    } else if (newStatus === 'ready') {
      order.ready_at = new Date().toISOString();
      if (order.delivery_partner_id) {
        const dp = store.delivery_partners.find((d: any) => d.id === order.delivery_partner_id);
        if (dp) {
          notificationService.createNotification({
            userId: dp.user_id,
            role: 'delivery',
            title: `🍲 Food Ready for Pickup: #${order.order_number}`,
            title_bn: `🍲 খাবার তৈরি ও প্যাকড: #${order.order_number}`,
            message: `${order.restaurant_name} has prepared and packed Order #${order.order_number}. Please pick up from counter!`,
            message_bn: `${order.restaurant_name} অর্ডার #${order.order_number}-এর খাবার তৈরি ও প্যাক সম্পন্ন করেছে। কাউন্টার থেকে সংগ্রহ করুন!`,
            type: 'order_status',
            data: { orderId: order.id, status: 'ready' }
          });
        }
      }
    } else if (newStatus === 'picked_up' || newStatus === 'on_the_way' || newStatus === 'out_for_delivery') {
      order.picked_up_at = order.picked_up_at || new Date().toISOString();
      order.status = 'on_the_way';
      if (typeof extra?.is_self_delivery !== 'undefined') {
        order.is_self_delivery = extra.is_self_delivery ? 1 : 0;
        order.delivery_mode = extra.is_self_delivery ? 'self_delivery' : (extra.delivery_mode || 'platform_rider');
      }
    } else if (newStatus === 'delivered') {
      order.delivered_at = new Date().toISOString();
      if (order.payment_method === 'cod') {
        order.payment_status = 'paid';
      }
      this.settleOrderCommissions(order);
    } else if (newStatus === 'cancelled') {
      order.cancelled_at = new Date().toISOString();
      order.cancellation_reason = extra?.reason || 'Cancelled by restaurant/user';
    }

    // Send notifications to customer
    notificationService.createNotification({
      userId: order.customer_id,
      role: 'customer',
      title: `Order #${order.order_number}: ${newStatus.toUpperCase()}`,
      title_bn: `অর্ডার স্ট্যাটাস আপডেট: ${newStatus}`,
      message: `Your order status changed to ${newStatus}.`,
      message_bn: `আপনার অর্ডার #${order.order_number} এখন "${newStatus}" পর্যায়ে আছে।`,
      type: 'order_status',
      data: { orderId: order.id, status: newStatus }
    });

    return order;
  },

  // Auto-dispatch order alert to available delivery partners or handle restaurant self-delivery
  dispatchOrderToDeliveryPartners(order: any) {
    const store = db.getStore();
    const restaurant = store.restaurants.find((r: any) => r.id === order.restaurant_id);

    const isSelfDeliveryEnabled = restaurant?.self_delivery_enabled === 1 || restaurant?.self_delivery_enabled === true;
    const maxRadiusKm = Number(restaurant?.self_delivery_radius_km || 3);
    const orderDistance = Number(order.distance_km || 0);

    // If restaurant has self-delivery enabled AND order distance is within radius (<= 3km, 5km, or 10km)
    if (isSelfDeliveryEnabled && orderDistance <= maxRadiusKm) {
      order.is_self_delivery = 1;
      order.delivery_mode = 'self_delivery';

      notificationService.createNotification({
        userId: restaurant?.user_id,
        role: 'restaurant',
        title: `Self-Delivery Order #${order.order_number}`,
        title_bn: `নিজস্ব ডেলিভারি অর্ডার #${order.order_number}`,
        message: `This order is within your ${maxRadiusKm} KM self-delivery radius (${orderDistance.toFixed(1)} KM). Please deliver using your restaurant's staff.`,
        message_bn: `অর্ডারটি আপনার নির্ধারিত ${maxRadiusKm} কিমি ব্যাসার্ধের মধ্যে (${orderDistance.toFixed(1)} কিমি)। আপনার নিজস্ব লোক দিয়ে ডেলিভারি সম্পন্ন করুন।`,
        type: 'new_order',
        data: { orderId: order.id }
      });
      return;
    }

    // Outside radius OR self-delivery disabled -> Route to platform delivery partner (Rider)
    order.is_self_delivery = 0;
    order.delivery_mode = 'platform_rider';
    order.rider_requested = 1;
    order.rider_requested_at = order.rider_requested_at || new Date().toISOString();

    // Alert all approved delivery partners (online and offline) to accept the ride
    const allPartners = store.delivery_partners.filter(
      (p: any) => p.status === 'approved'
    );

    for (const partner of allPartners) {
      notificationService.createNotification({
        userId: partner.user_id,
        role: 'delivery',
        title: 'New Delivery Job Available!',
        title_bn: 'নতুন ডেলিভারি অনুরোধ!',
        message: `Pickup from ${order.restaurant_name} and deliver to ${order.delivery_address}. Earning: ₹${order.delivery_fee}`,
        message_bn: `${order.restaurant_name} থেকে খাবার তুলে ডেলিভারি দিন। আয়: ₹${order.delivery_fee}`,
        type: 'assignment',
        data: { orderId: order.id }
      });
    }
  },

  // Manual request by restaurant to alert delivery partners (both online and offline)
  manualRequestDeliveryPartner(orderId: number) {
    const store = db.getStore();
    const order = store.orders.find((o: any) => o.id === orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Force delivery_mode to platform_rider and reset assignment for immediate pool pickup
    order.is_self_delivery = 0;
    order.delivery_mode = 'platform_rider';
    order.rider_requested = 1;
    order.rider_requested_at = new Date().toISOString();
    order.delivery_partner_id = null;
    order.delivery_partner_name = null;
    order.delivery_partner_phone = null;
    order.rider_accepted = 0;

    const targetRestaurant = store.restaurants.find((r: any) => r.id === order.restaurant_id);
    const commRate = targetRestaurant?.commission_rate
      ? Number(targetRestaurant.commission_rate)
      : Number(store.settings?.restaurant_commission_percent ?? 15.0);
    const subtotal = Number(order.subtotal || 0);
    const platformRestFee = Math.round((subtotal * (commRate / 100)) * 100) / 100;
    order.net_restaurant_amount = Math.round((subtotal - platformRestFee) * 100) / 100;

    // Alert online delivery partners with priority, and notify all approved partners
    const onlinePartners = store.delivery_partners.filter(
      (p: any) => p.status === 'approved' && p.is_online === 1
    );
    const offlinePartners = store.delivery_partners.filter(
      (p: any) => p.status === 'approved' && !p.is_online
    );

    for (const partner of onlinePartners) {
      notificationService.createNotification({
        userId: partner.user_id,
        role: 'delivery',
        title: `🚨 Delivery Request: ${order.restaurant_name}`,
        title_bn: `🚨 নতুন ডেলিভারি অ্যালার্ট: ${order.restaurant_name}`,
        message: `${order.restaurant_name} has requested a rider for Order #${order.order_number}. You are ONLINE! Open app to receive & accept! Payout: ₹${order.delivery_fee}`,
        message_bn: `${order.restaurant_name} অর্ডার #${order.order_number} এর জন্য রিকোয়েস্ট পাঠিয়েছেন। আপনি অনলাইনে আছেন — এখনই অর্ডার রিসিভ করুন। আয়: ₹${order.delivery_fee}`,
        type: 'assignment',
        data: { orderId: order.id }
      });
    }

    for (const partner of offlinePartners) {
      notificationService.createNotification({
        userId: partner.user_id,
        role: 'delivery',
        title: `🚨 Delivery Request: ${order.restaurant_name}`,
        title_bn: `🚨 নতুন ডেলিভারি অ্যালার্ট: ${order.restaurant_name}`,
        message: `${order.restaurant_name} has requested a rider for Order #${order.order_number}. Turn ONLINE to receive this order! Payout: ₹${order.delivery_fee}`,
        message_bn: `${order.restaurant_name} অর্ডার #${order.order_number} এর জন্য রিকোয়েস্ট পাঠিয়েছেন। অর্ডার রিসিভ করার জন্য অনলাইনে আসুন। আয়: ₹${order.delivery_fee}`,
        type: 'assignment',
        data: { orderId: order.id }
      });
    }

    return {
      assigned: Boolean(order.delivery_partner_id),
      message: `Delivery request broadcasted to delivery partners! Online partners receive the order to accept. (অনলাইন রাইডারদের কাছে রিকোয়েস্ট পাঠানো হয়েছে, যে অনলাইন থাকবে সে অর্ডার রিসিভ করবে।)`,
      order
    };
  },

  // Restaurant: Handover food package to the arrived rider
  handoverOrderToRider(orderId: number) {
    const store = db.getStore();
    const order = store.orders.find((o: any) => o.id === orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.delivery_partner_id) {
      throw new Error('No delivery partner has accepted this order yet (কোনো রাইডার এখনো এই অর্ডার গ্রহণ করেনি)');
    }

    order.is_handed_over = 1;
    order.handed_over_at = new Date().toISOString();

    const dp = store.delivery_partners.find((d: any) => d.id === order.delivery_partner_id);
    if (dp) {
      notificationService.createNotification({
        userId: dp.user_id,
        role: 'delivery',
        title: `Food Handed Over by ${order.restaurant_name}!`,
        title_bn: `${order.restaurant_name} খাবার বুঝিয়ে দিয়েছে!`,
        message: `Order #${order.order_number} package handed over to you. Please select "On The Way" to start customer delivery trip.`,
        message_bn: `অর্ডার #${order.order_number} এর খাবার আপনাকে বুঝিয়ে দেওয়া হয়েছে। 'On The Way' নির্বাচন করে গ্রাহকের উদ্দেশ্যে রওনা হন।`,
        type: 'order_status',
        data: { orderId: order.id }
      });
    }

    return order;
  },

  // Settle commission and initiate 24-hour Admin Escrow Holding
  settleOrderCommissions(order: any) {
    try {
      const store = db.getStore();
      const settings = store.settings || {};
      const restaurant = store.restaurants.find((r: any) => r.id === order.restaurant_id);

      // Restaurant Commission % (from restaurant record or global setting)
      const commRate = restaurant?.commission_rate
        ? Number(restaurant.commission_rate)
        : Number(settings.restaurant_commission_percent ?? 15.0);

      const subtotal = Number(order.subtotal || 0);
      const deliveryFee = Number(order.delivery_fee || 0);

      const platformRestFee = Math.round((subtotal * (commRate / 100)) * 100) / 100;
      const netRestaurantEarning = Math.round((subtotal - platformRestFee) * 100) / 100;

      // Delivery Partner Platform Commission %
      const dpCommRate = Number(settings.delivery_partner_commission_percent ?? 10.0);
      const riderShareRatio = Math.max(0, (100 - dpCommRate) / 100);
      const minFareGuarantee = Number(settings.min_delivery_fare ?? 20.0);

      // Rider earns their share of delivery fee, respecting minimum guarantee
      const dpEarning = Math.max(
        minFareGuarantee,
        Math.round((deliveryFee * riderShareRatio) * 100) / 100
      );
      const platformDpFee = Math.max(0, Math.round((deliveryFee - dpEarning) * 100) / 100);

      const isSelfDeliv = order.is_self_delivery === 1 || order.is_self_delivery === true || order.delivery_mode === 'self_delivery';
      if (isSelfDeliv) {
        order.net_restaurant_amount = netRestaurantEarning + deliveryFee;
        order.delivery_partner_earning = 0;
        order.platform_commission = platformRestFee;
      } else {
        order.net_restaurant_amount = netRestaurantEarning;
        order.delivery_partner_earning = dpEarning;
        order.platform_commission = platformRestFee + platformDpFee;
      }

      order.restaurant_commission_rate = commRate;
      order.delivery_partner_commission_rate = dpCommRate;
      order.escrow_status = 'holding';
      // 24-hour holding window: Funds stay in Admin escrow for 24 hours
      order.holding_until = new Date(Date.now() + 24 * 3600000).toISOString();

      // Credit delivery partner wallet immediately for their effort
      if (order.delivery_partner_id && store.delivery_partners) {
        const dp = store.delivery_partners.find((p: any) => p.id === order.delivery_partner_id);
        if (dp) {
          dp.total_deliveries = (dp.total_deliveries || 0) + 1;
          dp.active_order_id = null;
          if (store.wallets) {
            const dpWallet = store.wallets.find((w: any) => w.user_id === dp.user_id);
            if (dpWallet) {
              dpWallet.balance = Number(dpWallet.balance || 0) + dpEarning;
              dpWallet.total_earned = Number(dpWallet.total_earned || 0) + dpEarning;
            }
          }
        }
      }

      // Notify Restaurant that funds are securely held by Admin for 24 hours
      if (restaurant) {
        notificationService.createNotification({
          userId: restaurant.user_id,
          role: 'restaurant',
          title: `Order #${order.order_number} Delivered • Funds in 24h Escrow`,
          title_bn: `অর্ডার #${order.order_number} সম্পন্ন • ২৪ ঘন্টা অ্যাডমিন সুরক্ষায় হোল্ড আছে`,
          message: isSelfDeliv
            ? `₹${order.net_restaurant_amount} (including ₹${deliveryFee} self-delivery fee) is held in 24h Admin escrow security.`
            : `₹${order.net_restaurant_amount} (excluding ₹${deliveryFee} delivery commission/rider fee) is held in 24h Admin escrow security.`,
          message_bn: isSelfDeliv
            ? `আপনার ₹${order.net_restaurant_amount} টাকা (নিজস্ব ডেলিভারি ফি ₹${deliveryFee} সহ) ২৪ ঘন্টা অ্যাডমিন সুরক্ষায় হোল্ড আছে।`
            : `আপনার ₹${order.net_restaurant_amount} টাকা (ডেলিভারি কমিশন ও রাইডার ফি ₹${deliveryFee} বাদ দিয়ে বাকি খাদ্য মূল্য) ২৪ ঘন্টা অ্যাডমিন সুরক্ষায় হোল্ড আছে।`,
          type: 'order_status',
          data: { orderId: order.id, escrowStatus: 'holding' }
        });
      }
    } catch (err) {
      console.error('Error settling commissions on delivery:', err);
    }
  },

  // Admin Manual / Matured Settlement: Direct Bank/UPI Payouts
  settleOrderEscrow(orderId: number, adminId?: number, note?: string) {
    const store = db.getStore();
    const order = store.orders.find((o: any) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    if (order.escrow_status === 'settled') throw new Error('Order payment is already settled');

    const restaurant = store.restaurants.find((r: any) => r.id === order.restaurant_id);
    const netAmount = Number(order.net_restaurant_amount || Math.round(order.subtotal * 0.85));
    const dpEarning = Number(order.delivery_partner_earning || 0);
    const platformComm = Number(order.platform_commission || Math.round(order.subtotal * 0.15));

    const restTarget = restaurant
      ? (restaurant.payment_method === 'bank'
          ? `Bank: ${restaurant.bank_name || 'HDFC Bank'} (A/C: ${restaurant.bank_account_no || '501004829104'})`
          : `UPI: ${restaurant.upi_id || `${restaurant.name?.toLowerCase().replace(/\s+/g, '')}@okaxis`}`)
      : 'Default Restaurant Account';

    let dpTarget = 'N/A';
    const dp = order.delivery_partner_id ? store.delivery_partners?.find((p: any) => p.id === order.delivery_partner_id) : null;
    if (dp) {
      dpTarget = dp.payment_method === 'bank'
        ? `Bank: ${dp.bank_name || 'State Bank of India'} (A/C: ${dp.bank_account_no || '30492810492'})`
        : `UPI: ${dp.upi_id || `${dp.phone}@upi`}`;
      order.is_dp_settled = 1;
    }

    // 1. Accumulate Admin Platform Earnings Ledger
    if (!store.platform_earnings) store.platform_earnings = 0;
    store.platform_earnings = Number(store.platform_earnings) + platformComm;

    // 2. Direct Payout Ledger Record
    const settlementRecord = {
      order_id: order.id,
      order_number: order.order_number,
      customer_paid: Number(order.grand_total || 0),
      customer_target: 'Admin Platform Account',
      restaurant_payout: netAmount,
      restaurant_target: restTarget,
      rider_payout: dpEarning,
      rider_target: dpTarget,
      platform_fee: platformComm,
      platform_target: 'Admin Platform Payment Account',
      settled_at: new Date().toISOString(),
      note: note || 'Direct payout settled by Admin'
    };

    if (!store.direct_settlement_ledger) store.direct_settlement_ledger = [];
    store.direct_settlement_ledger.unshift(settlementRecord);

    order.escrow_status = 'settled';
    order.settled_at = new Date().toISOString();
    order.settlement_record = settlementRecord;
    order.settlement_note = note || 'Direct Payout Transferred via Admin Portal';

    // Notify restaurant of direct transfer
    if (restaurant) {
      notificationService.createNotification({
        userId: restaurant.user_id,
        role: 'restaurant',
        title: `₹${netAmount} Direct Payment Settled!`,
        title_bn: `₹${netAmount} সরাসরি পেমেন্ট সেটেলমেন্ট সম্পন্ন!`,
        message: `Admin has directly transferred ₹${netAmount} payout for order #${order.order_number} to your ${restTarget}.`,
        message_bn: `অর্ডার #${order.order_number}-এর নিট পাওনা ₹${netAmount} টাকা সরাসরি আপনার ${restTarget}-এ ট্রান্সফার করা হয়েছে।`,
        type: 'order_status',
        data: { orderId: order.id, amount: netAmount, target: restTarget }
      });
    }

    // Notify rider of direct transfer
    if (dp) {
      notificationService.createNotification({
        userId: dp.user_id,
        role: 'delivery',
        title: `₹${dpEarning} Direct Payout Settled!`,
        title_bn: `₹${dpEarning} সরাসরি ডেলিভারি টাকা ট্রান্সফার সম্পন্ন!`,
        message: `Admin has directly transferred delivery payout of ₹${dpEarning} for order #${order.order_number} to your ${dpTarget}.`,
        message_bn: `অর্ডার #${order.order_number}-এর ডেলিভারি পাওনা ₹${dpEarning} টাকা সরাসরি আপনার ${dpTarget}-এ ট্রান্সফার করা হয়েছে।`,
        type: 'order_status',
        data: { orderId: order.id, amount: dpEarning, target: dpTarget }
      });
    }

    return order;
  },

  // Admin Refund to Customer with Direct Bank/UPI Payout Options
  refundOrderPayment(
    orderId: number,
    adminId?: number,
    reason?: string,
    refundAmount?: number,
    options?: {
      refundPercentage?: number;
      withholdRestaurantPct?: number; // e.g. 50% deduction
      withholdDeliveryPct?: number;   // e.g. 50% deduction
    }
  ) {
    const store = db.getStore();
    const order = store.orders.find((o: any) => o.id === orderId);
    if (!order) throw new Error('Order not found');

    const totalOrderAmount = Number(order.grand_total || 0);
    const refundPct = options?.refundPercentage !== undefined ? options.refundPercentage : (refundAmount ? (refundAmount / totalOrderAmount) * 100 : 100);
    const amount = refundAmount ? Number(refundAmount) : Math.round(totalOrderAmount * (refundPct / 100));

    const withholdRestPct = options?.withholdRestaurantPct !== undefined ? options.withholdRestaurantPct : refundPct;
    const withholdDpPct = options?.withholdDeliveryPct !== undefined ? options.withholdDeliveryPct : refundPct;

    const origRestNet = Number(order.net_restaurant_amount || Math.round(order.subtotal * 0.85));
    const origDpNet = Number(order.delivery_partner_earning || 0);
    const platformComm = Number(order.platform_commission || Math.round(order.subtotal * 0.15));

    // Calculate adjusted direct payouts
    const adjustedRestNet = Math.max(0, Math.round(origRestNet * ((100 - withholdRestPct) / 100)));
    const adjustedDpNet = Math.max(0, Math.round(origDpNet * ((100 - withholdDpPct) / 100)));

    order.escrow_status = 'settled';
    order.payment_status = refundPct >= 100 ? 'refunded' : 'partially_refunded';
    order.refund_amount = amount;
    order.refund_percentage = Math.round(refundPct);
    order.refund_reason = reason || 'Customer dispute resolved by Admin';
    order.refunded_at = new Date().toISOString();

    order.net_restaurant_amount = adjustedRestNet;
    order.delivery_partner_earning = adjustedDpNet;
    // Platform fee stays 100% intact ("ar platform er fees er kono change hobe na")
    order.platform_commission = platformComm;

    const restaurant = store.restaurants.find((r: any) => r.id === order.restaurant_id);
    const restTarget = restaurant
      ? (restaurant.payment_method === 'bank'
          ? `Bank: ${restaurant.bank_name || 'HDFC Bank'} (A/C: ${restaurant.bank_account_no || '501004829104'})`
          : `UPI: ${restaurant.upi_id || `${restaurant.name?.toLowerCase().replace(/\s+/g, '')}@okaxis`}`)
      : 'Default Restaurant Account';

    let dpTarget = 'N/A';
    const dp = order.delivery_partner_id ? store.delivery_partners?.find((p: any) => p.id === order.delivery_partner_id) : null;
    if (dp) {
      dpTarget = dp.payment_method === 'bank'
        ? `Bank: ${dp.bank_name || 'State Bank of India'} (A/C: ${dp.bank_account_no || '30492810492'})`
        : `UPI: ${dp.upi_id || `${dp.phone}@upi`}`;
      order.is_dp_settled = 1;
    }

    // Platform earnings ledger
    if (!store.platform_earnings) store.platform_earnings = 0;
    store.platform_earnings = Number(store.platform_earnings) + platformComm;

    // Direct Payout Ledger Record
    const settlementRecord = {
      order_id: order.id,
      order_number: order.order_number,
      customer_paid: totalOrderAmount,
      customer_refunded: amount,
      customer_refund_percentage: Math.round(refundPct),
      customer_target: 'Customer Original Payment Method',
      restaurant_payout: adjustedRestNet,
      restaurant_target: restTarget,
      rider_payout: adjustedDpNet,
      rider_target: dpTarget,
      platform_fee: platformComm,
      platform_target: 'Admin Platform Payment Account',
      settled_at: new Date().toISOString(),
      note: reason || 'Partial refund & direct payout settlement'
    };

    if (!store.direct_settlement_ledger) store.direct_settlement_ledger = [];
    store.direct_settlement_ledger.unshift(settlementRecord);

    order.settlement_record = settlementRecord;

    // Notify Customer
    notificationService.createNotification({
      userId: order.customer_id,
      role: 'customer',
      title: `₹${amount} (${Math.round(refundPct)}%) Refund Processed!`,
      title_bn: `₹${amount} (${Math.round(refundPct)}%) টাকা রিফান্ড ট্রান্সফার সম্পন্ন!`,
      message: `Admin has directly refunded ₹${amount} (${Math.round(refundPct)}%) for order #${order.order_number}. Reason: ${order.refund_reason}`,
      message_bn: `অর্ডার #${order.order_number}-এর জন্য ₹${amount} (${Math.round(refundPct)}%) টাকা আপনার পেমেন্ট অ্যাকাউন্টে রিফান্ড করা হয়েছে। কারণ: ${order.refund_reason}`,
      type: 'admin_alert',
      data: { orderId: order.id, amount, percentage: Math.round(refundPct) }
    });

    // Notify Restaurant
    if (restaurant) {
      notificationService.createNotification({
        userId: restaurant.user_id,
        role: 'restaurant',
        title: `Order #${order.order_number} Direct Settlement • Net Payout ₹${adjustedRestNet}`,
        title_bn: `অর্ডার #${order.order_number} সরাসরি সেটেলমেন্ট • ব্যাংক/ইউপিআই পাওনা ₹${adjustedRestNet}`,
        message: `Customer received ${Math.round(refundPct)}% refund. Your adjusted net payout of ₹${adjustedRestNet} directly transferred to ${restTarget}.`,
        message_bn: `গ্রাহকের আংশিক রিফান্ডের পর আপনার নিট পাওনা ₹${adjustedRestNet} টাকা সরাসরি আপনার ${restTarget}-এ ট্রান্সফার করা হয়েছে।`,
        type: 'admin_alert',
        data: { orderId: order.id, adjustedPayout: adjustedRestNet, target: restTarget }
      });
    }

    // Notify Delivery Partner
    if (dp) {
      notificationService.createNotification({
        userId: dp.user_id,
        role: 'delivery',
        title: `Order #${order.order_number} Delivery Fee Settled to ₹${adjustedDpNet}`,
        title_bn: `অর্ডার #${order.order_number} ডেলিভারি পাওনা ₹${adjustedDpNet} সরাসরি ট্রান্সফার`,
        message: `Customer received partial refund. Your delivery payout of ₹${adjustedDpNet} directly transferred to ${dpTarget}.`,
        message_bn: `গ্রাহকের আংশিক রিফান্ডের পর আপনার ডেলিভারি পাওনা ₹${adjustedDpNet} টাকা সরাসরি আপনার ${dpTarget}-এ ট্রান্সফার করা হয়েছে।`,
        type: 'admin_alert',
        data: { orderId: order.id, adjustedPayout: adjustedDpNet, target: dpTarget }
      });
    }

    return order;
  },

  // Admin Flag / Dispute Order
  disputeOrderPayment(orderId: number, adminId?: number, reason?: string) {
    const store = db.getStore();
    const order = store.orders.find((o: any) => o.id === orderId);
    if (!order) throw new Error('Order not found');

    order.escrow_status = 'disputed';
    order.dispute_reason = reason || 'Payment locked pending investigation';

    return order;
  }
};
