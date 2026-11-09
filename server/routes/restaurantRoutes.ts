import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/authMiddleware';
import { locationService } from '../services/locationService';

export const restaurantRouter = Router();

function formatRestaurantRow(r: any) {
  let cuisine_types: string[] = [];
  if (r.cuisine_types_json) {
    try {
      cuisine_types = typeof r.cuisine_types_json === 'string' ? JSON.parse(r.cuisine_types_json) : r.cuisine_types_json;
    } catch {}
  }

  let photos: string[] = [];
  if (r.photos_json) {
    try {
      photos = typeof r.photos_json === 'string' ? JSON.parse(r.photos_json) : r.photos_json;
    } catch {}
  }

  let settlements: any[] = [];
  if (r.settlements_json) {
    try {
      settlements = typeof r.settlements_json === 'string' ? JSON.parse(r.settlements_json) : r.settlements_json;
    } catch {}
  }

  return {
    ...r,
    id: Number(r.id),
    user_id: Number(r.user_id),
    service_area_id: r.service_area_id != null ? Number(r.service_area_id) : null,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    commission_rate: r.commission_rate != null ? Number(r.commission_rate) : 10,
    min_order_amount: r.min_order_amount != null ? Number(r.min_order_amount) : 0,
    avg_delivery_minutes: Number(r.avg_delivery_minutes || 30),
    rating: Number(r.rating || 4.5),
    rating_count: Number(r.rating_count || 0),
    is_open: Number(r.is_open ?? 1),
    is_pure_veg: Number(r.is_pure_veg || 0),
    self_delivery_enabled: Number(r.self_delivery_enabled || 0),
    self_delivery_radius_km: Number(r.self_delivery_radius_km || 5.0),
    is_active: Number(r.is_active ?? 1),
    cuisine_types,
    photos,
    settlements
  };
}

function formatFoodRow(f: any) {
  return {
    ...f,
    id: Number(f.id),
    restaurant_id: Number(f.restaurant_id),
    price: Number(f.price),
    discount_price: f.discount_price != null ? Number(f.discount_price) : null,
    is_veg: Number(f.is_veg || 0),
    is_available: Number(f.is_available ?? 1),
    is_recommended: Number(f.is_recommended || 0),
    preparation_minutes: Number(f.preparation_minutes || 15)
  };
}

