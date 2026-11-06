import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/authMiddleware';
import { locationService } from '../services/locationService';

export const restaurantRouter = Router();

// Public: Get all approved restaurants (Search across restaurant names, cuisines, AND their food item names/categories)
restaurantRouter.get('/', (req: Request, res: Response) => {
  const store = db.getStore();
  const { search, category, vegOnly } = req.query;

  let results = store.restaurants.filter(
    (r: any) => r.status === 'approved' && (r.is_active === undefined || r.is_active === 1)
  );

  if (vegOnly === 'true' || vegOnly === '1') {
    results = results.filter((r: any) => r.is_pure_veg === 1);
  }

  if (search) {
    const rawQ = String(search).toLowerCase().trim();
    const qTokens = rawQ.split(/\s+/).filter(Boolean);

    results = results.filter((r: any) => {
      // 1. Restaurant direct fields
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

      // 2. Food items belonging to this restaurant
      const restFoods = store.foods.filter((f: any) => f.restaurant_id === r.id);
      const foodMatches = restFoods.some((f: any) => {
        const foodName = (f.name || '').toLowerCase();
        const foodNameBn = (f.name_bn || '').toLowerCase();
        const foodCat = (f.category || '').toLowerCase();
        const foodDesc = (f.description || '').toLowerCase();

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

  // Apply radius-wise or service area admin ranking (Top 1..5 positions)
  if (!store.location_rankings) store.location_rankings = [];
  if (!store.restaurant_rankings) store.restaurant_rankings = [];

  const reqLat = req.query.lat ? Number(req.query.lat) : null;
  const reqLng = req.query.lng ? Number(req.query.lng) : null;
  const areaId = req.query.service_area_id ? Number(req.query.service_area_id) : null;

  let activeRankingRule: any = null;

  // 1. Try matching customer's GPS lat/lng with active Location Radius Ranking Rules
  if (reqLat && reqLng) {
    const matchingRules = store.location_rankings.filter((rule: any) => {
      if (!rule.is_active || !rule.lat || !rule.lng || !rule.radius_km) return false;
      const dist = locationService.calculateDistanceKm(reqLat, reqLng, rule.lat, rule.lng);
      return dist <= rule.radius_km;
    });

    if (matchingRules.length > 0) {
      // Pick rule with smallest distance from customer to center point
      matchingRules.sort((a: any, b: any) => {
        const distA = locationService.calculateDistanceKm(reqLat, reqLng, a.lat, a.lng);
        const distB = locationService.calculateDistanceKm(reqLat, reqLng, b.lat, b.lng);
        return distA - distB;
      });
      activeRankingRule = matchingRules[0];
    }
  }

  // 2. Fall back to service area rule if no specific radius rule matched
  if (!activeRankingRule && areaId) {
    activeRankingRule = store.restaurant_rankings.find((r: any) => Number(r.service_area_id) === areaId);
  }

  // 3. Fall back to global default ranking
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

  // Attach display_rank and sort
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
      return rankA - rankB; // Top 1..5 come first in order
    }
    return 0;
  });

  return res.json({
    success: true,
    data: results
  });
});

// Public: Get all food items across approved active restaurants with store details
restaurantRouter.get('/all-foods', (req: Request, res: Response) => {
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
restaurantRouter.get('/my/current', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
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
restaurantRouter.get('/:id', (req: Request, res: Response) => {
  const store = db.getStore();
  const restId = Number(req.params.id);
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
restaurantRouter.put('/:id', authenticateToken, requireRole(['restaurant', 'admin']), (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const restId = Number(req.params.id);
  const restaurant = store.restaurants.find((r: any) => r.id === restId);

  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'Restaurant not found' });
  }

  // Ensure owner owns it, or is admin, or is demo user fallback
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

  // Payment details
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

  // Also update user's name/phone if changed
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
restaurantRouter.post('/:id/menu', authenticateToken, requireRole(['restaurant', 'admin']), (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const restId = Number(req.params.id);
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
restaurantRouter.put('/:id/menu/:foodId', authenticateToken, requireRole(['restaurant', 'admin']), (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const restId = Number(req.params.id);
  const foodId = Number(req.params.foodId);
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
restaurantRouter.delete('/:id/menu/:foodId', authenticateToken, requireRole(['restaurant', 'admin']), (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const restId = Number(req.params.id);
  const foodId = Number(req.params.foodId);
  const idx = store.foods.findIndex((f: any) => f.id === foodId && f.restaurant_id === restId);

  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Food item not found' });
  }

  store.foods.splice(idx, 1);
  return res.json({ success: true, message: 'Food item removed' });
});

// Restaurant Owner: Earnings & Commission breakdown
restaurantRouter.get('/:id/earnings', authenticateToken, requireRole(['restaurant', 'admin']), (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const restId = Number(req.params.id);
  const restaurant = store.restaurants.find((r: any) => r.id === restId);

  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'Restaurant not found' });
  }

  const restOrders = store.orders.filter((o: any) => o.restaurant_id === restId && o.status !== 'cancelled');
  const grossSales = restOrders.reduce((sum: number, o: any) => sum + Number(o.subtotal), 0);
  const platformFee = Math.round((grossSales * (Number(restaurant.commission_rate) / 100)) * 100) / 100;

  // Accurately sum net earnings from delivered orders
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
