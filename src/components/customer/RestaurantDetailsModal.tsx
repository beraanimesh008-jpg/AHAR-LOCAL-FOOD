import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Clock,
  MapPin,
  Plus,
  Minus,
  Search,
  Check,
  Shield,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Sparkles
} from 'lucide-react';
import { Restaurant, FoodItem } from '../../types';
import { useCart, isFoodAvailable } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';

interface RestaurantDetailsModalProps {
  restaurant: Restaurant;
  isOpen: boolean;
  onClose: () => void;
  onOpenCart: () => void;
}

export const RestaurantDetailsModal: React.FC<RestaurantDetailsModalProps> = ({
  restaurant,
  isOpen,
  onClose,
  onOpenCart
}) => {
  const { items, addItem, updateQuantity, totalQuantity, grandTotal } = useCart();
  const { language } = useLanguage();
  const [vegOnly, setVegOnly] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);

  // Extract up to 3 restaurant photos
  const rawPhotos = restaurant.photos && restaurant.photos.length > 0
    ? restaurant.photos
    : [restaurant.banner_url || restaurant.photo_url, restaurant.photo_url, 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200'].filter(Boolean);

  const slidePhotos = rawPhotos.slice(0, 3);
  if (slidePhotos.length < 3) {
    if (slidePhotos.length === 1) {
      slidePhotos.push(
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200'
      );
    } else if (slidePhotos.length === 2) {
      slidePhotos.push('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200');
    }
  }

  // Auto slide from left to right every 3.5 seconds
  useEffect(() => {
    if (!isOpen || slidePhotos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slidePhotos.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isOpen, slidePhotos.length]);

  if (!isOpen) return null;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slidePhotos.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slidePhotos.length) % slidePhotos.length);
  };

  const menu = restaurant.menu || [];

  let filteredMenu = menu;
  if (vegOnly) {
    filteredMenu = filteredMenu.filter((f) => f.is_veg === 1);
  }
  if (menuSearch) {
    const q = menuSearch.toLowerCase();
    filteredMenu = filteredMenu.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.name_bn.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
    );
  }

  // Group by category
  const categories = Array.from(new Set(filteredMenu.map((f) => f.category)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl max-h-[94vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200">
        
        {/* Banner Auto-Sliding 3-Image Carousel (Left to Right Auto Slide) */}
        <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-stone-950 shrink-0 group">
          {/* Slides Container */}
          <div
            className="flex h-full w-full transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {slidePhotos.map((photoUrl, idx) => (
              <div key={idx} className="relative min-w-full h-full shrink-0">
                <img
                  src={photoUrl}
                  alt={`${restaurant.name} photo ${idx + 1}`}
                  className="w-full h-full object-cover brightness-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              </div>
            ))}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-all cursor-pointer backdrop-blur-xs shadow-md"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left / Right Carousel Arrow Controls */}
          {slidePhotos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevSlide();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs shadow-md"
                title="Previous photo"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextSlide();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs shadow-md"
                title="Next photo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* 3 Photos Indicator Dots & Badge */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1">
              <ImageIcon className="w-3 h-3 text-orange-400" />
              <span>Photo {currentSlide + 1} of {slidePhotos.length}</span>
            </span>
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
              {slidePhotos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    currentSlide === i ? 'w-5 bg-orange-400' : 'w-1.5 bg-white/50 hover:bg-white'
                  }`}
                  title={`View photo ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Restaurant Overlay Info */}
          <div className="absolute bottom-3 left-4 right-4 z-10 text-white">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                <Star className="w-3 h-3 fill-current" />
                {restaurant.rating} ({restaurant.rating_count}+ reviews)
              </span>
              {restaurant.is_open === 1 ? (
                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                  🟢 Store Open (অনলাইন)
                </span>
              ) : (
                <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                  🔴 Store Offline (দোকান বন্ধ)
                </span>
              )}
              <span className="bg-white/20 backdrop-blur-md text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10">
                <Clock className="w-3 h-3 inline mr-1" />
                {restaurant.avg_delivery_minutes} mins delivery
              </span>
              {restaurant.is_pure_veg === 1 && (
                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                  100% Pure Veg
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight drop-shadow-md">
              {language === 'bn' ? restaurant.name_bn || restaurant.name : restaurant.name}
            </h2>
            <p className="text-xs text-stone-200 truncate mt-0.5 flex items-center gap-1 drop-shadow-sm">
              <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span>{restaurant.address}</span>
            </p>
          </div>
        </div>

        {/* Offline Banner Warning */}
        {restaurant.is_open === 0 && (
          <div className="bg-rose-100 border-b border-rose-200 text-rose-900 px-4 py-2 text-xs font-bold flex items-center gap-2 shrink-0">
            <span>⚠️ এই রেস্তোরাঁটি বর্তমানে অফলাইনে (বন্ধ) রয়েছে। এখন খাবার অর্ডার করা যাবে না।</span>
          </div>
        )}

        {/* Search & Veg Filter Toolbar */}
        <div className="p-3 border-b border-stone-200 bg-stone-50 flex items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search in restaurant menu (খাবার খুঁজুন)..."
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-orange-500 font-medium shadow-2xs"
            />
          </div>

          <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 bg-white px-3 py-1.5 rounded-xl border border-stone-200 cursor-pointer select-none shadow-2xs">
            <input
              type="checkbox"
              checked={vegOnly}
              onChange={(e) => setVegOnly(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-emerald-700">Veg Only</span>
          </label>
        </div>

        {/* Menu Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {categories.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <p className="text-sm font-medium">No dishes match your filter</p>
            </div>
          ) : (
            categories.map((category) => {
              const categoryFoods = filteredMenu.filter((f) => f.category === category);
              return (
                <div key={category} className="space-y-3">
                  <h3 className="font-extrabold text-stone-900 text-sm border-b border-stone-100 pb-1.5 flex items-center justify-between">
                    <span>{category}</span>
                    <span className="text-xs text-stone-500 font-normal">
                      {categoryFoods.length} items
                    </span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categoryFoods.map((food) => {
                      const cartItem = items.find((i) => i.food.id === food.id);
                      const qty = cartItem ? cartItem.quantity : 0;
                      const finalPrice = food.discount_price || food.price;
                      const isItemAvailable = isFoodAvailable(food);
                      const isStoreOpen = restaurant.is_open === 1;

                      return (
                        <div
                          key={food.id}
                          className={`bg-white p-3 rounded-2xl border transition-all flex gap-3 relative ${
                            !isItemAvailable
                              ? 'border-rose-200 bg-rose-50/20 opacity-90'
                              : 'border-stone-200 shadow-2xs hover:border-orange-300'
                          }`}
                        >
                          <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-stone-100">
                            <img
                              src={food.photo_url}
                              alt={food.name}
                              className={`w-full h-full object-cover ${
                                !isItemAvailable ? 'grayscale-40' : ''
                              }`}
                            />
                            {/* Veg / Non-Veg Indicator */}
                            <span
                              className={`absolute top-1 left-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                food.is_veg ? 'bg-emerald-600' : 'bg-red-600'
                              }`}
                              title={food.is_veg ? 'Veg' : 'Non-Veg'}
                            />

                            {/* Stock Indicator Point on Image */}
                            {isItemAvailable ? (
                              <span
                                className="absolute top-1 right-1 flex items-center gap-1 bg-white/95 backdrop-blur-xs px-1.5 py-0.5 rounded-md text-[9px] font-black text-emerald-800 shadow-2xs border border-emerald-300"
                                title="In Stock (স্টকে আছে)"
                              >
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="hidden sm:inline">In Stock</span>
                              </span>
                            ) : (
                              <span
                                className="absolute top-1 right-1 flex items-center gap-1 bg-rose-600 text-white px-1.5 py-0.5 rounded-md text-[9px] font-black shadow-2xs"
                                title="Out of Stock (স্টক শেষ)"
                              >
                                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                                <span className="hidden sm:inline">Stock Out</span>
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="font-extrabold text-xs text-stone-900 leading-snug line-clamp-1">
                                  {language === 'bn' ? food.name_bn || food.name : food.name}
                                </h4>
                                
                                {/* Live Green / Red Stock Point Badge */}
                                {isItemAvailable ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300 shrink-0">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>{language === 'bn' ? 'স্টকে আছে' : 'In Stock'}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                                    <span>{language === 'bn' ? 'স্টক শেষ' : 'Out of Stock'}</span>
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-stone-600 line-clamp-2 mt-0.5 leading-tight">
                                {language === 'bn' ? food.description_bn || food.description : food.description}
                              </p>
                            </div>

                            <div className="flex items-center justify-between mt-2">
                              <div className="font-mono text-xs font-bold text-stone-900">
                                ₹{finalPrice}
                                {food.discount_price && (
                                  <span className="text-[10px] text-stone-400 line-through ml-1 font-normal">
                                    ₹{food.price}
                                  </span>
                                )}
                              </div>

                              {!isStoreOpen ? (
                                <span className="bg-stone-100 text-stone-500 border border-stone-300 px-2.5 py-1 rounded-full text-[11px] font-bold">
                                  Store Offline (দোকান বন্ধ)
                                </span>
                              ) : !isItemAvailable ? (
                                <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 border border-rose-300 px-3 py-1 rounded-full text-[11px] font-black shadow-2xs">
                                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                                  <span>Out of Stock (স্টক শেষ)</span>
                                </span>
                              ) : qty > 0 ? (
                                <div className="flex items-center gap-1.5 bg-orange-600 text-white rounded-full px-2 py-0.5 shadow-xs">
                                  <button
                                    onClick={() => updateQuantity(food.id, -1)}
                                    className="w-5 h-5 flex items-center justify-center font-bold cursor-pointer"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="text-xs font-bold w-4 text-center">{qty}</span>
                                  <button
                                    onClick={() => updateQuantity(food.id, 1)}
                                    className="w-5 h-5 flex items-center justify-center font-bold cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addItem(food, restaurant)}
                                  className="bg-orange-50 hover:bg-orange-600 text-orange-700 hover:text-white border border-orange-200 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>ADD +</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sticky Cart Bar if items present */}
        {totalQuantity > 0 && (
          <div className="p-3 bg-stone-900 text-white flex items-center justify-between px-6 border-t border-stone-800 shrink-0">
            <div>
              <div className="text-xs font-bold">{totalQuantity} Items in Cart</div>
              <div className="text-sm font-extrabold font-mono text-orange-400">₹{grandTotal}</div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenCart();
              }}
              className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-full shadow-lg cursor-pointer"
            >
              View Cart & Checkout →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