// Public: Get all approved restaurants (Search across restaurant names, cuisines, AND their food item names/categories)
restaurantRouter.get('/', async (req: Request, res: Response) => {
  if (db.isUsingMysql()) {
    const { search, vegOnly, lat, lng, service_area_id } = req.query;

    let sql = "SELECT * FROM restaurants WHERE status = 'approved' AND (is_active IS NULL OR is_active = 1)";
    const params: any[] = [];

    if (vegOnly === 'true' || vegOnly === '1') {
      sql += ' AND is_pure_veg = 1';
    }

    const restRes = await db.query(sql, params);
    let results = restRes.rows.map(formatRestaurantRow);

    if (search) {
      const rawQ = String(search).toLowerCase().trim();
      const qTokens = rawQ.split(/\s+/).filter(Boolean);

      const foodSearchRes = await db.query(
        'SELECT DISTINCT restaurant_id FROM foods WHERE LOWER(name) LIKE ? OR LOWER(name_bn) LIKE ? OR LOWER(category) LIKE ? OR LOWER(description) LIKE ?',
        [`%${rawQ}%`, `%${rawQ}%`, `%${rawQ}%`, `%${rawQ}%`]
      );
      const matchingRestIdsFromFood = new Set(foodSearchRes.rows.map((r: any) => Number(r.restaurant_id)));

      results = results.filter((r: any) => {
        const restName = (r.name || '').toLowerCase();
        const restNameBn = (r.name_bn || '').toLowerCase();
        const cuisines = (r.cuisine_types || []).map((c: string) => c.toLowerCase());
        const address = (r.address || '').toLowerCase();

        const restMatches = qTokens.some(token =>
          restName.includes(token) ||
          restNameBn.includes(token) ||
          address.includes(token) ||
          cuisines.some((c: string) => c.includes(token))
        );

        if (restMatches) return true;
        return matchingRestIdsFromFood.has(r.id);
      });
    }

    const locationRankings = await locationService.getLocationRankings();
    const reqLat = lat ? Number(lat) : null;
    const reqLng = lng ? Number(lng) : null;
    const areaId = service_area_id ? Number(service_area_id) : null;

    let activeRankingRule: any = null;
    if (reqLat && reqLng) {
      const matchingRules = locationRankings.filter((rule: any) => {
        if (!rule.is_active || !rule.lat || !rule.lng || !rule.radius_km) return false;
        const dist = locationService.calculateDistanceKm(reqLat, reqLng, rule.lat, rule.lng);
        return dist <= rule.radius_km;
      });

      if (matchingRules.length > 0) {
        matchingRules.sort((a: any, b: any) => {
          const distA = locationService.calculateDistanceKm(reqLat, reqLng, a.lat, a.lng);
          const distB = locationService.calculateDistanceKm(reqLat, reqLng, b.lat, b.lng);
          return distA - distB;
        });
        activeRankingRule = matchingRules[0];
      }
    }

    if (!activeRankingRule && areaId) {
      const rrRes = await db.query('SELECT * FROM restaurant_rankings WHERE service_area_id = ? LIMIT 1', [areaId]);
      if (rrRes.rows[0]) {
        try { activeRankingRule = { rankings: JSON.parse(rrRes.rows[0].rankings_json || '[]') }; } catch {}
      }
    }
    if (!activeRankingRule) {
      const rrRes = await db.query('SELECT * FROM restaurant_rankings WHERE service_area_id = 0 OR service_area_id IS NULL LIMIT 1', []);
      if (rrRes.rows[0]) {
        try { activeRankingRule = { rankings: JSON.parse(rrRes.rows[0].rankings_json || '[]') }; } catch {}
      }
    }

    const rankMap = new Map<number, number>();
    if (activeRankingRule && activeRankingRule.rankings && Array.isArray(activeRankingRule.rankings)) {
      activeRankingRule.rankings.forEach((item: any) => {
        if (item.restaurant_id && item.rank && item.rank > 0 && item.rank <= 5) {
          rankMap.set(Number(item.restaurant_id), Number(item.rank));
        }
      });
    }

    results = results.map((r: any) => ({
      ...r,
      display_rank: rankMap.get(r.id) || null
    }));

    results.sort((a: any, b: any) => {
      const rankA = a.display_rank || 999;
      const rankB = b.display_rank || 999;
      return rankA - rankB;
    });

    return res.json({
      success: true,
      data: results
    });
  }

  return res.status(503).json({ success: false, message: 'Service unavailable: In-memory store deprecated' });

        return qTokens.some(token =>
          foodName.includes(token) ||
          foodNameBn.includes(token) ||
          foodCat.includes(token) ||
          foodDesc.includes(token)
        );
      });

      return foodMatches;
    });
  }

  if (!store.location_rankings) store.location_rankings = [];
  if (!store.restaurant_rankings) store.restaurant_rankings = [];

  const reqLat = req.query.lat ? Number(req.query.lat) : null;
  const reqLng = req.query.lng ? Number(req.query.lng) : null;
  const areaId = req.query.service_area_id ? Number(req.query.service_area_id) : null;

  let activeRankingRule: any = null;

  if (reqLat && reqLng) {
    const matchingRules = store.location_rankings.filter((rule: any) => {
      if (!rule.is_active || !rule.lat || !rule.lng || !rule.radius_km) return false;
      const dist = locationService.calculateDistanceKm(reqLat, reqLng, rule.lat, rule.lng);
      return dist <= rule.radius_km;
    });

    if (matchingRules.length > 0) {
      matchingRules.sort((a: any, b: any) => {
        const distA = locationService.calculateDistanceKm(reqLat, reqLng, a.lat, a.lng);
        const distB = locationService.calculateDistanceKm(reqLat, reqLng, b.lat, b.lng);
        return distA - distB;
      });
      activeRankingRule = matchingRules[0];
    }
  }

  if (!activeRankingRule && areaId) {
    activeRankingRule = store.restaurant_rankings.find((r: any) => Number(r.service_area_id) === areaId);
  }

  if (!activeRankingRule) {
    activeRankingRule = store.restaurant_rankings.find((r: any) => Number(r.service_area_id) === 0 || !r.service_area_id);
  }

  const rankMap = new Map<number, number>();
  if (activeRankingRule && activeRankingRule.rankings && Array.isArray(activeRankingRule.rankings)) {
    activeRankingRule.rankings.forEach((item: any) => {
      if (item.restaurant_id && item.rank && item.rank > 0 && item.rank <= 5) {
        rankMap.set(Number(item.restaurant_id), Number(item.rank));
      }
    });
  }

  results = results.map((r: any) => {
    const rank = rankMap.get(r.id);
    return {
      ...r,
      display_rank: rank || null
    };
  });

  results.sort((a: any, b: any) => {
    const rankA = a.display_rank || 999;
    const rankB = b.display_rank || 999;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return 0;
  });

  return res.json({
    success: true,
    data: results
  });
});

