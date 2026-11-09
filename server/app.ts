import express, { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { locationService } from './services/locationService';
import { authRouter } from './routes/authRoutes';
import { restaurantRouter } from './routes/restaurantRoutes';
import { orderRouter } from './routes/orderRoutes';
import { deliveryRouter } from './routes/deliveryRoutes';
import { adminRouter } from './routes/adminRoutes';
import { couponRouter } from './routes/couponRoutes';
import { serviceAreaRouter } from './routes/serviceAreaRoutes';
import { notificationRouter } from './routes/notificationRoutes';

export const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'AharLocal Food Delivery API',
    version: '1.0.0',
    time: new Date().toISOString()
  });
});

// Public platform settings (commissions, per-km rates, COD)
app.get('/api/settings', (req: Request, res: Response) => {
  const store = db.getStore();
  const settings = store.settings || {};
  res.json({
    success: true,
    data: {
      global_cod_enabled: settings.global_cod_enabled ?? 0,
      restaurant_commission_percent: Number(settings.restaurant_commission_percent ?? 15.0),
      delivery_partner_commission_percent: Number(settings.delivery_partner_commission_percent ?? 10.0),
      delivery_base_fare: Number(settings.delivery_base_fare ?? 25.0),
      delivery_base_distance_km: Number(settings.delivery_base_distance_km ?? 2.0),
      delivery_per_km_rate: Number(settings.delivery_per_km_rate ?? 10.0),
      min_delivery_fare: Number(settings.min_delivery_fare ?? 20.0)
    }
  });
});

// Public promotions & discount offers for customers and partners
app.get('/api/promotions', (req: Request, res: Response) => {
  const store = db.getStore();
  const promos = store.promotions || {};
  res.json({
    success: true,
    data: promos
  });
});

// Public food categories for customer filtering and restaurant menu addition
app.get('/api/categories', (req: Request, res: Response) => {
  const store = db.getStore();
  const cats = store.food_categories || [];
  res.json({
    success: true,
    data: cats
  });
});

// Calculate live distance & delivery fare between customer and restaurant
app.post('/api/location/calculate-fare', async (req: Request, res: Response) => {
  const { customerLat, customerLng, restaurantId, restaurantLat, restaurantLng } = req.body;
  if (!customerLat || !customerLng) {
    return res.status(400).json({ success: false, message: 'Customer coordinates required' });
  }

  let restLat = Number(restaurantLat);
  let restLng = Number(restaurantLng);
  let restName = 'Restaurant';

  if (restaurantId) {
    const store = db.getStore();
    const rest = store.restaurants.find((r: any) => r.id === Number(restaurantId));
    if (rest) {
      restLat = rest.latitude;
      restLng = rest.longitude;
      restName = rest.name;
    }
  }

  if (!restLat || !restLng) {
    return res.status(400).json({ success: false, message: 'Restaurant location required' });
  }

  const distanceKm = locationService.calculateDistanceKm(
    restLat,
    restLng,
    Number(customerLat),
    Number(customerLng)
  );

  const breakdown = await locationService.getDeliveryFareBreakdown(distanceKm);

  return res.json({
    success: true,
    data: {
      restaurantName: restName,
      restaurantLat: restLat,
      restaurantLng: restLng,
      customerLat: Number(customerLat),
      customerLng: Number(customerLng),
      ...breakdown
    }
  });
});


// Mount modular REST routes
app.use('/api/auth', authRouter);
app.use('/api/restaurants', restaurantRouter);
app.use('/api/orders', orderRouter);
app.use('/api/delivery', deliveryRouter);
app.use('/api/admin', adminRouter);
app.use('/api/coupons', couponRouter);
app.use('/api/service-areas', serviceAreaRouter);
app.use('/api/notifications', notificationRouter);

// Friendly 404 for unmatched API routes
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found (অনুরোধ করা এন্ডপয়েন্ট পাওয়া যায়নি)'
  });
});

// Centralized error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected error occurred. Please try again. (সাময়িক সমস্যা, অনুগ্রহ করে পুনরায় চেষ্টা করুন)'
  });
});
