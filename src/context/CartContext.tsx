import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, FoodItem, Restaurant } from '../types';
import { apiRequest } from '../services/api';

interface PlatformRates {
  baseFare: number;
  baseDistanceKm: number;
  perKmRate: number;
  minFare: number;
  restaurantCommissionPercent: number;
  deliveryPartnerCommissionPercent: number;
}

interface FareBreakdown {
  distanceKm: number;
  baseFare: number;
  baseDistanceKm: number;
  extraKm: number;
  perKmRate: number;
  totalFee: number;
  formulaText: string;
}

interface CartContextType {
  items: CartItem[];
  restaurant: Restaurant | null;
  deliveryAddress: string;
  deliveryLandmark: string;
  deliveryLat: number;
  deliveryLng: number;
  appliedCoupon: string | null;
  discountAmount: number;
  subtotal: number;
  deliveryFee: number;
  distanceKm: number;
  fareBreakdown: FareBreakdown | null;
  platformRates: PlatformRates;
  tax: number;
  grandTotal: number;
  totalQuantity: number;
  directRestaurantOnly: boolean;
  setDirectRestaurantOnly: (val: boolean) => void;
  addItem: (food: FoodItem, restaurant: Restaurant) => void;
  removeItem: (foodId: number) => void;
  updateQuantity: (foodId: number, delta: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  setDeliveryLocation: (address: string, lat: number, lng: number, landmark?: string) => void;
  detectLiveLocation: () => Promise<{ success: boolean; message: string; lat?: number; lng?: number }>;
  fetchPlatformRates: () => Promise<void>;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

// Helper for Haversine distance
const calculateHaversineDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
};

export const isFoodAvailable = (food?: FoodItem | null): boolean => {
  if (!food) return false;
  const avail = (food as any).is_available;
  if (avail === 0 || avail === '0' || avail === false || avail === null || avail === undefined) {
    return false;
  }
  return true;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('aharlocal_cart');
      const parsed: CartItem[] = saved ? JSON.parse(saved) : [];
      // Clean out any out-of-stock items saved in localStorage
      return parsed.filter((i) => isFoodAvailable(i.food));
    } catch {
      return [];
    }
  });

  const [restaurant, setRestaurant] = useState<Restaurant | null>(() => {
    try {
      const saved = localStorage.getItem('aharlocal_cart_rest');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Default delivery address (Ballygunge, Kolkata)
  const [deliveryAddress, setDeliveryAddress] = useState(
    'Flat 3B, Sunshine Heights, 14 Ballygunge Circular Road, Kolkata 700019'
  );
  const [deliveryLandmark, setDeliveryLandmark] = useState('Near Ballygunge Post Office');
  const [deliveryLat, setDeliveryLat] = useState(22.5292);
  const [deliveryLng, setDeliveryLng] = useState(88.3612);

  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Platform Commission & Fare rates from admin settings
  const [platformRates, setPlatformRates] = useState<PlatformRates>({
    baseFare: 25.0,
    baseDistanceKm: 2.0,
    perKmRate: 10.0,
    minFare: 20.0,
    restaurantCommissionPercent: 15.0,
    deliveryPartnerCommissionPercent: 10.0
  });

  const fetchPlatformRates = async () => {
    try {
      const res = await apiRequest('/api/settings');
      if (res) {
        setPlatformRates({
          baseFare: Number(res.delivery_base_fare ?? 25.0),
          baseDistanceKm: Number(res.delivery_base_distance_km ?? 2.0),
          perKmRate: Number(res.delivery_per_km_rate ?? 10.0),
          minFare: Number(res.min_delivery_fare ?? 20.0),
          restaurantCommissionPercent: Number(res.restaurant_commission_percent ?? 15.0),
          deliveryPartnerCommissionPercent: Number(res.delivery_partner_commission_percent ?? 10.0)
        });
      }
    } catch (e) {
      console.warn('Failed to fetch platform rates, using defaults:', e);
    }
  };

  useEffect(() => {
    fetchPlatformRates();
  }, []);


  // Toggle for Direct Specific Restaurant vs Smart Proximity Broadcast (Default = NO/false)
  const [directRestaurantOnly, setDirectRestaurantOnly] = useState(false);

  useEffect(() => {
    localStorage.setItem('aharlocal_cart', JSON.stringify(items));
    localStorage.setItem('aharlocal_cart_rest', JSON.stringify(restaurant));
  }, [items, restaurant]);

  const addItem = (food: FoodItem, rest: Restaurant) => {
    if (!isFoodAvailable(food)) {
      alert(`"${food.name || 'খাবারটি'}" বর্তমানে আউট অফ স্টক (স্টক শেষ) এবং কার্টে যোগ করা যাবে না।`);
      return;
    }

    if (rest && (rest.is_open === 0 || (rest.is_open as any) === '0' || (rest.is_open as any) === false)) {
      alert(`"${rest.name || 'রেস্তোরাঁটি'}" বর্তমানে অফলাইনে (বন্ধ) রয়েছে এবং নতুন অর্ডার গ্রহণ করছে না।`);
      return;
    }

    // Multi-restaurant support: items can come from different restaurants
    if (!restaurant) {
      setRestaurant(rest);
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.food.id === food.id);
      if (existing) {
        return prev.map((i) =>
          i.food.id === food.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { food, quantity: 1, restaurant: rest }];
    });
  };

  const removeItem = (foodId: number) => {
    setItems((prev) => {
      const updated = prev.filter((i) => i.food.id !== foodId);
      if (updated.length === 0) {
        setRestaurant(null);
        setAppliedCoupon(null);
        setDiscountAmount(0);
      }
      return updated;
    });
  };

  const updateQuantity = (foodId: number, delta: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.food.id === foodId);
      if (!existing) return prev;

      if (delta > 0 && !isFoodAvailable(existing.food)) {
        alert('This item is currently Out of Stock (স্টক শেষ) and cannot be increased.');
        return prev;
      }

      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        const next = prev.filter((i) => i.food.id !== foodId);
        if (next.length === 0) {
          setRestaurant(null);
          setAppliedCoupon(null);
          setDiscountAmount(0);
        }
        return next;
      }
      return prev.map((i) => (i.food.id === foodId ? { ...i, quantity: newQty } : i));
    });
  };

  const clearCart = () => {
    setItems([]);
    setRestaurant(null);
    setAppliedCoupon(null);
    setDiscountAmount(0);
  };

  const setDeliveryLocation = (address: string, lat: number, lng: number, landmark?: string) => {
    setDeliveryAddress(address);
    setDeliveryLat(lat);
    setDeliveryLng(lng);
    if (landmark) setDeliveryLandmark(landmark);
  };

  const detectLiveLocation = async (): Promise<{ success: boolean; message: string; lat?: number; lng?: number }> => {
    if (!navigator.geolocation) {
      return { success: false, message: 'GPS Geolocation is not supported by your device' };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setDeliveryLat(lat);
          setDeliveryLng(lng);
          setDeliveryAddress(`Current Live Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          resolve({
            success: true,
            message: 'Live GPS location updated successfully',
            lat,
            lng
          });
        },
        (error) => {
          resolve({
            success: false,
            message: error.message || 'Unable to retrieve GPS coordinates'
          });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const subtotal = items.reduce((sum, item) => {
    const price = item.food.discount_price ? item.food.discount_price : item.food.price;
    return sum + price * item.quantity;
  }, 0);

  // Dynamic distance calculation from customer location to restaurant
  const distanceKm = (restaurant && restaurant.latitude && restaurant.longitude && deliveryLat && deliveryLng)
    ? calculateHaversineDistanceKm(restaurant.latitude, restaurant.longitude, deliveryLat, deliveryLng)
    : 0;

  // Calculate fare breakdown using admin configured per-km rates
  const baseFare = platformRates.baseFare || 25;
  const baseDistanceKm = platformRates.baseDistanceKm || 2.0;
  const perKmRate = platformRates.perKmRate || 10;
  const minFare = platformRates.minFare || 20;

  const extraKm = Math.max(0, parseFloat((distanceKm - baseDistanceKm).toFixed(2)));
  let calculatedDeliveryFee = 0;

  if (items.length > 0) {
    if (distanceKm <= baseDistanceKm) {
      calculatedDeliveryFee = Math.max(minFare, baseFare);
    } else {
      calculatedDeliveryFee = Math.max(minFare, Math.round(baseFare + extraKm * perKmRate));
    }
  }

  const deliveryFee = calculatedDeliveryFee;

  const fareBreakdown: FareBreakdown | null = items.length > 0 ? {
    distanceKm,
    baseFare,
    baseDistanceKm,
    extraKm,
    perKmRate,
    totalFee: deliveryFee,
    formulaText: distanceKm <= baseDistanceKm
      ? `₹${baseFare} base fare (up to ${baseDistanceKm} km)`
      : `₹${baseFare} base (${baseDistanceKm} km) + ${extraKm} km @ ₹${perKmRate}/km = ₹${deliveryFee}`
  } : null;

  const tax = Math.round((subtotal * 0.05) * 100) / 100;
  const grandTotal = Math.max(0, Math.round(subtotal + deliveryFee - discountAmount + tax));
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);


  const applyCoupon = async (code: string) => {
    try {
      const data = await apiRequest('/api/coupons/apply', {
        method: 'POST',
        body: JSON.stringify({ code, subtotal, restaurant_id: restaurant?.id })
      });
      setAppliedCoupon(data.code);
      setDiscountAmount(data.discount);
      return { success: true, message: data.message || `Coupon applied: Saved ₹${data.discount}` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Invalid coupon' };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        restaurant,
        deliveryAddress,
        deliveryLandmark,
        deliveryLat,
        deliveryLng,
        appliedCoupon,
        discountAmount,
        subtotal,
        deliveryFee,
        distanceKm,
        fareBreakdown,
        platformRates,
        tax,
        grandTotal,
        totalQuantity,
        directRestaurantOnly,
        setDirectRestaurantOnly,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        applyCoupon,
        removeCoupon,
        setDeliveryLocation,
        detectLiveLocation,
        fetchPlatformRates
      }}
    >

      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