// Public: Get all food items across approved active restaurants with store details
restaurantRouter.get('/all-foods', async (req: Request, res: Response) => {
  if (db.isUsingMysql()) {
    const { search, vegOnly } = req.query;

    const restRes = await db.query("SELECT * FROM restaurants WHERE status = 'approved' AND (is_active IS NULL OR is_active = 1)", []);
    const approvedRestsMap = new Map<number, any>();
    for (const r of restRes.rows) {
      approvedRestsMap.set(Number(r.id), formatRestaurantRow(r));
    }

    const foodRes = await db.query('SELECT * FROM foods', []);
    let results: any[] = [];

    for (const rawFood of foodRes.rows) {
      const food = formatFoodRow(rawFood);
      const rest = approvedRestsMap.get(food.restaurant_id);
      if (rest) {
        results.push({ food, restaurant: rest });
      }
    }

    if (vegOnly === 'true' || vegOnly === '1') {
      results = results.filter((item: any) => item.food.is_veg === 1);
    }

    if (search) {
      const rawQ = String(search).toLowerCase().trim();
      const qTokens = rawQ.split(/\s+/).filter(Boolean);

      results = results.filter((item: any) => {
        const foodName = (item.food.name || '').toLowerCase();
        const foodNameBn = (item.food.name_bn || '').toLowerCase();
        const foodCat = (item.food.category || '').toLowerCase();
        const foodDesc = (item.food.description || '').toLowerCase();
        const restName = (item.restaurant.name || '').toLowerCase();
        const restNameBn = (item.restaurant.name_bn || '').toLowerCase();

        return qTokens.some(token =>
          foodName.includes(token) ||
          foodNameBn.includes(token) ||
          foodCat.includes(token) ||
          foodDesc.includes(token) ||
          restName.includes(token) ||
          restNameBn.includes(token)
        );
      });
    }

    return res.json({
      success: true,
      data: results
    });
  }

  // inMemoryStore fallback
  const store = db.getStore();
  const { search, vegOnly } = req.query;

  const approvedRests = store.restaurants.filter(
    (r: any) => r.status === 'approved' && (r.is_active === undefined || r.is_active === 1)
  );

  let results = [];
  for (const food of store.foods) {
    const rest = approvedRests.find((r: any) => r.id === food.restaurant_id);
    if (rest) {
      results.push({ food, restaurant: rest });
    }
  }

  if (vegOnly === 'true' || vegOnly === '1') {
    results = results.filter((item: any) => item.food.is_veg === 1);
  }

  if (search) {
    const rawQ = String(search).toLowerCase().trim();
    const qTokens = rawQ.split(/\s+/).filter(Boolean);

    results = results.filter((item: any) => {
      const foodName = (item.food.name || '').toLowerCase();
      const foodNameBn = (item.food.name_bn || '').toLowerCase();
      const foodCat = (item.food.category || '').toLowerCase();
      const foodDesc = (item.food.description || '').toLowerCase();
      const restName = (item.restaurant.name || '').toLowerCase();
      const restNameBn = (item.restaurant.name_bn || '').toLowerCase();

      return qTokens.some(token =>
        foodName.includes(token) ||
        foodNameBn.includes(token) ||
        foodCat.includes(token) ||
        foodDesc.includes(token) ||
        restName.includes(token) ||
        restNameBn.includes(token)
      );
    });
  }

  return res.json({
    success: true,
    data: results
  });
});

