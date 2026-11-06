import { Router, Request, Response } from 'express';
import { db } from '../db';

export const couponRouter = Router();

// Public: Get active coupons (platform coupons + optional restaurant coupons)
couponRouter.get('/', (req: Request, res: Response) => {
  const store = db.getStore();
  if (!store.coupons) store.coupons = [];
  if (!store.restaurant_promocodes) store.restaurant_promocodes = [];

  const restaurantId = req.query.restaurant_id ? Number(req.query.restaurant_id) : null;
  const platformCoupons = store.coupons.filter((c: any) => c.is_active !== 0);

  let restaurantCoupons: any[] = [];
  if (restaurantId) {
    const rest = store.restaurants?.find((r: any) => r.id === restaurantId);
    if (rest && rest.promocodes) {
      restaurantCoupons = rest.promocodes.filter((p: any) => p.is_active !== 0);
    } else {
      restaurantCoupons = store.restaurant_promocodes.filter((p: any) => p.restaurant_id === restaurantId && p.is_active !== 0);
    }
  }

  return res.json({
    success: true,
    data: {
      platformCoupons,
      restaurantCoupons,
      allActiveCoupons: [...platformCoupons, ...restaurantCoupons]
    }
  });
});

// Validate & apply coupon (supports both Platform Promocodes & Restaurant Promocodes)
couponRouter.post('/apply', (req: Request, res: Response) => {
  const { code, subtotal, restaurant_id } = req.body;
  if (!code || typeof subtotal === 'undefined') {
    return res.status(400).json({ success: false, message: 'Coupon code and subtotal required' });
  }

  const store = db.getStore();
  if (!store.coupons) store.coupons = [];
  if (!store.restaurant_promocodes) store.restaurant_promocodes = [];

  const searchCode = String(code).trim().toUpperCase();

  // 1. Search in Platform Customer Coupons
  let coupon = store.coupons.find(
    (c: any) => String(c.code).trim().toUpperCase() === searchCode && (c.is_active === 1 || c.is_active === true || typeof c.is_active === 'undefined')
  );

  let isRestaurantCoupon = false;
  let restName = '';

  // 2. If not platform coupon, search in Restaurant Promocodes
  if (!coupon && restaurant_id) {
    const restIdNum = Number(restaurant_id);
    const rest = store.restaurants?.find((r: any) => r.id === restIdNum);
    restName = rest ? rest.name : '';

    if (rest && rest.promocodes && Array.isArray(rest.promocodes)) {
      const restPromo = rest.promocodes.find((p: any) => String(p.code).trim().toUpperCase() === searchCode && p.is_active !== 0);
      if (restPromo) {
        coupon = {
          code: restPromo.code,
          discount_type: 'percentage',
          discount_value: Number(restPromo.discount_percentage || restPromo.discount_value || 10),
          max_discount: Number(restPromo.max_discount || 100),
          min_order_amount: Number(restPromo.min_order_amount || 0),
          description: `${rest.name} Special Promocode (${restPromo.discount_percentage}% OFF)`,
          description_bn: `${rest.name_bn || rest.name} স্পেশাল প্রোমোকোড (${restPromo.discount_percentage}% ছাড়)`
        };
        isRestaurantCoupon = true;
      }
    }

    if (!coupon) {
      const globalRestPromo = store.restaurant_promocodes.find(
        (p: any) => p.restaurant_id === restIdNum && String(p.code).trim().toUpperCase() === searchCode && p.is_active !== 0
      );
      if (globalRestPromo) {
        coupon = {
          code: globalRestPromo.code,
          discount_type: 'percentage',
          discount_value: Number(globalRestPromo.discount_percentage || 10),
          max_discount: Number(globalRestPromo.max_discount || 100),
          min_order_amount: Number(globalRestPromo.min_order_amount || 0),
          description: `Restaurant Promocode (${globalRestPromo.discount_percentage}% OFF)`,
          description_bn: `রেস্তোরাঁর প্রোমোকোড (${globalRestPromo.discount_percentage}% ছাড়)`
        };
        isRestaurantCoupon = true;
      }
    }
  }

  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Invalid or expired coupon code (কুপন কোডটি সঠিক নয় বা মেয়াদ শেষ)' });
  }

  if (Number(subtotal) < Number(coupon.min_order_amount || 0)) {
    return res.status(400).json({
      success: false,
      message: `Minimum food subtotal of ₹${coupon.min_order_amount} required to apply this coupon`
    });
  }

  let discount = 0;
  if (coupon.discount_type === 'percentage') {
    discount = Math.round((Number(subtotal) * Number(coupon.discount_value)) / 100);
    if (coupon.max_discount) {
      discount = Math.min(discount, Number(coupon.max_discount));
    }
  } else {
    discount = Math.min(Number(coupon.discount_value), Number(subtotal));
  }

  return res.json({
    success: true,
    message: isRestaurantCoupon
      ? `🎉 ${coupon.code} Applied! You saved ₹${discount} from ${restName || 'Restaurant'} offer!`
      : `🎉 Coupon ${coupon.code} Applied! You saved ₹${discount}`,
    data: {
      code: coupon.code,
      discount,
      discount_type: coupon.discount_type,
      description: coupon.description,
      description_bn: coupon.description_bn,
      is_restaurant_coupon: isRestaurantCoupon
    }
  });
});

