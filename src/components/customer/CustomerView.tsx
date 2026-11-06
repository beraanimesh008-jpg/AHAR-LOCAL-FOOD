import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Crosshair,
  Search,
  Star,
  Clock,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  TrendingUp,
  Tag,
  CheckCircle,
  AlertTriangle,
  History,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  X,
  UtensilsCrossed,
  Store
} from 'lucide-react';
import { Restaurant, FoodItem, Order } from '../../types';
import { apiRequest } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { useCart, isFoodAvailable } from '../../context/CartContext';
import { RestaurantDetailsModal } from './RestaurantDetailsModal';
import { CartSlideover } from './CartSlideover';
import { LiveTrackingModal } from './LiveTrackingModal';
import { LocationPickerMap } from '../maps/LocationPickerMap';

export const CustomerView: React.FC = () => {
  const { language, t } = useLanguage();
  const { deliveryAddress, deliveryLat, deliveryLng, setDeliveryLocation, totalQuantity, addItem, items, updateQuantity, grandTotal } = useCart();
  const [cartToast, setCartToast] = useState<string | null>(null);

  const [isLocationServiceable, setIsLocationServiceable] = useState(true);
  const [serviceAreaBanner, setServiceAreaBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!deliveryLat || !deliveryLng) return;
    apiRequest('/api/service-areas/validate-location', {
      method: 'POST',
      body: JSON.stringify({ lat: deliveryLat, lng: deliveryLng })
    })
      .then((res) => {
        if (res && res.data) {
          setIsLocationServiceable(res.data.isServiceable);
          if (!res.data.isServiceable) {
            setServiceAreaBanner('⚠️ নট সার্ভিসএবল (Not Serviceable): এই স্থানটি আমাদের সার্ভিস সীমানার বাইরে! অনুগ্রহ করে সীমানার ভেতরের ঠিকানা নির্বাচন করুন।');
          } else {
            setServiceAreaBanner(null);
          }
        }
      })
      .catch((e) => {
        console.warn('Validate location error:', e);
      });
  }, [deliveryLat, deliveryLng]);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [allFoodsList, setAllFoodsList] = useState<{ food: FoodItem; restaurant: Restaurant }[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilterType, setSearchFilterType] = useState<'all' | 'foods' | 'restaurants'>('all');
  const [vegOnly, setVegOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Active / selected restaurant for detail modal
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  // Active order tracking
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [trackingOrderId, setTrackingOrderId] = useState<number | null>(null);

  // Cart slideover
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Address picker modal
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [locationAlert, setLocationAlert] = useState<string | null>(null);

  // View tabs: 'home' | 'active_restaurants' | 'orders'
  const [activeTab, setActiveTab] = useState<'home' | 'active_restaurants' | 'orders'>('home');
  const [pastOrders, setPastOrders] = useState<Order[]>([]);

  // Sliding Carousel Ref & Helper for Nearby Restaurants
  const restaurantScrollRef = React.useRef<HTMLDivElement>(null);

  const scrollRestaurants = (direction: 'left' | 'right') => {
    if (restaurantScrollRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      restaurantScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const fetchRestaurants = async () => {
    try {
      const latQuery = deliveryLat ? `&lat=${deliveryLat}` : '';
      const lngQuery = deliveryLng ? `&lng=${deliveryLng}` : '';
      const data = await apiRequest(`/api/restaurants?vegOnly=${vegOnly}&search=${encodeURIComponent(searchQuery)}${latQuery}${lngQuery}`);
      setRestaurants(data);
    } catch (e) {
      console.error('Fetch restaurants error:', e);
    }
  };

  const fetchAllFoods = async () => {
    try {
      const res = await apiRequest('/api/restaurants/all-foods');
      setAllFoodsList(res || []);
    } catch (e) {
      console.error('Fetch all foods error:', e);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiRequest('/api/categories');
      setCategoriesList(res || []);
    } catch (e) {
      console.error('Fetch categories error:', e);
    }
  };

  const fetchOrders = async () => {
    try {
      const orders: Order[] = await apiRequest('/api/orders');
      const active = orders.filter((o) =>
        ['pending', 'accepted', 'preparing', 'ready', 'assigned', 'picked_up', 'on_the_way'].includes(o.status)
      );
      setActiveOrders(active);
      setPastOrders(orders);
    } catch (e) {
      console.error('Fetch orders error:', e);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchRestaurants(), fetchOrders(), fetchAllFoods(), fetchCategories()]).finally(() => setIsLoading(false));
  }, [vegOnly, searchQuery, deliveryLat, deliveryLng]);

  const filteredFoods = allFoodsList.filter(({ food, restaurant: foodRest }) => {
    if (vegOnly && food.is_veg !== 1) return false;

    if (searchQuery.trim()) {
      const rawQ = searchQuery.toLowerCase().trim();
      const qTokens = rawQ.split(/\s+/).filter(Boolean);

      const foodName = (food.name || '').toLowerCase();
      const foodNameBn = (food.name_bn || '').toLowerCase();
      const foodCat = (food.category || '').toLowerCase();
      const foodDesc = (food.description || '').toLowerCase();
      const restName = (foodRest.name || '').toLowerCase();
      const restNameBn = (foodRest.name_bn || '').toLowerCase();
      const restAddress = (foodRest.address || '').toLowerCase();

      const matches = qTokens.some((token) =>
        foodName.includes(token) ||
        foodNameBn.includes(token) ||
        foodCat.includes(token) ||
        foodDesc.includes(token) ||
        restName.includes(token) ||
        restNameBn.includes(token) ||
        restAddress.includes(token) ||
        (token.includes('bir') && (foodName.includes('biryani') || foodCat.includes('rice'))) ||
        (token.includes('chic') && (foodName.includes('chicken') || foodDesc.includes('chicken'))) ||
        (token.includes('roll') && (foodName.includes('roll') || foodCat.includes('starter'))) ||
        (token.includes('sweet') && (foodName.includes('sweet') || foodName.includes('misti') || foodCat.includes('sweet'))) ||
        (token.includes('misti') && (foodName.includes('sweet') || foodName.includes('misti') || foodCat.includes('sweet'))) ||
        (token.includes('chaap') && foodName.includes('chaap')) ||
        (token.includes('roti') && (foodName.includes('roti') || foodName.includes('bread'))) ||
        (token.includes('drink') && (foodCat.includes('beverage') || foodName.includes('coke') || foodName.includes('drink')))
      );
      if (!matches) return false;
      return true;
    }

    if (selectedCategory === 'All') return true;
    const catTarget = selectedCategory.toLowerCase();
    const catLower = (food.category || '').toLowerCase();
    const catBnLower = ((food as any).category_bn || '').toLowerCase();
    const nameLower = (food.name || '').toLowerCase();

    return (
      catLower === catTarget ||
      catLower.includes(catTarget) ||
      catBnLower.includes(catTarget) ||
      nameLower.includes(catTarget) ||
      (catTarget === 'sweets' && (catLower.includes('sweet') || nameLower.includes('sweet') || nameLower.includes('misti') || nameLower.includes('rosogolla') || nameLower.includes('gulab') || nameLower.includes('dessert') || nameLower.includes('doi') || nameLower.includes('sandesh') || nameLower.includes('rasmalai') || nameLower.includes('barfi'))) ||
      (catTarget === 'beverages' && (catLower.includes('drink') || catLower.includes('beverage') || nameLower.includes('cold') || nameLower.includes('lassi') || nameLower.includes('juice') || nameLower.includes('chai') || nameLower.includes('tea') || nameLower.includes('milk') || nameLower.includes('coffee') || nameLower.includes('coke') || nameLower.includes('sprite'))) ||
      (catTarget === 'breads' && (catLower.includes('bread') || nameLower.includes('naan') || nameLower.includes('roti') || nameLower.includes('paratha') || nameLower.includes('kulcha'))) ||
      (catTarget === 'starters' && (catLower.includes('starter') || catLower.includes('snack') || nameLower.includes('roll') || nameLower.includes('fry') || nameLower.includes('pakhoda') || nameLower.includes('chaap') || nameLower.includes('tikka') || nameLower.includes('kochuri'))) ||
      (catTarget === 'rice' && (catLower.includes('rice') || catLower.includes('biryani') || nameLower.includes('biryani') || nameLower.includes('pulao') || nameLower.includes('thali')))
    );
  });

  const handleOpenRestaurant = async (rest: Restaurant) => {
    try {
      const full = await apiRequest(`/api/restaurants/${rest.id}`);
      setSelectedRestaurant(full);
    } catch {
      setSelectedRestaurant(rest);
    }
  };

  // GPS Request - ONLY requested on explicit user tap
  const handleRequestGPS = () => {
    setLocationAlert(null);
    if (!navigator.geolocation) {
      setLocationAlert('Geolocation is not supported by your browser. Please select address manually.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setDeliveryLocation(`Near Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`, latitude, longitude);
        setLocationAlert('Location detected via device GPS!');
      },
      (err) => {
        setLocationAlert(
          'Location permission was denied or unavailable. You can easily pick your delivery location on Google Maps.'
        );
        setIsAddressModalOpen(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* Top Location Header Bar */}
      <div className="bg-white border-b border-stone-200 py-2.5 px-4 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isLocationServiceable ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1">
                <span>{t('location.delivering_to')}</span>
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${isLocationServiceable ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
                {!isLocationServiceable && (
                  <span className="bg-red-600 text-white text-[9px] font-black uppercase px-1.5 py-0.2 rounded">Not Serviceable</span>
                )}
              </div>
              <div
                onClick={() => setIsAddressModalOpen(true)}
                className="text-xs font-extrabold text-stone-900 truncate hover:text-orange-600 cursor-pointer flex items-center gap-1"
                title="Change delivery address"
              >
                <span className="truncate">{deliveryAddress}</span>
                <span className="text-[10px] text-orange-600 underline font-semibold shrink-0">Change</span>
              </div>
            </div>
          </div>

          {/* GPS Detector button & Header Cart button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRequestGPS}
              className="flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>{t('location.detect')}</span>
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white px-3.5 py-1.5 rounded-full text-xs font-black shadow-sm transition-all cursor-pointer active:scale-95"
              title="Open Shopping Cart"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Cart (কার্ট)</span>
              {totalQuantity > 0 ? (
                <span className="bg-white text-orange-700 font-extrabold text-[10px] px-1.5 py-0.2 rounded-full shadow-2xs">
                  {totalQuantity}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {/* Location Notice / Feedback */}
        {locationAlert && (
          <div className="max-w-7xl mx-auto mt-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{locationAlert}</span>
            </div>
            <button
              onClick={() => setLocationAlert(null)}
              className="text-amber-800 font-bold ml-2 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Not Serviceable Warning Banner */}
      {serviceAreaBanner && (
        <div className="bg-red-600 text-white text-xs font-bold py-2.5 px-4 shadow-md flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2 max-w-7xl mx-auto">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-300 shrink-0" />
            <span className="leading-snug">{serviceAreaBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsAddressModalOpen(true)}
            className="bg-white text-red-700 px-3 py-1 rounded-xl text-xs font-black shrink-0 hover:bg-amber-100 cursor-pointer shadow-sm transition-all"
          >
            ম্যাপে ঠিকানা বদলান →
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2 flex-wrap">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-200'
            }`}
          >
            {t('nav.home')}
          </button>

          {/* Active Online Restaurants Menu Tab */}
          <button
            onClick={() => setActiveTab('active_restaurants')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'active_restaurants'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-200'
            }`}
          >
            <span>Active Restaurants Menu (অনলাইন রেস্তোরাঁ)</span>
            <span className="bg-emerald-500 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">
              {restaurants.filter((r) => r.is_open === 1 && r.status === 'approved').length} Online
            </span>
          </button>

          {/* Dedicated Cart Menu Tab before placing order */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="px-4 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1.5 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white shadow-sm hover:opacity-95 cursor-pointer active:scale-95"
            title="View items in cart before placing order"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>🛒 My Cart (কার্ট মেনু)</span>
            {totalQuantity > 0 ? (
              <span className="bg-white text-orange-700 font-extrabold text-[10px] px-2 py-0.2 rounded-full animate-bounce">
                {totalQuantity} Items
              </span>
            ) : (
              <span className="bg-white/20 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                0
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('orders');
              fetchOrders();
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-200'
            }`}
          >
            <span>{t('nav.orders')}</span>
            {activeOrders.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Active Order Banner (Sticky prompt if customer has food on the way) */}
        {activeOrders.length > 0 && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-4 shadow-xl flex items-center justify-between gap-4 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shrink-0">
                🛵
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                    Active Delivery
                  </span>
                  <span className="text-xs font-semibold opacity-90">
                    {activeOrders[0].order_number}
                  </span>
                </div>
                <h4 className="font-extrabold text-base leading-tight mt-0.5">
                  {t(`order.status.${activeOrders[0].status}`)} • {activeOrders[0].restaurant_name}
                </h4>
                <p className="text-xs text-emerald-100">
                  Estimated arrival in {activeOrders[0].estimated_delivery_time || '20 mins'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setTrackingOrderId(activeOrders[0].id)}
              className="bg-white text-emerald-800 hover:bg-emerald-50 font-extrabold text-xs px-4 py-2.5 rounded-2xl shadow-md whitespace-nowrap shrink-0 transition-transform active:scale-95"
            >
              Track on Map →
            </button>
          </div>
        )}

        {activeTab === 'home' ? (
          <>
            {/* Search Bar + Veg Filter */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                <input
                  type="text"
                  placeholder={language === 'bn' ? 'রেস্তোরাঁ বা খাবারের নাম খুঁজুন (e.g. Biryani, Burger, Sweets)...' : 'Search for restaurants, biryani, pizza, sweets, drinks...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-white border border-stone-200 rounded-2xl text-xs sm:text-sm font-medium shadow-2xs focus:outline-hidden focus:border-orange-500 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 p-0.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setVegOnly(!vegOnly)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                  vegOnly
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${vegOnly ? 'bg-white' : 'bg-emerald-600'}`}
                />
                <span>Pure Veg</span>
              </button>
            </div>

            {/* Cart Added Toast Notification */}
            {cartToast && (
              <div className="bg-emerald-600 text-white p-3 rounded-2xl shadow-xl font-bold text-xs flex items-center justify-between animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-200 shrink-0" />
                  <span>{cartToast}</span>
                </div>
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="bg-white text-emerald-800 font-extrabold text-xs px-3 py-1 rounded-xl shadow-xs cursor-pointer hover:bg-emerald-50"
                >
                  View Cart →
                </button>
              </div>
            )}

            {/* SEARCH ACTIVE VIEW: Search Results for Food Items & Restaurants */}
            {searchQuery.trim() ? (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Search Meta & Filter Sub-Tabs */}
                <div className="bg-stone-100/90 rounded-2xl p-3 sm:p-4 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">Search Results For</div>
                    <div className="text-base font-black text-stone-900 flex items-center gap-2 mt-0.5">
                      <span>"{searchQuery}"</span>
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-xs font-bold text-orange-600 hover:underline cursor-pointer"
                      >
                        (Clear)
                      </button>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSearchFilterType('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        searchFilterType === 'all'
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
                      }`}
                    >
                      All Results ({filteredFoods.length + restaurants.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchFilterType('foods')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        searchFilterType === 'foods'
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
                      }`}
                    >
                      <span>🍛 Dishes & Foods</span>
                      <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[10px]">{filteredFoods.length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchFilterType('restaurants')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        searchFilterType === 'restaurants'
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
                      }`}
                    >
                      <span>🏬 Restaurants</span>
                      <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[10px]">{restaurants.length}</span>
                    </button>
                  </div>
                </div>

                {/* No Results Fallback */}
                {filteredFoods.length === 0 && restaurants.length === 0 && (
                  <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 shadow-2xs space-y-4">
                    <div className="text-4xl">🔍</div>
                    <div>
                      <h4 className="font-extrabold text-stone-900 text-base">
                        {language === 'bn' ? `"${searchQuery}" এর জন্য কোনো খাবার বা রেস্তোরাঁ পাওয়া যায়নি` : `No foods or restaurants found for "${searchQuery}"`}
                      </h4>
                      <p className="text-xs text-stone-500 mt-1">
                        Try searching for popular local dishes or ingredients:
                      </p>
                    </div>

                    {/* Suggestion Chips */}
                    <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
                      {['Biryani', 'Chicken Roll', 'Egg Roll', 'Bengali Thali', 'Sweets & Rosogolla', 'Cold Drinks', 'Chai & Snacks'].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setSearchQuery(tag)}
                          className="px-3.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200 cursor-pointer transition-all active:scale-95"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 1. MATCHED FOOD DISHES LIST */}
                {(searchFilterType === 'all' || searchFilterType === 'foods') && filteredFoods.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                        <span>🍛 Matching Food Items ({filteredFoods.length})</span>
                      </h3>
                      <span className="text-xs font-bold text-stone-500">
                        খাবার কার্টে যোগ করুন বা রেস্তোরাঁ দেখুন
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredFoods.map(({ food, restaurant: foodRest }) => {
                        const finalPrice = food.discount_price || food.price;
                        const isStoreClosed = foodRest.is_open === 0 || (foodRest.is_open as any) === '0' || (foodRest.is_open as any) === false;
                        const isItemStockOut = !isFoodAvailable(food);
                        const isOutOfStock = isItemStockOut || isStoreClosed;
                        const cartItem = items.find((i) => i.food.id === food.id);
                        const qty = cartItem ? cartItem.quantity : 0;

                        return (
                          <div
                            key={`search-${foodRest.id}-${food.id}`}
                            onClick={() => handleOpenRestaurant(foodRest)}
                            className={`bg-white rounded-3xl p-3.5 border transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                              isOutOfStock
                                ? 'border-stone-200 bg-stone-50/70 opacity-85'
                                : 'border-stone-200 hover:border-orange-400 hover:shadow-md'
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="relative shrink-0">
                                <img
                                  src={food.photo_url}
                                  alt={food.name}
                                  className={`w-16 h-16 rounded-2xl object-cover border border-stone-200 shadow-2xs group-hover:scale-105 transition-transform ${
                                    isOutOfStock ? 'grayscale-40' : ''
                                  }`}
                                />
                                <span
                                  className={`absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                    food.is_veg ? 'bg-emerald-600' : 'bg-red-600'
                                  }`}
                                  title={food.is_veg ? 'Pure Veg' : 'Non-Veg'}
                                />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm truncate leading-tight group-hover:text-orange-600 transition-colors">
                                    {language === 'bn' ? food.name_bn || food.name : food.name}
                                  </h4>

                                  {/* Stock Point Indicator */}
                                  {!isOutOfStock ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300 shrink-0">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                      <span>{language === 'bn' ? 'স্টকে আছে' : 'In Stock'}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                                      <span className="w-2 h-2 rounded-full bg-rose-600" />
                                      <span>{language === 'bn' ? 'স্টক শেষ' : 'Out of Stock'}</span>
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] font-medium text-stone-500 truncate mt-0.5 flex items-center gap-1">
                                  <span>From:</span>
                                  <span className="font-bold text-stone-800 hover:underline">{foodRest.name}</span>
                                </div>

                                <div className="text-xs font-black text-orange-600 font-mono mt-1 flex items-center gap-1.5">
                                  <span>₹{finalPrice}</span>
                                  {food.discount_price && (
                                    <span className="text-[10px] text-stone-400 line-through font-normal">
                                      ₹{food.price}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-semibold text-stone-400 bg-stone-100 px-1.5 py-0.2 rounded-md">
                                    {food.category}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            {isStoreClosed ? (
                              <button
                                type="button"
                                disabled
                                className="bg-stone-200 text-stone-600 font-bold text-xs px-3.5 py-2.5 rounded-2xl shrink-0 cursor-not-allowed border border-stone-300 flex items-center gap-1.5"
                              >
                                <span className="w-2 h-2 rounded-full bg-stone-500" />
                                <span>দোকান বন্ধ</span>
                              </button>
                            ) : isOutOfStock ? (
                              <button
                                type="button"
                                disabled
                                className="bg-rose-100 text-rose-800 font-bold text-xs px-3.5 py-2.5 rounded-2xl shrink-0 cursor-not-allowed border border-rose-300 flex items-center gap-1.5 shadow-2xs"
                              >
                                <span className="w-2 h-2 rounded-full bg-rose-600" />
                                <span>স্টক শেষ (Out of Stock)</span>
                              </button>
                            ) : qty > 0 ? (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 bg-orange-600 text-white rounded-2xl px-2.5 py-1.5 shadow-sm shrink-0"
                              >
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(food.id, -1)}
                                  className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-extrabold text-xs cursor-pointer active:scale-95"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-xs font-black w-4 text-center">{qty}</span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(food.id, 1)}
                                  className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-extrabold text-xs cursor-pointer active:scale-95"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addItem(food, foodRest);
                                  setCartToast(`✓ ${food.name} (₹${finalPrice}) অর্ডারে যোগ করা হলো!`);
                                  setTimeout(() => setCartToast(null), 3000);
                                }}
                                className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-2xl shadow-sm shrink-0 transition-transform active:scale-95 cursor-pointer flex items-center gap-1"
                              >
                                <span>+ Add to Cart</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. MATCHED RESTAURANTS LIST */}
                {(searchFilterType === 'all' || searchFilterType === 'restaurants') && restaurants.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                        <span>🏬 Matching Restaurants ({restaurants.length})</span>
                      </h3>
                      <span className="text-xs font-bold text-stone-500">রেস্তোরাঁয় ক্লিক করে সম্পূর্ণ মেনু দেখুন</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {restaurants.map((rest) => (
                        <div
                          key={`search-rest-${rest.id}`}
                          onClick={() => handleOpenRestaurant(rest)}
                          className={`bg-white rounded-3xl border border-stone-200 shadow-2xs hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer overflow-hidden flex flex-col group ${
                            rest.is_open === 0 ? 'opacity-90' : ''
                          }`}
                        >
                          <div className="relative h-36 w-full bg-stone-100 overflow-hidden">
                            <img
                              src={rest.photo_url}
                              alt={rest.name}
                              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                                rest.is_open === 0 ? 'grayscale-30' : ''
                              }`}
                            />
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                              <span className="bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-black text-stone-900 shadow-xs flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                {rest.rating}
                              </span>
                              {rest.is_open === 1 ? (
                                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-lg text-[9px] font-black shadow-xs">
                                  ONLINE
                                </span>
                              ) : (
                                <span className="bg-stone-800 text-stone-200 px-2 py-0.5 rounded-lg text-[9px] font-black shadow-xs">
                                  OFFLINE
                                </span>
                              )}
                            </div>
                            <div className="absolute bottom-2.5 right-2.5 bg-stone-900/80 backdrop-blur-md text-white px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-orange-400" />
                              <span>{rest.is_open === 1 ? `${rest.avg_delivery_minutes} mins` : 'Closed'}</span>
                            </div>
                          </div>

                          <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                            <div>
                              <h4 className="font-extrabold text-stone-900 text-sm group-hover:text-orange-600 transition-colors truncate">
                                {language === 'bn' ? rest.name_bn || rest.name : rest.name}
                              </h4>
                              <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                                {rest.address}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                              <div className="flex items-center gap-1 text-stone-600 font-semibold truncate max-w-[150px]">
                                <Tag className="w-3 h-3 text-orange-500 shrink-0" />
                                <span className="truncate text-[11px]">
                                  {rest.cuisine_types ? rest.cuisine_types.join(', ') : 'Local Food'}
                                </span>
                              </div>
                              <span className="text-[11px] font-bold text-orange-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                                View Menu →
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* DEFAULT HOME VIEW: Offers Carousel, Nearby Stores Carousel & Menu Feed */
              <>
                {/* Promotional Offers Carousel */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-4 text-white shadow-md flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                        CODE: PROTHOM50
                      </span>
                      <h3 className="text-lg font-black mt-1 leading-tight">
                        {language === 'bn' ? 'প্রথম অর্ডারে ৫০% ছাড়!' : '50% OFF on 1st Order'}
                      </h3>
                      <p className="text-xs text-orange-100 mt-0.5">Up to ₹100 off on tasty local meals</p>
                    </div>
                    <div className="text-4xl">🍛</div>
                  </div>

                  <div className="bg-gradient-to-r from-red-600 to-rose-500 rounded-3xl p-4 text-white shadow-md flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                        CODE: AHARLOCAL
                      </span>
                      <h3 className="text-lg font-black mt-1 leading-tight">
                        {language === 'bn' ? 'ফ্ল্যাট ৪০ টাকা ছাড়!' : 'Flat ₹40 Local Discount'}
                      </h3>
                      <p className="text-xs text-rose-100 mt-0.5">On Biryani, Sweets & Bengali Thali</p>
                    </div>
                    <div className="text-4xl">🛵</div>
                  </div>
                </div>

                {/* SECTION 1: Nearby Restaurants Horizontal Sliding Carousel */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-stone-900 tracking-tight">
                        {language === 'bn' ? 'কাছের সেরা রেস্তোরাঁ' : 'Nearby Restaurants'}
                      </h3>
                      <p className="text-xs text-stone-600">Fresh local food prepared and delivered fast</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-600 bg-stone-100 px-2.5 py-1 rounded-full hidden sm:inline-block">
                        {restaurants.length} Stores ({restaurants.filter((r) => r.is_open === 1).length} Online)
                      </span>

                      {/* Carousel Slide Left / Right Arrows */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => scrollRestaurants('left')}
                          className="w-8 h-8 rounded-full bg-white border border-stone-200 text-stone-700 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                          title="Slide Left"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollRestaurants('right')}
                          className="w-8 h-8 rounded-full bg-white border border-stone-200 text-stone-700 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                          title="Slide Right"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex gap-4 overflow-hidden">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-[280px] sm:w-[320px] h-64 bg-stone-200/70 rounded-3xl animate-pulse shrink-0" />
                      ))}
                    </div>
                  ) : restaurants.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 text-center border border-stone-200">
                      <div className="text-4xl mb-2">🍽️</div>
                      <h4 className="font-bold text-stone-800 text-base">No restaurants found</h4>
                      <p className="text-xs text-stone-600 mt-1">Try clearing filters or search another cuisine.</p>
                    </div>
                  ) : (
                    <div
                      ref={restaurantScrollRef}
                      className="flex items-center gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x snap-mandatory scroll-smooth"
                    >
                      {restaurants.map((rest) => (
                        <div
                          key={rest.id}
                          onClick={() => handleOpenRestaurant(rest)}
                          className={`w-[280px] sm:w-[320px] bg-white rounded-3xl border border-stone-200 shadow-2xs hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer overflow-hidden flex flex-col group shrink-0 snap-start ${
                            rest.is_open === 0 ? 'opacity-90' : ''
                          }`}
                        >
                          {/* Photo Banner */}
                          <div className="relative h-44 w-full bg-stone-100 overflow-hidden">
                            <img
                              src={rest.photo_url}
                              alt={rest.name}
                              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                                rest.is_open === 0 ? 'grayscale-30' : ''
                              }`}
                            />
                            <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                              {rest.display_rank && rest.display_rank <= 5 ? (
                                <span className="bg-amber-400 text-purple-950 font-black px-2 py-0.5 rounded-lg text-[10px] shadow-sm flex items-center gap-1">
                                  <span>{rest.display_rank === 1 ? '🏆 #1 Top' : rest.display_rank === 2 ? '🥈 #2 Pick' : rest.display_rank === 3 ? '🥉 #3 Pick' : `#${rest.display_rank} Choice`}</span>
                                </span>
                              ) : null}
                              <span className="bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-lg text-[11px] font-black text-stone-900 shadow-xs flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                {rest.rating}
                              </span>
                              {rest.is_open === 1 ? (
                                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-black shadow-xs flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  <span>ONLINE</span>
                                </span>
                              ) : (
                                <span className="bg-stone-800 text-stone-200 px-2 py-0.5 rounded-lg text-[10px] font-black shadow-xs flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                  <span>OFFLINE</span>
                                </span>
                              )}
                              {rest.is_pure_veg === 1 && (
                                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-xs">
                                  Pure Veg
                                </span>
                              )}
                            </div>
                            <div className="absolute bottom-3 right-3 bg-stone-900/80 backdrop-blur-md text-white px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-orange-400" />
                              <span>{rest.is_open === 1 ? `${rest.avg_delivery_minutes} mins` : 'Closed'}</span>
                            </div>
                          </div>

                          {/* Info */}
                          <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                            <div>
                              <h4 className="font-extrabold text-stone-900 text-sm sm:text-base group-hover:text-orange-600 transition-colors truncate">
                                {language === 'bn' ? rest.name_bn || rest.name : rest.name}
                              </h4>
                              <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                                {rest.address}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                              <div className="flex items-center gap-1 text-stone-600 font-semibold truncate max-w-[180px]">
                                <Tag className="w-3 h-3 text-orange-500 shrink-0" />
                                <span className="truncate">
                                  {rest.cuisine_types ? rest.cuisine_types.join(', ') : 'Bengali, Fast Food'}
                                </span>
                              </div>
                              <span className="text-[11px] font-bold text-orange-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                                Menu →
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SECTION 2: Category Chips List (Positioned below Nearby Restaurants) */}
                <div className="space-y-3 pt-4 border-t border-stone-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-stone-900 tracking-tight">
                        {language === 'bn' ? 'খাবারের ক্যাটাগরি সমূহ' : 'Explore Menu Categories'}
                      </h3>
                      <p className="text-xs text-stone-600">
                        {language === 'bn' ? 'পছন্দের ক্যাটাগরিতে ক্লিক করে তাজা খাবার বেছে নিন' : 'Filter delicious items by category'}
                      </p>
                    </div>
                  </div>

                  {/* Food Category Chips Bar */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none">
                    {/* All option */}
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('All')}
                      className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all cursor-pointer border shadow-2xs flex items-center gap-1.5 ${
                        selectedCategory === 'All'
                          ? 'bg-orange-600 text-white border-orange-600 shadow-md'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <span>⭐</span>
                      <span>{language === 'bn' ? 'সকল খাবার (All)' : 'All Dishes'}</span>
                    </button>

                    {/* Dynamic categories from backend or fallback */}
                    {(categoriesList.length > 0
                      ? categoriesList.filter((c) => c.is_active !== 0)
                      : [
                          { id: 1, name: 'Sweets', name_bn: 'মিষ্টি ও ডেজার্ট', icon: '🍰' },
                          { id: 2, name: 'Beverages', name_bn: 'পানীয় ও কোল্ড ড্রিঙ্কস', icon: '🥤' },
                          { id: 3, name: 'Breads', name_bn: 'রুটি ও নান', icon: '🫓' },
                          { id: 4, name: 'Starters', name_bn: 'স্ন্যাক্স ও স্টার্টার', icon: '🍟' },
                          { id: 5, name: 'Rice', name_bn: 'বিরিয়ানি ও রাইস', icon: '🍚' },
                          { id: 6, name: 'Main Course', name_bn: 'মূল খাবার কারি', icon: '🍲' }
                        ]
                    ).map((cat: any) => {
                      const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                      return (
                        <button
                          key={cat.id || cat.name}
                          type="button"
                          onClick={() => setSelectedCategory(cat.name)}
                          className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all cursor-pointer border shadow-2xs flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-orange-600 text-white border-orange-600 shadow-md'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <span>{cat.icon || '🍽️'}</span>
                          <span>{language === 'bn' ? cat.name_bn || cat.name : cat.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* SECTION 3: List-Wise Food Items Feed (Photo, Price, Store & Add to Cart) */}
                  {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 bg-stone-200/70 rounded-3xl animate-pulse" />
                      ))}
                    </div>
                  ) : filteredFoods.length > 0 ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-stone-700 pt-1">
                        <span>
                          {selectedCategory === 'All'
                            ? 'All Listed Items (সব খাবার ছবি ও মূল্য সহ)'
                            : `${selectedCategory} Items`}
                        </span>
                        <span className="text-[11px] font-extrabold text-orange-700 bg-orange-100 px-2.5 py-0.5 rounded-full">
                          {filteredFoods.length} Items Listed
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredFoods.map(({ food, restaurant: foodRest }) => {
                          const finalPrice = food.discount_price || food.price;
                          const isStoreClosed = foodRest.is_open === 0 || (foodRest.is_open as any) === '0' || (foodRest.is_open as any) === false;
                          const isItemStockOut = !isFoodAvailable(food);
                          const isOutOfStock = isItemStockOut || isStoreClosed;
                          const cartItem = items.find((i) => i.food.id === food.id);
                          const qty = cartItem ? cartItem.quantity : 0;

                          return (
                            <div
                              key={`${foodRest.id}-${food.id}`}
                              onClick={() => handleOpenRestaurant(foodRest)}
                              className={`bg-white rounded-3xl p-3.5 border transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                                isOutOfStock
                                  ? 'border-stone-200 bg-stone-50/70 opacity-80'
                                  : 'border-stone-200 hover:border-orange-400 hover:shadow-md'
                              }`}
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="relative shrink-0">
                                  <img
                                    src={food.photo_url}
                                    alt={food.name}
                                    className={`w-16 h-16 rounded-2xl object-cover border border-stone-200 shadow-2xs group-hover:scale-105 transition-transform ${
                                      isOutOfStock ? 'grayscale-40' : ''
                                    }`}
                                  />
                                  <span
                                    className={`absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                      food.is_veg ? 'bg-emerald-600' : 'bg-red-600'
                                    }`}
                                    title={food.is_veg ? 'Pure Veg' : 'Non-Veg'}
                                  />
                                  {/* Stock Indicator Point on Image */}
                                  {!isOutOfStock ? (
                                    <span
                                      className="absolute -bottom-1 -right-1 flex items-center gap-1 bg-white/95 backdrop-blur-xs px-1.5 py-0.5 rounded-md text-[8px] font-black text-emerald-800 shadow-2xs border border-emerald-300"
                                      title="In Stock (স্টকে আছে)"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      <span className="hidden sm:inline">In Stock</span>
                                    </span>
                                  ) : (
                                    <span
                                      className="absolute -bottom-1 -right-1 flex items-center gap-1 bg-rose-600 text-white px-1.5 py-0.5 rounded-md text-[8px] font-black shadow-2xs"
                                      title="Out of Stock (স্টক শেষ)"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                      <span className="hidden sm:inline">Stock Out</span>
                                    </span>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm truncate leading-tight">
                                      {language === 'bn' ? food.name_bn || food.name : food.name}
                                    </h4>

                                    {/* Stock Point Indicator */}
                                    {!isOutOfStock ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300 shrink-0">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span>{language === 'bn' ? 'স্টকে আছে' : 'In Stock'}</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                                        <span className="w-2 h-2 rounded-full bg-rose-600" />
                                        <span>{language === 'bn' ? 'স্টক শেষ' : 'Out of Stock'}</span>
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[10px] font-medium text-stone-500 truncate mt-0.5">
                                    Store: <span className="font-bold text-stone-700">{foodRest.name}</span>
                                  </div>

                                  <div className="text-xs font-black text-orange-600 font-mono mt-1 flex items-center gap-1.5">
                                    <span>₹{finalPrice}</span>
                                    {food.discount_price && (
                                      <span className="text-[10px] text-stone-400 line-through font-normal">
                                        ₹{food.price}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {isStoreClosed ? (
                                <button
                                  type="button"
                                  disabled
                                  className="bg-stone-200 text-stone-600 font-bold text-xs px-3.5 py-2.5 rounded-2xl shrink-0 cursor-not-allowed border border-stone-300 flex items-center gap-1.5"
                                >
                                  <span className="w-2 h-2 rounded-full bg-stone-500" />
                                  <span>দোকান বন্ধ</span>
                                </button>
                              ) : isOutOfStock ? (
                                <button
                                  type="button"
                                  disabled
                                  className="bg-rose-50 text-rose-800 font-bold text-xs px-3.5 py-2.5 rounded-2xl shrink-0 cursor-not-allowed border border-rose-300 flex items-center gap-1.5 shadow-2xs"
                                >
                                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                                  <span>স্টক শেষ</span>
                                </button>
                              ) : qty > 0 ? (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1.5 bg-orange-600 text-white rounded-2xl px-2.5 py-1.5 shadow-sm shrink-0"
                                >
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(food.id, -1)}
                                    className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-extrabold text-xs cursor-pointer active:scale-95"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-xs font-black w-4 text-center">{qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(food.id, 1)}
                                    className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-extrabold text-xs cursor-pointer active:scale-95"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addItem(food, foodRest);
                                    setCartToast(`✓ ${food.name} (₹${finalPrice}) অর্ডারে যোগ করা হলো!`);
                                    setTimeout(() => setCartToast(null), 3000);
                                  }}
                                  className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-2xl shadow-sm shrink-0 transition-transform active:scale-95 cursor-pointer flex items-center gap-1"
                                >
                                  <span>+ Add to Cart</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </>
        ) : activeTab === 'active_restaurants' ? (
          /* Active Online Restaurants Menu View */
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-stone-900 text-white rounded-3xl p-6 shadow-xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                  Live Online Stores
                </span>
              </div>
              <h3 className="text-xl font-black">
                Active Online Restaurants & Menus (সক্রিয় রেস্তোরাঁ ও মেনু)
              </h3>
              <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
                এখানে যেসকল রেস্তোরাঁ এই মুহূর্তে অনলাইন রয়েছে তাদের তাজা খাবারের মেনু দেখতে পাবেন। পছন্দমতো যেকোনো খাবার কার্টে <strong>"+ Add On"</strong> করে একাধিক রেস্তোরাঁ থেকেও একসাথে সহজে অর্ডার করতে পারবেন!
              </p>
            </div>

            {/* Active Restaurants List */}
            {restaurants.filter((r) => r.is_open === 1 && r.status === 'approved').length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-stone-200">
                <div className="text-4xl mb-2">🏪</div>
                <h4 className="font-bold text-stone-800 text-base">No Online Restaurants Available Right Now</h4>
                <p className="text-xs text-stone-500 mt-1">Please check back shortly or browse all restaurants from Home.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {restaurants
                  .filter((r) => r.is_open === 1 && r.status === 'approved')
                  .map((rest) => (
                    <div
                      key={rest.id}
                      className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden p-5 space-y-4 hover:border-emerald-300 transition-all"
                    >
                      {/* Restaurant Header Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={rest.photo_url}
                            alt={rest.name}
                            className="w-16 h-16 rounded-2xl object-cover border border-stone-200 shadow-2xs"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-stone-900 text-lg">
                                {language === 'bn' ? rest.name_bn : rest.name}
                              </h4>
                              <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                <span>ONLINE</span>
                              </span>
                            </div>
                            <p className="text-xs text-stone-500">{rest.address}</p>
                            <div className="flex items-center gap-3 text-xs font-bold text-stone-600 mt-1">
                              <span className="flex items-center gap-1 text-amber-600">
                                ★ {rest.rating}
                              </span>
                              <span>•</span>
                              <span>⏱️ {rest.avg_delivery_minutes} mins</span>
                              <span>•</span>
                              <span className="text-emerald-700">Min Order: ₹{rest.min_order_amount}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenRestaurant(rest)}
                          className="bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl shadow transition-all shrink-0 self-start sm:self-auto"
                        >
                          View Full Store Page →
                        </button>
                      </div>

                      {/* Online Menu Items Grid */}
                      <div>
                        <h5 className="text-xs font-black uppercase tracking-wider text-stone-400 mb-3">
                          Available Dishes (তাজা খাবারের তালিকা)
                        </h5>

                        {rest.menu && rest.menu.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {rest.menu.map((food) => (
                              <div
                                key={food.id}
                                className="bg-stone-50 rounded-2xl p-3 border border-stone-200 flex items-center justify-between gap-3 hover:bg-orange-50/50 transition-all"
                              >
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={food.photo_url}
                                    alt={food.name}
                                    className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
                                  />
                                  <div>
                                    <h6 className="font-extrabold text-stone-900 text-xs leading-tight">
                                      {language === 'bn' ? food.name_bn : food.name}
                                    </h6>
                                    <div className="text-xs font-bold text-orange-600 font-mono mt-0.5">
                                      ₹{food.price}
                                    </div>
                                  </div>
                                </div>

                                {!isFoodAvailable(food) ? (
                                  <button
                                    type="button"
                                    disabled
                                    className="bg-stone-200 text-stone-500 font-bold text-[11px] px-2.5 py-1.5 rounded-xl cursor-not-allowed border border-stone-300 shrink-0"
                                  >
                                    <span>স্টক শেষ</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      addItem(food, rest);
                                      setIsCartOpen(true);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3 py-2 rounded-xl shadow-2xs transition-all shrink-0 flex items-center gap-1 active:scale-95 cursor-pointer"
                                  >
                                    <span>+ Add On</span>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-500 italic">Dishes loaded on detail view.</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          /* Past Orders Tab */
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-stone-900">
              {language === 'bn' ? 'আপনার পূর্ববর্তী অর্ডার' : 'Your Order History'}
            </h3>

            {pastOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-stone-200">
                <div className="text-4xl mb-2">📦</div>
                <h4 className="font-bold text-stone-800 text-base">No orders placed yet</h4>
                <p className="text-xs text-stone-500 mt-1">Your delicious meals will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-stone-500">
                          {ord.order_number}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            ord.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-stone-900 text-sm mt-1">
                        {ord.restaurant_name}
                      </h4>
                      <p className="text-xs text-stone-500 truncate max-w-md">
                        {ord.items.map((i) => `${i.quantity}x ${i.food_name}`).join(', ')}
                      </p>
                      <div className="text-[11px] text-stone-400 mt-1">
                        {new Date(ord.placed_at).toLocaleDateString()} at{' '}
                        {new Date(ord.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
                      <div className="font-mono text-base font-black text-stone-900">
                        ₹{ord.grand_total}
                      </div>
                      <button
                        onClick={() => setTrackingOrderId(ord.id)}
                        className="bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs px-3.5 py-1.5 rounded-xl border border-orange-200"
                      >
                        {ord.status === 'delivered' ? 'View Receipt & Route' : 'Live Track →'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Address Picker Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-stone-900 text-base">Select Delivery Location</h3>
                <p className="text-xs text-stone-500">Pick anywhere on the Google Map or tap your saved pins</p>
              </div>
              <button
                onClick={() => setIsAddressModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <LocationPickerMap
              heightClass="h-[260px]"
              onLocationSelected={(lat, lng, label) => {
                setDeliveryLocation(
                  label || `Pinned Location near (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                  lat,
                  lng
                );
              }}
            />

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Selected Address (বাড়ি/অফিসের ঠিকানা)
              </label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryLocation(e.target.value, 22.5292, 88.3612)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs font-medium focus:outline-hidden focus:border-orange-500"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddressModalOpen(false)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md"
              >
                Confirm Location (ঠিকানা নিশ্চিত করুন)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Cart Floating Bar */}
      {totalQuantity > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-2xl mx-auto bg-gradient-to-r from-stone-900 via-stone-800 to-orange-950 text-white rounded-3xl p-3.5 shadow-2xl border border-orange-500/30 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-3">
          <div className="flex items-center gap-3 pl-1">
            <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
              🛒
            </div>
            <div>
              <div className="text-xs font-black flex items-center gap-2">
                <span>{totalQuantity} {totalQuantity === 1 ? 'Item' : 'Items'} in Cart</span>
                <span className="bg-orange-500/30 text-orange-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-400/30">
                  Order Ready
                </span>
              </div>
              <div className="text-sm font-black font-mono text-orange-400">
                ₹{grandTotal} <span className="text-[10px] text-stone-300 font-normal">(Subtotal + Taxes)</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs px-5 py-2.5 rounded-2xl shadow-lg flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shrink-0"
          >
            <span>View Cart & Checkout →</span>
          </button>
        </div>
      )}

      {/* Restaurant Menu Modal */}
      {selectedRestaurant && (
        <RestaurantDetailsModal
          restaurant={selectedRestaurant}
          isOpen={!!selectedRestaurant}
          onClose={() => setSelectedRestaurant(null)}
          onOpenCart={() => setIsCartOpen(true)}
        />
      )}

      {/* Cart Slideover Drawer */}
      <CartSlideover
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOrderPlaced={(orderId) => {
          fetchOrders();
          setTrackingOrderId(orderId);
        }}
      />

      {/* Live Order Tracking Modal */}
      {trackingOrderId && (
        <LiveTrackingModal
          orderId={trackingOrderId}
          isOpen={!!trackingOrderId}
          onClose={() => {
            setTrackingOrderId(null);
            fetchOrders();
          }}
        />
      )}
    </div>
  );
};