// Restaurant Owner: Get current authenticated restaurant profile
restaurantRouter.get('/my/current', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (db.isUsingMysql()) {
    let restRes = await db.query('SELECT * FROM restaurants WHERE user_id = ? LIMIT 1', [req.user?.id]);
    if (!restRes.rows[0]) {
      restRes = await db.query('SELECT * FROM restaurants ORDER BY id ASC LIMIT 1', []);
    }

    if (!restRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const rest = formatRestaurantRow(restRes.rows[0]);
    const foodRes = await db.query('SELECT * FROM foods WHERE restaurant_id = ?', [rest.id]);
    const menu = foodRes.rows.map(formatFoodRow);

    return res.json({
      success: true,
      data: {
        ...rest,
        menu
      }
    });
  }

  // inMemoryStore fallback
  const store = db.getStore();
  const rest = store.restaurants.find((r: any) => r.user_id === req.user?.id) || store.restaurants[0];
  if (!rest) {
    return res.status(404).json({ success: false, message: 'Restaurant not found' });
  }

  const menu = store.foods.filter((f: any) => f.restaurant_id === rest.id);

  return res.json({
    success: true,
    data: {
      ...rest,
      menu
    }
  });
});

// Public: Get restaurant by ID with its menu items
restaurantRouter.get('/:id', async (req: Request, res: Response) => {
  const restId = Number(req.params.id);

  if (db.isUsingMysql()) {
    const restRes = await db.query('SELECT * FROM restaurants WHERE id = ? LIMIT 1', [restId]);
    if (!restRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const restaurant = formatRestaurantRow(restRes.rows[0]);
    const foodRes = await db.query('SELECT * FROM foods WHERE restaurant_id = ?', [restId]);
    const menu = foodRes.rows.map(formatFoodRow);

    return res.json({
      success: true,
      data: {
        ...restaurant,
        menu
      }
    });
  }

  // inMemoryStore fallback
  const store = db.getStore();
  const restaurant = store.restaurants.find((r: any) => r.id === restId);

  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'Restaurant not found' });
  }

  const menu = store.foods.filter((f: any) => f.restaurant_id === restId);

  return res.json({
    success: true,
    data: {
      ...restaurant,
      menu
    }
  });
});

