import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/authMiddleware';

export const couponRouter = Router();

// Public: Get active coupons (platform coupons + optional restaurant coupons)
couponRouter.get('/', async (req: Request, res: Response) => {
  if (db.isUsingMysql()) {
    const restaurantId = req.query.restaurant_id ? Number(req.query.restaurant_id) : null;
    const platformRes = await db.query('SELECT * FROM coupons WHERE is_active = 1 ORDER BY id DESC', []);
    const platformCoupons = platformRes.rows;

    let restaurantCoupons: any[] = [];
    if (restaurantId) {
      const restPromoRes = await db.query(
        'SELECT rp.*, r.name as rest_name, r.name_bn as rest_name_bn FROM restaurant_promocodes rp JOIN restaurants r ON rp.restaurant_id = r.id WHERE rp.restaurant_id = ? AND rp.is_active = 1',
        [restaurantId]
      );
      restaurantCoupons = restPromoRes.rows;
    }

    return res.json({
      success: true,
      data: {
        platformCoupons,
        restaurantCoupons,
        allActiveCoupons: [...platformCoupons, ...restaurantCoupons]
      }
    });
  }

  // In-memory fallback
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
couponRouter.post('/apply', async (req: Request, res: Response) => {
  const { code, subtotal, restaurant_id } = req.body;
  if (!code || typeof subtotal === 'undefined') {
    return res.status(400).json({ success: false, message: 'Coupon code and subtotal required' });
  }

  const searchCode = String(code).trim().toUpperCase();

  if (db.isUsingMysql()) {
    // 1. Search in Platform Customer Coupons
    const platRes = await db.query(
      'SELECT * FROM coupons WHERE UPPER(code) = ? AND is_active = 1 LIMIT 1',
      [searchCode]
    );

    let coupon: any = platRes.rows[0] || null;
    let isRestaurantCoupon = false;
    let restName = '';

    // 2. Search in Restaurant Promocodes if not found in platform coupons
    if (!coupon && restaurant_id) {
      const restIdNum = Number(restaurant_id);
      const restPromoRes = await db.query(
        `SELECT rp.*, r.name as rest_name, r.name_bn as rest_name_bn
         FROM restaurant_promocodes rp
         JOIN restaurants r ON rp.restaurant_id = r.id
         WHERE rp.restaurant_id = ? AND UPPER(rp.code) = ? AND rp.is_active = 1 LIMIT 1`,
        [restIdNum, searchCode]
      );
      const restPromo = restPromoRes.rows[0];

      if (restPromo) {
        restName = restPromo.rest_name || '';
        coupon = {
          code: restPromo.code,
          discount_type: restPromo.discount_type || 'percentage',
          discount_value: Number(restPromo.discount_value || restPromo.discount_percentage || 10),
          max_discount: restPromo.max_discount != null ? Number(restPromo.max_discount) : 100,
          min_order_amount: Number(restPromo.min_order_amount || 0),
          description: `${restName} Special Promocode (${restPromo.discount_value || 10}% OFF)`,
          description_bn: `${restPromo.rest_name_bn || restName} স্পেশাল প্রোমোকোড (${restPromo.discount_value || 10}% ছাড়)`
        };
        isRestaurantCoupon = true;
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
  }

  // In-memory fallback
  const store = db.getStore();
  if (!store.coupons) store.coupons = [];
  if (!store.restaurant_promocodes) store.restaurant_promocodes = [];

  let coupon = store.coupons.find(
    (c: any) => String(c.code).trim().toUpperCase() === searchCode && (c.is_active === 1 || c.is_active === true || typeof c.is_active === 'undefined')
  );

  let isRestaurantCoupon = false;
  let restName = '';

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
couponRouter.post('/admin', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  const { code, discount_type, discount_value, max_discount, min_order_amount, description, description_bn } = req.body;

  if (!code || !code.trim()) {
    return res.status(400).json({ success: false, message: 'Promocode text is required' });
  }

  const cleanCode = code.trim().toUpperCase();

  if (db.isUsingMysql()) {
    const existingRes = await db.query('SELECT id FROM coupons WHERE UPPER(code) = ? LIMIT 1', [cleanCode]);
    if (existingRes.rows[0]) {
      return res.status(400).json({ success: false, message: `Promocode "${cleanCode}" already exists` });
    }

    const insRes = await db.query(
      `INSERT INTO coupons (code, discount_type, discount_value, max_discount, min_order_amount, description, description_bn, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        cleanCode,
        discount_type || 'percentage',
        Number(discount_value) || 10,
        Number(max_discount) || 100,
        Number(min_order_amount) || 100,
        description || `${cleanCode} - Platform Special Offer`,
        description_bn || `${cleanCode} - প্ল্যাটফর্ম বিশেষ কুপন ছাড়`
      ]
    );

    const newId = insRes.insertId || (insRes.rows as any)?.insertId;
    const fetchNewRes = await db.query('SELECT * FROM coupons WHERE id = ? LIMIT 1', [newId]);

    return res.status(201).json({
      success: true,
      message: `Customer Promocode "${cleanCode}" created successfully!`,
      data: fetchNewRes.rows[0]
    });
  }

  // In-memory fallback
  const store = db.getStore();
  if (!store.coupons) store.coupons = [];

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
couponRouter.put('/admin/:id/toggle', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);

  if (db.isUsingMysql()) {
    const fetchRes = await db.query('SELECT * FROM coupons WHERE id = ? LIMIT 1', [id]);
    const coupon = fetchRes.rows[0];

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Promocode not found' });
    }

    const nextState = coupon.is_active ? 0 : 1;
    await db.query('UPDATE coupons SET is_active = ? WHERE id = ?', [nextState, id]);

    const updatedRes = await db.query('SELECT * FROM coupons WHERE id = ? LIMIT 1', [id]);
    const updated = updatedRes.rows[0];

    return res.json({
      success: true,
      message: `Promocode "${updated.code}" is now ${updated.is_active ? 'ACTIVE' : 'INACTIVE'}`,
      data: updated
    });
  }

  // In-memory fallback
  const store = db.getStore();
  if (!store.coupons) store.coupons = [];

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
couponRouter.delete('/admin/:id', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);

  if (db.isUsingMysql()) {
    const fetchRes = await db.query('SELECT * FROM coupons WHERE id = ? LIMIT 1', [id]);
    const coupon = fetchRes.rows[0];

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Promocode not found' });
    }

    await db.query('DELETE FROM coupons WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: `Promocode "${coupon.code}" deleted successfully`,
      data: coupon
    });
  }

  // In-memory fallback
  const store = db.getStore();
  if (!store.coupons) store.coupons = [];

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
couponRouter.post('/restaurant', authenticateToken, requireRole(['restaurant', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  const { restaurant_id, code, discount_percentage, discount_value, max_discount, min_order_amount, is_active } = req.body;

  if (!restaurant_id || !code) {
    return res.status(400).json({ success: false, message: 'Restaurant ID and Promocode text are required' });
  }

  const restId = Number(restaurant_id);
  const cleanCode = String(code).trim().toUpperCase();

  if (db.isUsingMysql()) {
    const restRes = await db.query('SELECT * FROM restaurants WHERE id = ? LIMIT 1', [restId]);
    if (!restRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const restaurant = restRes.rows[0];
    if (req.user?.role === 'restaurant' && Number(restaurant.user_id) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized for this restaurant' });
    }

    const discVal = Number(discount_value || discount_percentage || 10);
    const maxDisc = Number(max_discount || 50);
    const minOrder = Number(min_order_amount || 100);
    const activeState = typeof is_active !== 'undefined' ? (is_active ? 1 : 0) : 1;

    const existingRes = await db.query(
      'SELECT id FROM restaurant_promocodes WHERE restaurant_id = ? AND UPPER(code) = ? LIMIT 1',
      [restId, cleanCode]
    );

    if (existingRes.rows[0]) {
      await db.query(
        `UPDATE restaurant_promocodes SET discount_value = ?, max_discount = ?, min_order_amount = ?, is_active = ?
         WHERE id = ?`,
        [discVal, maxDisc, minOrder, activeState, existingRes.rows[0].id]
      );
    } else {
      await db.query(
        `INSERT INTO restaurant_promocodes (restaurant_id, code, description, discount_type, discount_value, max_discount, min_order_amount, is_active)
         VALUES (?, ?, ?, 'percentage', ?, ?, ?, ?)`,
        [restId, cleanCode, `${restaurant.name} Special Offer`, discVal, maxDisc, minOrder, activeState]
      );
    }

    const fetchRes = await db.query(
      'SELECT * FROM restaurant_promocodes WHERE restaurant_id = ? AND UPPER(code) = ? LIMIT 1',
      [restId, cleanCode]
    );

    return res.json({
      success: true,
      message: `Restaurant Special Promocode "${cleanCode}" saved successfully!`,
      data: fetchRes.rows[0]
    });
  }

  // In-memory fallback
  const store = db.getStore();
  if (!store.restaurant_promocodes) store.restaurant_promocodes = [];

  const rest = store.restaurants?.find((r: any) => r.id === restId);
  if (!rest) {
    return res.status(404).json({ success: false, message: 'Restaurant not found' });
  }

  if (req.user?.role === 'restaurant' && rest.user_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Not authorized for this restaurant' });
  }

  if (!rest.promocodes) rest.promocodes = [];

  const existingIdx = rest.promocodes.findIndex((p: any) => p.code.toUpperCase() === cleanCode);
  const promoData = {
    id: existingIdx !== -1 ? rest.promocodes[existingIdx].id : Date.now(),
    restaurant_id: restId,
    code: cleanCode,
    discount_percentage: Number(discount_percentage || discount_value || 10),
    max_discount: Number(max_discount || 50),
    min_order_amount: Number(min_order_amount || 100),
    is_active: typeof is_active !== 'undefined' ? (is_active ? 1 : 0) : 1,
    created_at: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    rest.promocodes[existingIdx] = promoData;
  } else {
    rest.promocodes.push(promoData);
  }

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
couponRouter.delete('/restaurant/:restaurantId/:code', authenticateToken, requireRole(['restaurant', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  const restId = Number(req.params.restaurantId);
  const code = String(req.params.code).toUpperCase();

  if (db.isUsingMysql()) {
    const restRes = await db.query('SELECT user_id FROM restaurants WHERE id = ? LIMIT 1', [restId]);
    if (!restRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    if (req.user?.role === 'restaurant' && Number(restRes.rows[0].user_id) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized for this restaurant' });
    }

    await db.query('DELETE FROM restaurant_promocodes WHERE restaurant_id = ? AND UPPER(code) = ?', [restId, code]);

    return res.json({
      success: true,
      message: `Promocode "${code}" deleted successfully`
    });
  }

  // In-memory fallback
  const store = db.getStore();
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
