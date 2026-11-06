import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Tag,
  MapPin,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Lock,
  Smartphone,
  CreditCard,
  QrCode,
  AlertCircle,
  Navigation,
  Compass,
  Bike,
  Info,
  Shield
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { useCart, isFoodAvailable } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { apiRequest } from '../../services/api';
import { playSuccessChime } from '../common/AudioAlerts';
import { LocationPickerMap } from '../maps/LocationPickerMap';
import { PaymentGatewayModal } from './PaymentGatewayModal';

interface CartSlideoverProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderPlaced: (orderId: number) => void;
}

export const CartSlideover: React.FC<CartSlideoverProps> = ({
  isOpen,
  onClose,
  onOrderPlaced
}) => {
  const { user } = useAuth();
  const {
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
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    setDeliveryLocation,
    detectLiveLocation,
    addItem
  } = useCart();

  const { language, t } = useLanguage();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi'>('upi'); // Default: Prepaid Online Order
  const [onlinePaySubMethod, setOnlinePaySubMethod] = useState<'gpay' | 'phonepe' | 'paytm' | 'qr' | 'card'>('gpay');
  const [customerNotes, setCustomerNotes] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsFeedback, setGpsFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');

  // 1. Manual Specific Location Toggle (DEFAULT = false / NO)
  const [isManualAddressToggle, setIsManualAddressToggle] = useState(false);
  const [manualAddressText, setManualAddressInput] = useState('');

  // 2. Add-on Item Category Browse & Search Toggle (DEFAULT = false / NO)
  const [isAddonSectionOpen, setIsAddonSectionOpen] = useState(false);
  const [selectedAddonCategory, setSelectedAddonCategory] = useState<string>('All');
  const [addonCategoryItems, setAddonCategoryItems] = useState<{ food: any; restaurant: any }[]>([]);
  const [isLoadingAddonCategory, setIsLoadingAddonCategory] = useState(false);
  const [addonAddedMessage, setAddonAddedMessage] = useState<string | null>(null);
  const [addonSearchQuery, setAddonSearchQuery] = useState('');
  const [addonSearchResults, setAddonSearchResults] = useState<{ food: any; restaurant: any }[]>([]);
  const [isSearchingAddons, setIsSearchingAddons] = useState(false);

  const addonCategories = [
    { id: 'All', label: '⭐ All Add-Ons (সব খাবার)', icon: '⭐' },
    { id: 'Sweets', label: '🍰 Sweets & Desserts (মিষ্টি)', icon: '🍰' },
    { id: 'Beverages', label: '🥤 Cold Drinks & Beverages (পানীয়)', icon: '🥤' },
    { id: 'Breads', label: '🫓 Breads, Naan & Roti (রুটি/নান)', icon: '🫓' },
    { id: 'Starters', label: '🍟 Snacks & Starters (স্ন্যাক্স)', icon: '🍟' },
    { id: 'Rice', label: '🍚 Biryani, Rice & Thali (রাইস)', icon: '🍚' }
  ];

  const fetchAddonsByCategory = async (categoryName: string) => {
    setSelectedAddonCategory(categoryName);
    setIsLoadingAddonCategory(true);
    try {
      const allFoods = await apiRequest('/api/restaurants/all-foods');
      const results: { food: any; restaurant: any }[] = [];
      const catTarget = categoryName.toLowerCase();

      for (const item of (allFoods || [])) {
        const f = item.food;
        const r = item.restaurant;
        if (!f || !r) continue;

        const catLower = (f.category || '').toLowerCase();
        const nameLower = (f.name || '').toLowerCase();

        if (
          catTarget === 'all' ||
          catLower.includes(catTarget) ||
          nameLower.includes(catTarget) ||
          (catTarget === 'sweets' && (catLower.includes('sweet') || nameLower.includes('sweet') || nameLower.includes('misti') || nameLower.includes('rosogolla') || nameLower.includes('gulab') || nameLower.includes('dessert') || nameLower.includes('doi') || nameLower.includes('sandesh') || nameLower.includes('rasmalai') || nameLower.includes('barfi'))) ||
          (catTarget === 'beverages' && (catLower.includes('drink') || catLower.includes('beverage') || nameLower.includes('cold') || nameLower.includes('lassi') || nameLower.includes('juice') || nameLower.includes('chai') || nameLower.includes('tea') || nameLower.includes('milk') || nameLower.includes('coffee') || nameLower.includes('coke') || nameLower.includes('sprite'))) ||
          (catTarget === 'breads' && (catLower.includes('bread') || nameLower.includes('naan') || nameLower.includes('roti') || nameLower.includes('paratha') || nameLower.includes('kulcha'))) ||
          (catTarget === 'starters' && (catLower.includes('starter') || catLower.includes('snack') || nameLower.includes('roll') || nameLower.includes('fry') || nameLower.includes('pakhoda') || nameLower.includes('chaap') || nameLower.includes('tikka') || nameLower.includes('kochuri'))) ||
          (catTarget === 'rice' && (catLower.includes('rice') || catLower.includes('biryani') || nameLower.includes('biryani') || nameLower.includes('pulao') || nameLower.includes('thali')))
        ) {
          results.push({ food: f, restaurant: r });
        }
      }
      setAddonCategoryItems(results);
    } catch (e) {
      console.error('Fetch addon category error:', e);
    } finally {
      setIsLoadingAddonCategory(false);
    }
  };

  useEffect(() => {
    if (isAddonSectionOpen && selectedAddonCategory) {
      fetchAddonsByCategory(selectedAddonCategory);
    }
  }, [isAddonSectionOpen, selectedAddonCategory]);

  // 3. Self-Pickup / Takeaway Toggle (DEFAULT = false / NO)
  const [isSelfPickup, setIsSelfPickup] = useState(false);

  // 4. Confirm Order Step State & Payment Gateway Modal State
  const [isOrderConfirmedStep, setIsOrderConfirmedStep] = useState(false);
  const [isPaymentGatewayOpen, setIsPaymentGatewayOpen] = useState(false);

  // Live Service Area Validation State
  const [isLocationServiceable, setIsLocationServiceable] = useState(true);
  const [serviceAreaMsg, setServiceAreaMsg] = useState('');

  useEffect(() => {
    if (!deliveryLat || !deliveryLng) return;
    apiRequest('/api/service-areas/validate-location', {
      method: 'POST',
      body: JSON.stringify({ lat: deliveryLat, lng: deliveryLng })
    })
      .then((res) => {
        if (res && res.data) {
          setIsLocationServiceable(res.data.isServiceable);
          setServiceAreaMsg(res.data.message || '');
        }
      })
      .catch((e) => {
        console.warn('Validate location error:', e);
      });
  }, [deliveryLat, deliveryLng, isOpen]);

  // Effective Delivery Fee & Grand Total
  const effectiveDeliveryFee = isSelfPickup ? 0 : deliveryFee;
  const effectiveGrandTotal = isSelfPickup ? Math.max(0, Math.round(subtotal - discountAmount + tax)) : grandTotal;

  // Serviceable Area Check helper
  const isAddressOutsideServiceArea = (addrText: string) => {
    if (!addrText) return false;
    const lower = addrText.toLowerCase();
    const outKeywords = ['delhi', 'mumbai', 'london', 'usa', 'bangalore', 'chennai', 'outside', 'out of station', 'punjab'];
    return outKeywords.some((k) => lower.includes(k));
  };

  // Live Add-on Search Execution across all active online restaurants
  const handleSearchAddons = async (query: string) => {
    setAddonSearchQuery(query);
    if (!query.trim()) {
      setAddonSearchResults([]);
      return;
    }
    setIsSearchingAddons(true);
    try {
      const restaurants = await apiRequest(`/api/restaurants?search=${encodeURIComponent(query)}`);
      const results: { food: any; restaurant: any }[] = [];
      for (const r of restaurants) {
        if (r.menu) {
          for (const f of r.menu) {
            if (
              f.name.toLowerCase().includes(query.toLowerCase()) ||
              (f.name_bn && f.name_bn.includes(query)) ||
              (f.category && f.category.toLowerCase().includes(query.toLowerCase()))
            ) {
              results.push({ food: f, restaurant: r });
            }
          }
        }
      }
      setAddonSearchResults(results);
    } catch (e) {
      console.error('Addon search error:', e);
    } finally {
      setIsSearchingAddons(false);
    }
  };

  const isUserCodEnabled = Boolean(user?.cod_enabled);

  const handleUseLiveGps = async () => {
    setIsDetectingGps(true);
    setGpsFeedback(null);
    const res = await detectLiveLocation();
    setIsDetectingGps(false);
    if (res.success) {
      setGpsFeedback('✓ Live GPS location locked & delivery fare updated!');
      setTimeout(() => setGpsFeedback(null), 4000);
    } else {
      setGpsFeedback(`⚠️ ${res.message}`);
    }
  };


  if (!isOpen) return null;

  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = codeToApply || couponInput;
    if (!code) return;
    setCouponError('');
    setCouponSuccess('');
    const res = await applyCoupon(code);
    if (res.success) {
      setCouponSuccess(res.message);
      setCouponInput('');
    } else {
      setCouponError(res.message);
    }
  };

  const handlePlaceOrder = async () => {
    if (!restaurant || items.length === 0) return;

    const outOfStockItems = items.filter((i) => !isFoodAvailable(i.food));
    if (outOfStockItems.length > 0) {
      setOrderError(`আপনার কার্টে আউট অফ স্টক (স্টক শেষ) খাবার রয়েছে: ${outOfStockItems.map((i) => i.food.name).join(', ')}। দয়া করে স্টক শেষ হওয়া খাবারগুলো কার্ট থেকে মুছে ফেলুন।`);
      return;
    }

    const finalAddress = isManualAddressToggle ? (manualAddressText || deliveryAddress) : deliveryAddress;

    if (isManualAddressToggle && isAddressOutsideServiceArea(finalAddress)) {
      setOrderError('আপনার ম্যানুয়াল ঠিকানাটি আমাদের সার্ভিস এলাকার বাইরে (Outside Serviceable Area)! অনুগ্রহ করে সঠিক সার্ভিসিং এলাকার ঠিকানা দিন।');
      return;
    }

    setIsSubmitting(true);
    setOrderError('');

    try {
      const targetRestId = items[0]?.restaurant?.id || items[0]?.food?.restaurant_id || restaurant?.id || 1;
      const payload = {
        restaurantId: targetRestId,
        directRestaurantOnly,
        items: items.map((i) => ({
          foodId: i.food.id,
          quantity: i.quantity,
          specialInstructions: i.specialInstructions
        })),
        deliveryAddress: finalAddress,
        deliveryLandmark,
        deliveryLat,
        deliveryLng,
        couponCode: appliedCoupon || undefined,
        paymentMethod,
        customerNotes: isSelfPickup ? `${customerNotes} [TAKEAWAY / SELF-PICKUP]` : customerNotes
      };

      const order = await apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // Celebration
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch {}
      playSuccessChime();

      clearCart();
      onClose();
      onOrderPlaced(order.id);
    } catch (err: any) {
      setOrderError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div>
            <h2 className="font-extrabold text-stone-900 text-lg flex items-center gap-2">
              <span>{t('cart.title')}</span>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                {totalQuantity} items
              </span>
            </h2>
            {restaurant && (
              <p className="text-xs text-stone-500 font-medium truncate max-w-[260px]">
                From {restaurant.name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center text-4xl mb-4">
              🛍️
            </div>
            <h3 className="font-bold text-stone-800 text-base mb-1">{t('cart.empty')}</h3>
            <p className="text-xs text-stone-500 max-w-xs mb-6">
              Add delicious local food from your favorite restaurants to proceed.
            </p>
            <button
              onClick={onClose}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-6 py-2.5 rounded-full shadow-md"
            >
              Browse Restaurants
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Delivery Address Card */}
            <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                  <MapPin className="w-4 h-4 text-orange-600" />
                  <span>{t('location.delivering_to')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleUseLiveGps}
                    disabled={isDetectingGps}
                    className="text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    title="Capture live GPS coordinates to calculate exact distance & delivery fare"
                  >
                    <Navigation className={`w-3 h-3 text-emerald-700 ${isDetectingGps ? 'animate-spin' : ''}`} />
                    <span>{isDetectingGps ? 'Finding GPS...' : 'Use Live GPS'}</span>
                  </button>
                  <button
                    onClick={() => setShowLocationPicker(!showLocationPicker)}
                    className="text-[11px] font-bold text-orange-600 hover:text-orange-700 underline px-1 cursor-pointer"
                  >
                    {showLocationPicker ? 'Close Map' : 'Map Pin'}
                  </button>
                </div>
              </div>

              {gpsFeedback && (
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium animate-in fade-in">
                  {gpsFeedback}
                </div>
              )}

              {showLocationPicker ? (
                <div className="mt-2 mb-3">
                  <LocationPickerMap
                    initialLat={deliveryLat}
                    initialLng={deliveryLng}
                    heightClass="h-[220px]"
                    onLocationSelected={(lat, lng, label) => {
                      setDeliveryLocation(label || `Selected Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`, lat, lng);
                    }}
                  />
                </div>
              ) : null}

              <p className="text-xs text-stone-700 font-medium leading-relaxed">
                {isManualAddressToggle ? (manualAddressText || 'Type specific address below...') : deliveryAddress}
              </p>
              {deliveryLandmark && (
                <p className="text-[11px] text-stone-500 mt-0.5">Landmark: {deliveryLandmark}</p>
              )}

              {/* Manual Address Input Toggle (DEFAULT = NO / false) */}
              <div className="pt-2.5 border-t border-stone-200/80 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-stone-800">
                  Manually Type Specific Delivery Address? (ম্যানুয়ালি নির্দিষ্ট ঠিকানা দেবেন?)
                </span>

                <button
                  type="button"
                  onClick={() => setIsManualAddressToggle(!isManualAddressToggle)}
                  className={`w-10 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    isManualAddressToggle ? 'bg-orange-600' : 'bg-stone-300'
                  }`}
                  title="Toggle manual address entry"
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white shadow transition-transform absolute top-0.5 left-0.5 ${
                      isManualAddressToggle ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Manual Address Input Field + Serviceable Area Verification */}
              {isManualAddressToggle && (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <textarea
                    rows={2}
                    placeholder="Type house no, street, locality, Kolkata 700019..."
                    value={manualAddressText}
                    onChange={(e) => setManualAddressInput(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-xs font-medium focus:outline-hidden focus:border-orange-500 shadow-2xs"
                  />

                  {manualAddressText && (
                    <div
                      className={`p-2.5 rounded-xl text-[11px] font-bold flex items-center gap-2 border ${
                        isAddressOutsideServiceArea(manualAddressText)
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {isAddressOutsideServiceArea(manualAddressText) ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>⚠️ এই ঠিকানাটি আমাদের সার্ভিস এলাকার বাইরে (Outside Serviceable Zone)!</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>✓ সার্ভিস এলাকা নিশ্চিত: দক্ষিণ কলকাতা ও পার্শ্ববর্তী অঞ্চল।</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Self-Pickup / Takeaway Toggle (DEFAULT = NO / false) */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
              <div>
                <div className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                  <span>Self-Pickup / Takeaway from Restaurant?</span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.2 rounded-full ${
                      isSelfPickup ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {isSelfPickup ? 'YES (Free Pickup)' : 'NO (Home Delivery)'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {isSelfPickup
                    ? '🛍️ টেক-অ্যাওয়ে মোড অন: কোনো ডেলিভারি চার্জ লাগবে না (Delivery Fee ₹0)!'
                    : 'রেস্তোরাঁ থেকে আপনার ঠিকানায় সরাসরি হোম ডেলিভারি করা হবে।'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSelfPickup(!isSelfPickup)}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                  isSelfPickup ? 'bg-emerald-600' : 'bg-stone-300'
                }`}
                title="Toggle self pickup preference"
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white shadow transition-transform absolute top-0.5 left-0.5 ${
                    isSelfPickup ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Dynamic Distance & Fare Calculation Card (HIDDEN WHEN SELF-PICKUP) */}
            {restaurant && !isSelfPickup && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/80 border border-amber-300/80 rounded-2xl p-3.5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center text-sm shadow-xs font-bold">
                      🛵
                    </div>
                    <div>
                      <div className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                        <span>Live Distance to {restaurant.name}</span>
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Calculated from your delivery coordinates
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black font-mono text-orange-700">
                      {distanceKm > 0 ? `${distanceKm} km` : 'Calculating...'}
                    </span>
                  </div>
                </div>

                <div className="bg-white/90 rounded-xl p-2.5 border border-amber-200/80 text-xs text-stone-700 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-stone-800">Dynamic Delivery Fee:</span>
                    <span className="font-mono text-orange-700 font-extrabold text-sm">
                      ₹{deliveryFee}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 font-medium">
                    {fareBreakdown?.formulaText ||
                      `Base ₹${platformRates.baseFare} (first ${platformRates.baseDistanceKm} km) + ₹${platformRates.perKmRate}/km`}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-amber-900 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Fair per-km pricing regulated by platform admin. Added directly to your bill.</span>
                </div>
              </div>
            )}


            {/* Food Items List */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Order Items ({items.length})
              </div>
              {items.map(({ food, quantity }) => {
                const price = food.discount_price || food.price;
                const isOutOfStock = !isFoodAvailable(food);

                return (
                  <div
                    key={food.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-2xl border shadow-2xs ${
                      isOutOfStock ? 'bg-rose-50/80 border-rose-300' : 'bg-white border-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <img
                          src={food.photo_url}
                          alt={food.name}
                          className={`w-12 h-12 rounded-xl object-cover ${isOutOfStock ? 'grayscale-40' : ''}`}
                        />
                        <span
                          className={`absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            food.is_veg ? 'bg-emerald-600' : 'bg-red-600'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-xs text-stone-900 truncate">
                            {language === 'bn' ? food.name_bn || food.name : food.name}
                          </h4>
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 bg-rose-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              <span>স্টক শেষ (Out of Stock)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[9px] px-1.5 py-0.2 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>In Stock</span>
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-xs font-bold text-orange-600 mt-0.5">
                          ₹{price * quantity}
                          <span className="text-[10px] font-normal text-stone-400 ml-1">
                            (₹{price} each)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 bg-stone-100 rounded-full px-2 py-1 border border-stone-200">
                      <button
                        onClick={() => updateQuantity(food.id, -1)}
                        className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-stone-700 hover:bg-stone-200 text-xs font-bold shadow-2xs cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{quantity}</span>
                      <button
                        onClick={() => {
                          if (isOutOfStock) {
                            alert(`"${food.name}" বর্তমানে আউট অফ স্টক (স্টক শেষ)। সংখ্যা বাড়ানো সম্ভব নয়।`);
                            return;
                          }
                          updateQuantity(food.id, 1);
                        }}
                        disabled={isOutOfStock}
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shadow-2xs ${
                          isOutOfStock
                            ? 'bg-stone-300 text-stone-400 cursor-not-allowed'
                            : 'bg-orange-600 text-white hover:bg-orange-700 cursor-pointer'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Extra Add-on Item Category & Search Section (DEFAULT = NO / false) */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                    <span>Add Extra Add-On Dishes / Items? (অতিরিক্ত খাবার খুঁজবেন?)</span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.2 rounded-full ${
                        isAddonSectionOpen ? 'bg-blue-600 text-white' : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {isAddonSectionOpen ? 'YES (Categories Open)' : 'NO'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    ক্যাটাগরিতে ক্লিক করে ছবি সহ খাবার বেছে নিন। আইটেম যোগ করলে সাথে সাথে বিল অ্যামাউন্টে যুক্ত হবে।
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddonSectionOpen(!isAddonSectionOpen)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    isAddonSectionOpen ? 'bg-blue-600' : 'bg-stone-300'
                  }`}
                  title="Toggle add-on item section"
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform absolute top-0.5 left-0.5 ${
                      isAddonSectionOpen ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Add-On Added Toast Feedback */}
              {addonAddedMessage && (
                <div className="bg-emerald-100 text-emerald-900 border border-emerald-300 p-2 rounded-xl text-xs font-extrabold animate-in fade-in flex items-center justify-between">
                  <span>{addonAddedMessage}</span>
                  <button
                    type="button"
                    onClick={() => setAddonAddedMessage(null)}
                    className="text-emerald-700 font-black text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Category Chips Bar & Item Selector */}
              {isAddonSectionOpen && (
                <div className="space-y-3 pt-2 border-t border-stone-200 animate-in fade-in">
                  <div className="text-[11px] font-bold text-stone-600">Select Add-On Category (ক্যাটাগরি বাছুন):</div>

                  {/* Horizontal Scrollable Category Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {addonCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => fetchAddonsByCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer border ${
                          selectedAddonCategory === cat.id
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Category Items List with HD Photos & Prices */}
                  {isLoadingAddonCategory ? (
                    <div className="text-center py-6 text-xs font-bold text-stone-400 animate-pulse">
                      Loading delicious {selectedAddonCategory} items with photos & prices...
                    </div>
                  ) : addonCategoryItems.length > 0 ? (
                    <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                      {addonCategoryItems.map(({ food, restaurant: foodRest }) => {
                        const inCartItem = items.find((i) => i.food.id === food.id);
                        const isAdded = Boolean(inCartItem);
                        const currentQty = inCartItem ? inCartItem.quantity : 0;
                        const isOutOfStock = !isFoodAvailable(food);
                        const finalPrice = food.discount_price || food.price;

                        return (
                          <div
                            key={`${foodRest.id}-${food.id}`}
                            onClick={() => {
                              if (isOutOfStock) return;
                              if (isAdded) {
                                removeItem(food.id);
                                setAddonAddedMessage(`- ${food.name} বিল থেকে বাদ দেওয়া হয়েছে`);
                              } else {
                                addItem(food, foodRest);
                                setAddonAddedMessage(`✓ ${food.name} (₹${finalPrice}) অর্ডারে যোগ করা হলো!`);
                              }
                              setTimeout(() => setAddonAddedMessage(null), 3000);
                            }}
                            className={`bg-white rounded-2xl p-3 border transition-all flex items-center justify-between gap-3 shadow-2xs select-none ${
                              isOutOfStock
                                ? 'border-stone-200 bg-stone-50/70 opacity-70 cursor-not-allowed'
                                : isAdded
                                ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-300 cursor-pointer'
                                : 'border-stone-200 hover:border-blue-400 hover:bg-stone-50/80 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Direct Tick Checkbox */}
                              <input
                                type="checkbox"
                                disabled={isOutOfStock}
                                checked={isAdded}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  if (isOutOfStock) return;
                                  if (isAdded) {
                                    removeItem(food.id);
                                    setAddonAddedMessage(`- ${food.name} বিল থেকে বাদ দেওয়া হয়েছে`);
                                  } else {
                                    addItem(food, foodRest);
                                    setAddonAddedMessage(`✓ ${food.name} (₹${finalPrice}) অর্ডারে টিক দিয়ে যোগ করা হলো!`);
                                  }
                                  setTimeout(() => setAddonAddedMessage(null), 3000);
                                }}
                                className={`w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 shrink-0 ${
                                  isOutOfStock ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                                }`}
                              />

                              <div className="relative">
                                <img
                                  src={food.photo_url}
                                  alt={food.name}
                                  className={`w-14 h-14 rounded-2xl object-cover border border-stone-200 shrink-0 shadow-xs ${
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
                                  <h5 className="font-extrabold text-stone-900 text-xs truncate">
                                    {language === 'bn' ? food.name_bn || food.name : food.name}
                                  </h5>
                                  {isOutOfStock ? (
                                    <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[9px] px-1.5 py-0.5 rounded-full">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                      <span>Out of Stock</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[9px] px-1.5 py-0.5 rounded-full">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      <span>In Stock</span>
                                    </span>
                                  )}
                                  {isAdded && (
                                    <span className="bg-emerald-600 text-white font-black text-[9px] px-1.5 py-0.2 rounded-full">
                                      {currentQty}x in Bill
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

                            {/* Direct Tick / Select Button */}
                            <div className="shrink-0">
                              <span
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-2xs flex items-center gap-1 ${
                                  isAdded
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-stone-100 text-stone-700 border border-stone-300'
                                }`}
                              >
                                {isAdded ? '☑️ Selected' : '☐ Tick to Add'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-stone-500 font-medium">
                      No items available in {selectedAddonCategory}. Please try selecting another category above.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Coupons Section */}
            <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 mb-2">
                <Tag className="w-3.5 h-3.5 text-orange-600" />
                <span>Apply Coupon / ছাড়ের কুপন</span>
              </div>

              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-xs text-emerald-800 font-bold">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Coupon '{appliedCoupon}' applied (-₹{discountAmount})</span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-stone-400 hover:text-red-600 text-xs underline font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter promo code (e.g. PROTHOM50)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-bold uppercase focus:outline-hidden focus:border-orange-500"
                    />
                    <button
                      onClick={() => handleApplyCoupon()}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl shadow-2xs"
                    >
                      Apply
                    </button>
                  </div>
                  {/* Quick coupon chips */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-stone-400 font-semibold">Try:</span>
                    <button
                      onClick={() => handleApplyCoupon('PROTHOM50')}
                      className="text-[10px] font-bold bg-white text-orange-700 border border-orange-200 hover:bg-orange-50 px-2 py-0.5 rounded-md"
                    >
                      PROTHOM50 (50% Off)
                    </button>
                    <button
                      onClick={() => handleApplyCoupon('AHARLOCAL')}
                      className="text-[10px] font-bold bg-white text-orange-700 border border-orange-200 hover:bg-orange-50 px-2 py-0.5 rounded-md"
                    >
                      AHARLOCAL (Flat ₹40)
                    </button>
                  </div>
                </div>
              )}
              {couponError && <p className="text-[11px] text-red-600 mt-1 font-medium">{couponError}</p>}
              {couponSuccess && <p className="text-[11px] text-emerald-600 mt-1 font-medium">{couponSuccess}</p>}
            </div>

            {/* Special Instructions */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Cooking / Delivery Note (ঐচ্ছিক নির্দেশ)
              </label>
              <input
                type="text"
                placeholder="e.g. Please send extra chutney / ring bell twice"
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-orange-500"
              />
            </div>

            {/* Bill Summary */}
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs space-y-2 text-xs">
              <div className="font-bold text-stone-800 mb-1">Bill Summary (বিল বিবরণ)</div>
              <div className="flex justify-between text-stone-600">
                <span>{t('cart.subtotal')}</span>
                <span className="font-mono font-bold text-stone-900">₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-stone-600">
                <div className="flex items-center gap-1.5">
                  <span>{t('cart.delivery_fee')}</span>
                  {isSelfPickup ? (
                    <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                      FREE Self-Pickup
                    </span>
                  ) : (
                    distanceKm > 0 && (
                      <span className="text-[10px] font-black bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded">
                        {distanceKm} km
                      </span>
                    )
                  )}
                </div>

                <div className="text-right">
                  <span className={`font-mono font-bold ${isSelfPickup ? 'text-emerald-700 line-through' : ''}`}>
                    ₹{deliveryFee.toFixed(2)}
                  </span>
                  {isSelfPickup && (
                    <div className="text-[10px] font-black text-emerald-700">₹0.00 (Free)</div>
                  )}
                  {!isSelfPickup && fareBreakdown && (
                    <div className="text-[9px] text-stone-400">
                      {distanceKm <= platformRates.baseDistanceKm
                        ? `Base (<${platformRates.baseDistanceKm}km)`
                        : `₹${platformRates.baseFare} + ₹${platformRates.perKmRate}/km`}
                    </div>
                  )}
                </div>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>{t('cart.discount')}</span>
                  <span className="font-mono">-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-stone-600">
                <span>{t('cart.tax')} (5% GST)</span>
                <span className="font-mono">₹{tax.toFixed(2)}</span>
              </div>

              <div className="border-t border-dashed border-stone-200 pt-2 flex justify-between text-stone-900 font-extrabold text-sm">
                <span>{t('cart.total')}</span>
                <span className="font-mono text-orange-600 font-black">₹{effectiveGrandTotal}</span>
              </div>
            </div>

            {/* STEP 2 REVEAL: Payment Method Selector (Appears AFTER clicking Confirm Order) */}
            {isOrderConfirmedStep ? (
              <div className="bg-stone-50 rounded-2xl p-4 border-2 border-orange-400 shadow-md space-y-3 animate-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <div className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                    <span>Payment Options (মূল্য পরিশোধের মাধ্যম)</span>
                    <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.2 rounded-full">
                      Step 2: Pay
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOrderConfirmedStep(false)}
                    className="text-[11px] font-bold text-orange-600 hover:text-orange-800 underline cursor-pointer"
                  >
                    ← Edit Order Details
                  </button>
                </div>

                <div className="space-y-2.5">
                  {/* PREPAID ONLINE PAYMENT ONLY */}
                  <div
                    onClick={() => setPaymentMethod('upi')}
                    className="p-3 rounded-2xl border transition-all cursor-pointer bg-orange-50/80 border-orange-400 ring-2 ring-orange-200 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="payment"
                          checked={true}
                          readOnly
                          className="text-orange-600 focus:ring-orange-500"
                        />
                        <div>
                          <div className="text-xs font-extrabold text-stone-900 flex items-center gap-1.5">
                            <span>{t('payment.online')} (Prepaid Instant Only)</span>
                            <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.2 rounded-full">
                              Required
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-600 mt-0.5">
                            UPI, Google Pay, PhonePe, Paytm, QR Code, ATM/Debit Card
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        Fast Dispatch
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-orange-200/80 space-y-2 animate-in fade-in">
                      <div className="text-[11px] font-bold text-stone-700">Select Instant Prepaid App (পেমেন্ট মাধ্যম বাছুন):</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'gpay', label: 'Google Pay', icon: '🟢' },
                          { id: 'phonepe', label: 'PhonePe', icon: '🟣' },
                          { id: 'paytm', label: 'Paytm / UPI', icon: '🔵' },
                          { id: 'qr', label: 'Scan QR Code', icon: '📷' },
                          { id: 'card', label: 'Debit / ATM Card', icon: '💳' }
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOnlinePaySubMethod(m.id as any);
                            }}
                            className={`p-2 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                              onlinePaySubMethod === m.id
                                ? 'bg-white border-orange-600 text-orange-950 shadow-2xs ring-1 ring-orange-400'
                                : 'bg-white/70 border-stone-200 text-stone-600 hover:bg-white'
                            }`}
                          >
                            <span>{m.icon}</span>
                            <span className="text-[10px] truncate max-w-full">{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Prepaid Policy Info Banner */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-[11px] text-blue-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>
                      <strong>Prepaid Only Policy:</strong> ক্যাশলেস ও দ্রুত ডেলিভারির জন্য সমস্ত কাস্টমার অর্ডার প্রিপেইডে প্রক্রিয়াকরণ করা হয়।
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {!isLocationServiceable && !isSelfPickup && (
              <div className="p-3.5 bg-red-600 text-white rounded-2xl text-xs font-bold shadow-md flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold uppercase tracking-wide text-[11px] text-amber-200">
                    Not Serviceable (নট সার্ভিসএবল)
                  </div>
                  <div className="mt-0.5 leading-relaxed font-medium">
                    {serviceAreaMsg || 'আপনার নির্বাচিত লোকেশনটি আমাদের রেজিস্টার্ড সার্ভিস সীমানার বাইরে! অনুগ্রহ করে ম্যাপ থেকে সীমানার ভেতরের ঠিকানা নির্বাচন করুন।'}
                  </div>
                </div>
              </div>
            )}

            {orderError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-medium">
                {orderError}
              </div>
            )}
          </div>
        )}

        {/* Footer Action */}
        {items.length > 0 && (
          <div className="p-4 border-t border-stone-200 bg-white">
            {isOrderConfirmedStep ? (
              <button
                type="button"
                onClick={() => {
                  if (paymentMethod === 'cod') {
                    handlePlaceOrder();
                  } else {
                    setIsPaymentGatewayOpen(true);
                  }
                }}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-between transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                <div className="text-left leading-tight">
                  <div className="text-[11px] opacity-90 font-medium">Grand Total</div>
                  <div className="font-mono text-base font-black">₹{effectiveGrandTotal}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>{isSubmitting ? 'Processing Payment...' : 'Open Payment Gateway & Complete Order (পেমেন্ট গেটওয়েতে যান) →'}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!isLocationServiceable && !isSelfPickup) {
                    setOrderError('আপনার নির্বাচিত ঠিকানাটি সার্ভিস সীমানার বাইরে (Not Serviceable)। দয়া করে ম্যাপ থেকে সঠিক সার্ভিসিং এলাকার ঠিকানা নির্বাচন করুন।');
                    return;
                  }
                  const finalAddr = isManualAddressToggle ? (manualAddressText || deliveryAddress) : deliveryAddress;
                  if (isManualAddressToggle && isAddressOutsideServiceArea(finalAddr)) {
                    setOrderError('আপনার ম্যানুয়াল ঠিকানাটি আমাদের সার্ভিস এলাকার বাইরে (Outside Serviceable Zone)!');
                    return;
                  }
                  setOrderError('');
                  setIsOrderConfirmedStep(true);
                }}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold text-sm py-3.5 px-6 rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-between transition-all transform active:scale-98 cursor-pointer"
              >
                <div className="text-left leading-tight">
                  <div className="text-[11px] opacity-90 font-medium">Grand Total</div>
                  <div className="font-mono text-base font-black">₹{effectiveGrandTotal}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Confirm Order & Proceed to Payment (অর্ডার কনফার্ম করুন)</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Payment Gateway Modal */}
      <PaymentGatewayModal
        isOpen={isPaymentGatewayOpen}
        amount={effectiveGrandTotal}
        paymentMethod={paymentMethod}
        onlineSubMethod={onlinePaySubMethod}
        customerName={user?.name}
        storeName={restaurant?.name}
        itemCount={items.length}
        onPaymentSuccess={() => {
          setIsPaymentGatewayOpen(false);
          handlePlaceOrder();
        }}
        onCancel={() => setIsPaymentGatewayOpen(false)}
      />
    </div>
  );
};