// Restaurant Owner: Update restaurant profile & details (all fields, photos, payment details)
restaurantRouter.put('/:id', authenticateToken, requireRole(['restaurant', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  const restId = Number(req.params.id);

  if (db.isUsingMysql()) {
    const restRes = await db.query('SELECT * FROM restaurants WHERE id = ? LIMIT 1', [restId]);
    if (!restRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const existingRest = restRes.rows[0];

    if (req.user?.role === 'restaurant' && Number(existingRest.user_id) !== req.user.id) {
      const userRestRes = await db.query('SELECT id FROM restaurants WHERE user_id = ? LIMIT 1', [req.user.id]);
      if (userRestRes.rows[0] && Number(userRestRes.rows[0].id) !== restId) {
        return res.status(403).json({ success: false, message: 'Not authorized for this restaurant' });
      }
    }

    const {
      name,
      name_bn,
      owner_name,
      phone,
      email,
      address,
      latitude,
      longitude,
      is_open,
      is_pure_veg,
      avg_delivery_minutes,
      min_order_amount,
      self_delivery_enabled,
      self_delivery_radius_km,
      photo_url,
      banner_url,
      photos,
      cuisine_types,
      payment_method,
      upi_id,
      upi_qr_photo,
      bank_name,
      bank_account_no,
      bank_account_holder,
      bank_ifsc,
      bank_passbook_photo
    } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (name_bn) { updates.push('name_bn = ?'); params.push(name_bn); }
    if (owner_name) { updates.push('owner_name = ?'); params.push(owner_name); }
    if (phone) { updates.push('phone = ?'); params.push(phone); }
    if (email) { updates.push('email = ?'); params.push(email); }
    if (address) { updates.push('address = ?'); params.push(address); }
    if (typeof is_open !== 'undefined') { updates.push('is_open = ?'); params.push(is_open ? 1 : 0); }
    if (typeof is_pure_veg !== 'undefined') { updates.push('is_pure_veg = ?'); params.push(is_pure_veg ? 1 : 0); }
    if (typeof self_delivery_enabled !== 'undefined') { updates.push('self_delivery_enabled = ?'); params.push(self_delivery_enabled ? 1 : 0); }
    if (typeof self_delivery_radius_km !== 'undefined') { updates.push('self_delivery_radius_km = ?'); params.push(Number(self_delivery_radius_km)); }
    if (avg_delivery_minutes) { updates.push('avg_delivery_minutes = ?'); params.push(Number(avg_delivery_minutes)); }
    if (min_order_amount) { updates.push('min_order_amount = ?'); params.push(Number(min_order_amount)); }
    if (photo_url) { updates.push('photo_url = ?'); params.push(photo_url); }
    if (banner_url) { updates.push('banner_url = ?'); params.push(banner_url); }
    if (photos && Array.isArray(photos)) {
      updates.push('photos_json = ?');
      params.push(JSON.stringify(photos));
      if (photos.length > 0 && !photo_url) {
        updates.push('photo_url = ?');
        params.push(photos[0]);
      }
    }
    if (cuisine_types && Array.isArray(cuisine_types)) {
      updates.push('cuisine_types_json = ?');
      params.push(JSON.stringify(cuisine_types));
    }
    if (payment_method) { updates.push('payment_method = ?'); params.push(payment_method); }
    if (typeof upi_id !== 'undefined') { updates.push('upi_id = ?'); params.push(upi_id); }
    if (typeof upi_qr_photo !== 'undefined') { updates.push('upi_qr_photo = ?'); params.push(upi_qr_photo); }
    if (typeof bank_name !== 'undefined') { updates.push('bank_name = ?'); params.push(bank_name); }
    if (typeof bank_account_no !== 'undefined') { updates.push('bank_account_no = ?'); params.push(bank_account_no); }
    if (typeof bank_account_holder !== 'undefined') { updates.push('bank_account_holder = ?'); params.push(bank_account_holder); }
    if (typeof bank_ifsc !== 'undefined') { updates.push('bank_ifsc = ?'); params.push(bank_ifsc); }
    if (typeof bank_passbook_photo !== 'undefined') { updates.push('bank_passbook_photo = ?'); params.push(bank_passbook_photo); }
    if (latitude && longitude) {
      updates.push('latitude = ?', 'longitude = ?');
      params.push(Number(latitude), Number(longitude));
    }

    if (updates.length > 0) {
      params.push(restId);
      await db.query(`UPDATE restaurants SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    if (owner_name || phone) {
      const userUpdates: string[] = [];
      const userParams: any[] = [];
      if (owner_name) { userUpdates.push('name = ?'); userParams.push(owner_name); }
      if (phone) { userUpdates.push('phone = ?'); userParams.push(phone); }
      userParams.push(existingRest.user_id);
      await db.query(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
    }

    const updatedRes = await db.query('SELECT * FROM restaurants WHERE id = ? LIMIT 1', [restId]);
    const updatedData = formatRestaurantRow(updatedRes.rows[0]);

    return res.json({
      success: true,
      message: 'Restaurant details and payment methods updated successfully (রেস্তোরাঁর তথ্য ও পেমেন্ট ডিটেইলস সংরক্ষিত হয়েছে)',
      data: updatedData
    });
  }

  // inMemoryStore fallback
  const store = db.getStore();
  const restaurant = store.restaurants.find((r: any) => r.id === restId);

  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'Restaurant not found' });
  }

  if (req.user?.role === 'restaurant' && restaurant.user_id !== req.user.id) {
    const userRest = store.restaurants.find((r: any) => r.user_id === req.user?.id);
    if (userRest && userRest.id !== restId) {
      return res.status(403).json({ success: false, message: 'Not authorized for this restaurant' });
    }
  }

  const {
    name,
    name_bn,
    owner_name,
    phone,
    email,
    address,
    latitude,
    longitude,
    is_open,
    is_pure_veg,
    avg_delivery_minutes,
    min_order_amount,
    self_delivery_enabled,
    self_delivery_radius_km,
    photo_url,
    banner_url,
    photos,
    cuisine_types,
    payment_method,
    upi_id,
    upi_qr_photo,
    bank_name,
    bank_account_no,
    bank_account_holder,
    bank_ifsc,
    bank_passbook_photo
  } = req.body;

  if (name) restaurant.name = name;
  if (name_bn) restaurant.name_bn = name_bn;
  if (owner_name) restaurant.owner_name = owner_name;
  if (phone) restaurant.phone = phone;
  if (email) restaurant.email = email;
  if (address) restaurant.address = address;
  if (typeof is_open !== 'undefined') restaurant.is_open = is_open ? 1 : 0;
  if (typeof is_pure_veg !== 'undefined') restaurant.is_pure_veg = is_pure_veg ? 1 : 0;
  if (typeof self_delivery_enabled !== 'undefined') restaurant.self_delivery_enabled = self_delivery_enabled ? 1 : 0;
  if (typeof self_delivery_radius_km !== 'undefined') restaurant.self_delivery_radius_km = Number(self_delivery_radius_km);
  if (avg_delivery_minutes) restaurant.avg_delivery_minutes = Number(avg_delivery_minutes);
  if (min_order_amount) restaurant.min_order_amount = Number(min_order_amount);
  if (photo_url) restaurant.photo_url = photo_url;
  if (banner_url) restaurant.banner_url = banner_url;
  if (photos && Array.isArray(photos)) {
    restaurant.photos = photos;
    if (photos.length > 0 && !photo_url) {
      restaurant.photo_url = photos[0];
    }
  }
  if (cuisine_types && Array.isArray(cuisine_types)) restaurant.cuisine_types = cuisine_types;

  if (payment_method) restaurant.payment_method = payment_method;
  if (typeof upi_id !== 'undefined') restaurant.upi_id = upi_id;
  if (typeof upi_qr_photo !== 'undefined') restaurant.upi_qr_photo = upi_qr_photo;
  if (typeof bank_name !== 'undefined') restaurant.bank_name = bank_name;
  if (typeof bank_account_no !== 'undefined') restaurant.bank_account_no = bank_account_no;
  if (typeof bank_account_holder !== 'undefined') restaurant.bank_account_holder = bank_account_holder;
  if (typeof bank_ifsc !== 'undefined') restaurant.bank_ifsc = bank_ifsc;
  if (typeof bank_passbook_photo !== 'undefined') restaurant.bank_passbook_photo = bank_passbook_photo;

  if (latitude && longitude) {
    restaurant.latitude = Number(latitude);
    restaurant.longitude = Number(longitude);
  }

  const ownerUser = store.users.find((u: any) => u.id === restaurant.user_id);
  if (ownerUser) {
    if (owner_name) ownerUser.name = owner_name;
    if (phone) ownerUser.phone = phone;
  }

  return res.json({
    success: true,
    message: 'Restaurant details and payment methods updated successfully (রেস্তোরাঁর তথ্য ও পেমেন্ট ডিটেইলস সংরক্ষিত হয়েছে)',
    data: restaurant
  });
});

// Restaurant Owner: Add Menu item
restaurantRouter.post('/:id/menu', authenticateToken, requireRole(['restaurant', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  const restId = Number(req.params.id);

  if (db.isUsingMysql()) {
    const restRes = await db.query('SELECT * FROM restaurants WHERE id = ? LIMIT 1', [restId]);
    if (!restRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const restaurant = restRes.rows[0];
    if (req.user?.role === 'restaurant' && Number(restaurant.user_id) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { name, name_bn, category, category_bn, description, description_bn, price, discount_price, photo_url, is_veg, preparation_minutes } = req.body;

    if (!name || !price) {
      return res.status(400).json({ success: false, message: 'Food item name and price are required' });
    }

    const insertRes = await db.query(
      `INSERT INTO foods (
        restaurant_id, category, category_bn, name, name_bn,
        description, description_bn, price, discount_price,
        photo_url, is_veg, is_available, is_recommended, preparation_minutes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)`,
      [
        restId,
        category || 'Main Course',
        category_bn || 'মূল খাবার',
        name,
        name_bn || name,
        description || '',
        description_bn || '',
        Number(price),
        discount_price ? Number(discount_price) : null,
        photo_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
        is_veg ? 1 : 0,
        Number(preparation_minutes) || 15
      ]
    );

    const newFoodId = insertRes.insertId || (insertRes.rows as any)?.insertId;
    const fetchNewFood = await db.query('SELECT * FROM foods WHERE id = ? LIMIT 1', [newFoodId]);
    const newFood = formatFoodRow(fetchNewFood.rows[0]);

    return res.status(201).json({
      success: true,
      message: 'Food item added successfully (খাবার যোগ করা হয়েছে)',
      data: newFood
    });
  }

  // inMemoryStore fallback
  const store = db.getStore();
  const restaurant = store.restaurants.find((r: any) => r.id === restId);

  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'Restaurant not found' });
  }

  if (req.user?.role === 'restaurant' && restaurant.user_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const { name, name_bn, category, category_bn, description, description_bn, price, discount_price, photo_url, is_veg, preparation_minutes } = req.body;

  if (!name || !price) {
    return res.status(400).json({ success: false, message: 'Food item name and price are required' });
  }

  const newFoodId = store.foods.length + 1;
  const newFood = {
    id: newFoodId,
    restaurant_id: restId,
    category: category || 'Main Course',
    category_bn: category_bn || 'মূল খাবার',
    name,
    name_bn: name_bn || name,
    description: description || '',
    description_bn: description_bn || '',
    price: Number(price),
    discount_price: discount_price ? Number(discount_price) : null,
    photo_url: photo_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
    is_veg: is_veg ? 1 : 0,
    is_available: 1,
    is_recommended: 0,
    preparation_minutes: Number(preparation_minutes) || 15
  };

  store.foods.push(newFood);

  return res.status(201).json({
    success: true,
    message: 'Food item added successfully (খাবার যোগ করা হয়েছে)',
    data: newFood
  });
});

// Restaurant Owner: Update/toggle Menu item
restaurantRouter.put('/:id/menu/:foodId', authenticateToken, requireRole(['restaurant', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  const restId = Number(req.params.id);
  const foodId = Number(req.params.foodId);

  if (db.isUsingMysql()) {
    const foodRes = await db.query('SELECT * FROM foods WHERE id = ? AND restaurant_id = ? LIMIT 1', [foodId, restId]);
    if (!foodRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    const { name, name_bn, price, discount_price, is_available, is_veg, photo_url } = req.body;
    const updates: string[] = [];
    const params: any[] = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (name_bn) { updates.push('name_bn = ?'); params.push(name_bn); }
    if (typeof price !== 'undefined') { updates.push('price = ?'); params.push(Number(price)); }
    if (typeof discount_price !== 'undefined') { updates.push('discount_price = ?'); params.push(discount_price ? Number(discount_price) : null); }
    if (typeof is_available !== 'undefined') { updates.push('is_available = ?'); params.push(is_available ? 1 : 0); }
    if (typeof is_veg !== 'undefined') { updates.push('is_veg = ?'); params.push(is_veg ? 1 : 0); }
    if (photo_url) { updates.push('photo_url = ?'); params.push(photo_url); }

    if (updates.length > 0) {
      params.push(foodId, restId);
      await db.query(`UPDATE foods SET ${updates.join(', ')} WHERE id = ? AND restaurant_id = ?`, params);
    }

    const updatedFoodRes = await db.query('SELECT * FROM foods WHERE id = ? LIMIT 1', [foodId]);
    const food = formatFoodRow(updatedFoodRes.rows[0]);

    return res.json({
      success: true,
      message: 'Menu item updated',
      data: food
    });
  }

  // inMemoryStore fallback
  const store = db.getStore();
  const food = store.foods.find((f: any) => f.id === foodId && f.restaurant_id === restId);

  if (!food) {
    return res.status(404).json({ success: false, message: 'Food item not found' });
  }

  const { name, name_bn, price, discount_price, is_available, is_veg, photo_url } = req.body;
  if (name) food.name = name;
  if (name_bn) food.name_bn = name_bn;
  if (typeof price !== 'undefined') food.price = Number(price);
  if (typeof discount_price !== 'undefined') food.discount_price = discount_price ? Number(discount_price) : null;
  if (typeof is_available !== 'undefined') food.is_available = is_available ? 1 : 0;
  if (typeof is_veg !== 'undefined') food.is_veg = is_veg ? 1 : 0;
  if (photo_url) food.photo_url = photo_url;

  return res.json({
    success: true,
    message: 'Menu item updated',
    data: food
  });
});

// Restaurant Owner: Delete Menu item
restaurantRouter.delete('/:id/menu/:foodId', authenticateToken, requireRole(['restaurant', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  const restId = Number(req.params.id);
  const foodId = Number(req.params.foodId);

  if (db.isUsingMysql()) {
    const foodRes = await db.query('SELECT id FROM foods WHERE id = ? AND restaurant_id = ? LIMIT 1', [foodId, restId]);
    if (!foodRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    await db.query('DELETE FROM foods WHERE id = ? AND restaurant_id = ?', [foodId, restId]);
    return res.json({ success: true, message: 'Food item removed' });
  }

  // inMemoryStore fallback
  const store = db.getStore();
  const idx = store.foods.findIndex((f: any) => f.id === foodId && f.restaurant_id === restId);

  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Food item not found' });
  }

  store.foods.splice(idx, 1);
  return res.json({ success: true, message: 'Food item removed' });
});

// Restaurant Owner: Earnings & Commission breakdown
restaurantRouter.get('/:id/earnings', authenticateToken, requireRole(['restaurant', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  const restId = Number(req.params.id);

  if (db.isUsingMysql()) {
    const restRes = await db.query('SELECT * FROM restaurants WHERE id = ? LIMIT 1', [restId]);
    if (!restRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const restaurant = formatRestaurantRow(restRes.rows[0]);

    if (req.user?.role === 'restaurant' && Number(restaurant.user_id) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view earnings for another restaurant' });
    }
    const ordersRes = await db.query("SELECT * FROM orders WHERE restaurant_id = ? AND status != 'cancelled'", [restId]);
    const restOrders = ordersRes.rows;

    const grossSales = restOrders.reduce((sum: number, o: any) => sum + Number(o.subtotal || 0), 0);
    const platformFee = Math.round((grossSales * (Number(restaurant.commission_rate) / 100)) * 100) / 100;

    const deliveredOrders = restOrders.filter((o: any) => o.status === 'delivered');
    const netEarnings = deliveredOrders.length > 0
      ? Math.round(
          deliveredOrders.reduce((sum: number, o: any) => {
            if (typeof o.net_restaurant_amount !== 'undefined' && o.net_restaurant_amount !== null) {
              return sum + Number(o.net_restaurant_amount);
            }
            const isSelf = o.is_self_delivery === 1 || o.is_self_delivery === true || o.delivery_mode === 'self_delivery';
            const foodNet = Number(o.subtotal) - (Number(o.subtotal) * (Number(restaurant.commission_rate) / 100));
            return sum + foodNet + (isSelf ? Number(o.delivery_fee || 0) : 0);
          }, 0) * 100
        ) / 100
      : Math.round((grossSales - platformFee) * 100) / 100;

    const walletRes = await db.query('SELECT * FROM wallets WHERE user_id = ? LIMIT 1', [restaurant.user_id]);
    let wallet = walletRes.rows[0];

    if (!wallet) {
      wallet = {
        balance: netEarnings,
        total_earned: netEarnings,
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

    return res.json({
      success: true,
      data: {
        grossSales,
        commissionRate: restaurant.commission_rate,
        platformFee,
        netEarnings,
        wallet,
        totalOrders: restOrders.length
      }
    });
  }

  // inMemoryStore fallback
  const store = db.getStore();
  const restaurant = store.restaurants.find((r: any) => r.id === restId);

  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'Restaurant not found' });
  }

  if (req.user?.role === 'restaurant' && Number(restaurant.user_id) !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Not authorized to view earnings for another restaurant' });
  }

  const restOrders = store.orders.filter((o: any) => o.restaurant_id === restId && o.status !== 'cancelled');
  const grossSales = restOrders.reduce((sum: number, o: any) => sum + Number(o.subtotal), 0);
  const platformFee = Math.round((grossSales * (Number(restaurant.commission_rate) / 100)) * 100) / 100;

  const deliveredOrders = restOrders.filter((o: any) => o.status === 'delivered');
  const netEarnings = deliveredOrders.length > 0
    ? Math.round(
        deliveredOrders.reduce((sum: number, o: any) => {
          if (typeof o.net_restaurant_amount !== 'undefined' && o.net_restaurant_amount !== null) {
            return sum + Number(o.net_restaurant_amount);
          }
          const isSelf = o.is_self_delivery === 1 || o.is_self_delivery === true || o.delivery_mode === 'self_delivery';
          const foodNet = Number(o.subtotal) - (Number(o.subtotal) * (Number(restaurant.commission_rate) / 100));
          return sum + foodNet + (isSelf ? Number(o.delivery_fee || 0) : 0);
        }, 0) * 100
      ) / 100
    : Math.round((grossSales - platformFee) * 100) / 100;

  const wallet = store.wallets.find((w: any) => w.user_id === restaurant.user_id) || {
    balance: netEarnings,
    total_earned: netEarnings,
    total_withdrawn: 0
  };

  return res.json({
    success: true,
    data: {
      grossSales,
      commissionRate: restaurant.commission_rate,
      platformFee,
      netEarnings,
      wallet,
      totalOrders: restOrders.length
    }
  });
});