// ADMIN: Create new platform customer promocode
couponRouter.post('/admin', (req: Request, res: Response) => {
  const store = db.getStore();
  if (!store.coupons) store.coupons = [];

  const { code, discount_type, discount_value, max_discount, min_order_amount, description, description_bn } = req.body;

  if (!code || !code.trim()) {
    return res.status(400).json({ success: false, message: 'Promocode text is required' });
  }

  const cleanCode = code.trim().toUpperCase();
  const existing = store.coupons.find((c: any) => c.code.toUpperCase() === cleanCode);
  if (existing) {
    return res.status(400).json({ success: false, message: `Promocode "${cleanCode}" already exists` });
  }

  const newId = store.coupons.length > 0 ? Math.max(...store.coupons.map((c: any) => c.id || 0)) + 1 : 1;
  const newCoupon = {
    id: newId,
    code: cleanCode,
    discount_type: discount_type || 'percentage',
    discount_value: Number(discount_value) || 10,
    max_discount: Number(max_discount) || 100,
    min_order_amount: Number(min_order_amount) || 100,
    description: description || `${cleanCode} - Platform Special Offer`,
    description_bn: description_bn || `${cleanCode} - প্ল্যাটফর্ম বিশেষ কুপন ছাড়`,
    is_active: 1,
    created_at: new Date().toISOString()
  };

  store.coupons.push(newCoupon);

  return res.status(201).json({
    success: true,
    message: `Customer Promocode "${cleanCode}" created successfully!`,
    data: newCoupon
  });
});

// ADMIN: Toggle active/inactive platform promocode
couponRouter.put('/admin/:id/toggle', (req: Request, res: Response) => {
  const store = db.getStore();
  if (!store.coupons) store.coupons = [];

  const id = Number(req.params.id);
  const coupon = store.coupons.find((c: any) => c.id === id);

  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Promocode not found' });
  }

  coupon.is_active = coupon.is_active ? 0 : 1;

  return res.json({
    success: true,
    message: `Promocode "${coupon.code}" is now ${coupon.is_active ? 'ACTIVE' : 'INACTIVE'}`,
    data: coupon
  });
});

// ADMIN: Delete platform promocode
couponRouter.delete('/admin/:id', (req: Request, res: Response) => {
  const store = db.getStore();
  if (!store.coupons) store.coupons = [];

  const id = Number(req.params.id);
  const idx = store.coupons.findIndex((c: any) => c.id === id);

  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Promocode not found' });
  }

  const removed = store.coupons.splice(idx, 1)[0];

  return res.json({
    success: true,
    message: `Promocode "${removed.code}" deleted successfully`,
    data: removed
  });
});

// RESTAURANT: Create or update restaurant specific promocode
couponRouter.post('/restaurant', (req: Request, res: Response) => {
  const store = db.getStore();
  if (!store.restaurant_promocodes) store.restaurant_promocodes = [];

  const { restaurant_id, code, discount_percentage, max_discount, min_order_amount, is_active } = req.body;

  if (!restaurant_id || !code) {
    return res.status(400).json({ success: false, message: 'Restaurant ID and Promocode text are required' });
  }

  const restId = Number(restaurant_id);
  const rest = store.restaurants?.find((r: any) => r.id === restId);
  if (!rest) {
    return res.status(404).json({ success: false, message: 'Restaurant not found' });
  }

  const cleanCode = code.trim().toUpperCase();

  if (!rest.promocodes) rest.promocodes = [];

  const existingIdx = rest.promocodes.findIndex((p: any) => p.code.toUpperCase() === cleanCode);
  const promoData = {
    id: existingIdx !== -1 ? rest.promocodes[existingIdx].id : Date.now(),
    restaurant_id: restId,
    code: cleanCode,
    discount_percentage: Number(discount_percentage) || 10,
    max_discount: Number(max_discount) || 50,
    min_order_amount: Number(min_order_amount) || 100,
    is_active: typeof is_active !== 'undefined' ? (is_active ? 1 : 0) : 1,
    created_at: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    rest.promocodes[existingIdx] = promoData;
  } else {
    rest.promocodes.push(promoData);
  }

  // Also sync in global store
  const globalIdx = store.restaurant_promocodes.findIndex((p: any) => p.restaurant_id === restId && p.code.toUpperCase() === cleanCode);
  if (globalIdx !== -1) {
    store.restaurant_promocodes[globalIdx] = promoData;
  } else {
    store.restaurant_promocodes.push(promoData);
  }

  return res.json({
    success: true,
    message: `Restaurant Special Promocode "${cleanCode}" saved successfully!`,
    data: promoData
  });
});

// RESTAURANT: Delete restaurant promocode
couponRouter.delete('/restaurant/:restaurantId/:code', (req: Request, res: Response) => {
  const store = db.getStore();
  const restId = Number(req.params.restaurantId);
  const code = req.params.code.toUpperCase();

  const rest = store.restaurants?.find((r: any) => r.id === restId);
  if (rest && rest.promocodes) {
    rest.promocodes = rest.promocodes.filter((p: any) => p.code.toUpperCase() !== code);
  }

  if (store.restaurant_promocodes) {
    store.restaurant_promocodes = store.restaurant_promocodes.filter((p: any) => !(p.restaurant_id === restId && p.code.toUpperCase() === code));
  }

  return res.json({
    success: true,
    message: `Promocode "${code}" deleted successfully`
  });
});

