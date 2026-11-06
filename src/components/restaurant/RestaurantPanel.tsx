import React, { useEffect, useState, useRef } from 'react';
import {
  Store,
  Clock,
  Plus,
  Trash2,
  Edit,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Power,
  Bell,
  Volume2,
  RefreshCw,
  TrendingUp,
  MapPin,
  Utensils,
  Upload,
  Image as ImageIcon,
  Camera,
  History,
  Search,
  Filter,
  Calendar,
  Tag,
  ShoppingBag,
  Phone,
  User,
  Check,
  XCircle,
  Truck,
  Eye,
  FileText,
  Navigation,
  ExternalLink,
  Package,
  PhoneCall,
  Bike,
  Building2,
  QrCode,
  CreditCard,
  Save,
  Sparkles
} from 'lucide-react';
import { Restaurant, Order, FoodItem } from '../../types';
import { apiRequest } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { playOrderAlertChime } from '../common/AudioAlerts';

export const RestaurantPanel: React.FC = () => {
  const { user, roleDetails } = useAuth();
  const { language } = useLanguage();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<FoodItem[]>([]);
  const [earnings, setEarnings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'self_delivery' | 'menu' | 'order_history' | 'earnings' | 'profile'>('orders');
  const [selfDeliveryFilter, setSelfDeliveryFilter] = useState<'active' | 'ready' | 'completed'>('active');
  const [deliveringOrderId, setDeliveringOrderId] = useState<number | null>(null);
  const [deliverySuccessMsg, setDeliverySuccessMsg] = useState<string | null>(null);
  const [isTogglingStore, setIsTogglingStore] = useState(false);

  // Restaurant Profile Tab State
  const [profileName, setProfileName] = useState('');
  const [profileNameBn, setProfileNameBn] = useState('');
  const [profileOwnerName, setProfileOwnerName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileCuisines, setProfileCuisines] = useState('');
  const [profileIsPureVeg, setProfileIsPureVeg] = useState(false);
  const [profileAvgDeliveryMinutes, setProfileAvgDeliveryMinutes] = useState('25');
  const [profileMinOrderAmount, setProfileMinOrderAmount] = useState('99');
  const [profileSelfDeliveryEnabled, setProfileSelfDeliveryEnabled] = useState(false);
  const [profileSelfDeliveryRadius, setProfileSelfDeliveryRadius] = useState('3');

  // 3 Photos for Restaurant (Auto-slides for customers)
  const [profilePhotos, setProfilePhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=1200',
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1200',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200'
  ]);

  // Payment Details for Restaurant
  const [profilePaymentMethod, setProfilePaymentMethod] = useState<'upi' | 'bank'>('upi');
  const [profileUpiId, setProfileUpiId] = useState('');
  const [profileUpiQrPhoto, setProfileUpiQrPhoto] = useState('');

  const [profileBankName, setProfileBankName] = useState('');
  const [profileBankAccountNo, setProfileBankAccountNo] = useState('');
  const [profileBankAccountHolder, setProfileBankAccountHolder] = useState('');
  const [profileBankIfsc, setProfileBankIfsc] = useState('');
  const [profileBankPassbookPhoto, setProfileBankPassbookPhoto] = useState('');

  // Restaurant Special Promocodes state
  const [restPromocodes, setRestPromocodes] = useState<any[]>([]);
  const [restPromoCode, setRestPromoCode] = useState('');
  const [restPromoDiscount, setRestPromoDiscount] = useState('10');
  const [restPromoMaxDisc, setRestPromoMaxDisc] = useState('50');
  const [restPromoMinSubtotal, setRestPromoMinSubtotal] = useState('100');
  const [isSavingRestPromo, setIsSavingRestPromo] = useState(false);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showRestSaveSuccessToast, setShowRestSaveSuccessToast] = useState(false);
  const [profileFeedbackMsg, setProfileFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Order History tab state & filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState<'all' | 'today' | '7days'>('all');
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);

  // Add dish modal state
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [isAddDishOpen, setIsAddDishOpen] = useState(false);
  const [newDishName, setNewDishName] = useState('');
  const [newDishNameBn, setNewDishNameBn] = useState('');
  const [newDishPrice, setNewDishPrice] = useState('');
  const [newDishDiscountPrice, setNewDishDiscountPrice] = useState('');
  const [newDishCategory, setNewDishCategory] = useState('Main Course');
  const [newDishIsVeg, setNewDishIsVeg] = useState(false);
  const [newDishPhoto, setNewDishPhoto] = useState('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500');
  const [newDishPrepMins, setNewDishPrepMins] = useState('15');

  // Edit dish modal state (Edit Name, Actual Price, Offer Price, Category, Veg/Non-Veg & Photo)
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editNameBn, setEditNameBn] = useState('');
  const [editCategory, setEditCategory] = useState('Main Course');
  const [editPrice, setEditPrice] = useState('');
  const [editDiscountPrice, setEditDiscountPrice] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editIsVeg, setEditIsVeg] = useState(false);
  const [editIsAvailable, setEditIsAvailable] = useState(true);
  const [isUpdatingDish, setIsUpdatingDish] = useState(false);

  const handleOpenEditModal = (food: FoodItem) => {
    setEditingFood(food);
    setEditName(food.name || '');
    setEditNameBn(food.name_bn || food.name || '');
    setEditCategory(food.category || 'Main Course');
    setEditPrice(String(food.price || ''));
    setEditDiscountPrice(food.discount_price ? String(food.discount_price) : '');
    setEditPhotoUrl(food.photo_url || '');
    setEditIsVeg(food.is_veg === 1 || (food.is_veg as any) === true);
    setEditIsAvailable(Number(food.is_available) === 1 || (food.is_available as any) === true || (food.is_available as any) === '1');
  };

  const handleEditFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const rawBase64 = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const maxDim = 1000;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setEditPhotoUrl(canvas.toDataURL('image/jpeg', 0.82));
          } else {
            setEditPhotoUrl(rawBase64);
          }
        };
        img.onerror = () => setEditPhotoUrl(rawBase64);
        img.src = rawBase64;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUpdatedDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !editingFood || !editPrice) return;
    setIsUpdatingDish(true);
    try {
      await apiRequest(`/api/restaurants/${restaurant.id}/menu/${editingFood.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName,
          name_bn: editNameBn,
          category: editCategory,
          price: Number(editPrice),
          discount_price: editDiscountPrice ? Number(editDiscountPrice) : null,
          photo_url: editPhotoUrl,
          is_veg: editIsVeg ? 1 : 0,
          is_available: editIsAvailable ? 1 : 0
        })
      });
      setEditingFood(null);
      fetchRestaurantData();
    } catch (err: any) {
      alert(err.message || 'Failed to update dish details');
    } finally {
      setIsUpdatingDish(false);
    }
  };

  // Pending order audio notification tracking
  const prevPendingCountRef = useRef(0);

  const fetchRestaurantData = async () => {
    try {
      // Find restaurant owned by current user or fallback
      let restData: Restaurant | null = null;
      try {
        const myRes = await apiRequest('/api/restaurants/my/current');
        if (myRes) {
          restData = myRes.data || myRes;
        }
      } catch {
        // Fallback to roleDetails or ID 1
        const restId = roleDetails?.id || 1;
        restData = await apiRequest(`/api/restaurants/${restId}`);
      }

      if (restData) {
        setRestaurant(restData);
        setMenu(restData.menu || []);
        const earningsData = await apiRequest(`/api/restaurants/${restData.id}/earnings`);
        setEarnings(earningsData);

        // Sync Profile state if not currently dirty/editing
        setProfileName((prev) => prev || restData.name || '');
        setProfileNameBn((prev) => prev || restData.name_bn || restData.name || '');
        setProfileOwnerName((prev) => prev || restData.owner_name || user?.name || '');
        setProfilePhone((prev) => prev || restData.phone || user?.phone || '');
        setProfileEmail((prev) => prev || restData.email || user?.email || '');
        setProfileAddress((prev) => prev || restData.address || '');
        setProfileCuisines((prev) => prev || (restData.cuisine_types || []).join(', '));
        setProfileIsPureVeg(Number(restData.is_pure_veg) === 1);
        setProfileAvgDeliveryMinutes(String(restData.avg_delivery_minutes || 25));
        setProfileMinOrderAmount(String(restData.min_order_amount || 99));
        setProfileSelfDeliveryEnabled(Number(restData.self_delivery_enabled) === 1);
        setProfileSelfDeliveryRadius(String(restData.self_delivery_radius_km || 3));

        if (restData.photos && Array.isArray(restData.photos) && restData.photos.length > 0) {
          setProfilePhotos(restData.photos);
        } else if (restData.banner_url || restData.photo_url) {
          setProfilePhotos([
            restData.banner_url || restData.photo_url,
            restData.photo_url,
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200'
          ]);
        }

        setProfilePaymentMethod((restData.payment_method as any) === 'bank' ? 'bank' : 'upi');
        setProfileUpiId(restData.upi_id || '');
        setProfileUpiQrPhoto(restData.upi_qr_photo || '');
        setProfileBankName(restData.bank_name || '');
        setProfileBankAccountNo(restData.bank_account_no || '');
        setProfileBankAccountHolder(restData.bank_account_holder || restData.owner_name || restData.name || '');
        setProfileBankIfsc(restData.bank_ifsc || '');
        setProfileBankPassbookPhoto(restData.bank_passbook_photo || '');
        if (restData.promocodes && Array.isArray(restData.promocodes)) {
          setRestPromocodes(restData.promocodes);
        }
      }

      const ordersData: Order[] = await apiRequest('/api/orders');
      setOrders(ordersData);

      try {
        const catsData = await apiRequest('/api/categories');
        if (catsData && Array.isArray(catsData)) {
          setAvailableCategories(catsData);
        }
      } catch (err) {
        console.error('Fetch categories error:', err);
      }

      // Check for incoming orders to chime audio
      const pendingCount = ordersData.filter((o) => o.status === 'pending').length;
      if (pendingCount > prevPendingCountRef.current) {
        playOrderAlertChime();
      }
      prevPendingCountRef.current = pendingCount;
    } catch (e) {
      console.error('Restaurant data fetch error:', e);
    }
  };

  useEffect(() => {
    fetchRestaurantData();
    const interval = setInterval(fetchRestaurantData, 5000);
    return () => clearInterval(interval);
  }, [roleDetails, user]);

  const handleSaveRestPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !restPromoCode.trim()) return;
    setIsSavingRestPromo(true);
    try {
      const res = await apiRequest('/api/coupons/restaurant', {
        method: 'POST',
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          code: restPromoCode.trim().toUpperCase(),
          discount_percentage: Number(restPromoDiscount) || 10,
          max_discount: Number(restPromoMaxDisc) || 50,
          min_order_amount: Number(restPromoMinSubtotal) || 100,
          is_active: 1
        })
      });
      if (res.success) {
        setRestPromoCode('');
        fetchRestaurantData();
        alert(res.message || 'Restaurant Promocode saved!');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save promocode');
    } finally {
      setIsSavingRestPromo(false);
    }
  };

  const handleDeleteRestPromo = async (code: string) => {
    if (!restaurant || !confirm(`Delete promocode ${code}?`)) return;
    try {
      const res = await apiRequest(`/api/coupons/restaurant/${restaurant.id}/${code}`, {
        method: 'DELETE'
      });
      if (res.success) {
        fetchRestaurantData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete promocode');
    }
  };

  const hasSelfDelivery = Number(restaurant?.self_delivery_enabled) === 1;

  useEffect(() => {
    if (restaurant && !hasSelfDelivery && activeTab === 'self_delivery') {
      setActiveTab('orders');
    }
  }, [restaurant, hasSelfDelivery, activeTab]);

  // Store Online / Offline Direct Toggle (ক্লিক করলেই সরাসরি স্টোর ওপেন / ক্লোজ হবে)
  const handleToggleStoreOpen = async () => {
    if (!restaurant || isTogglingStore) return;
    const currentOpen = Number(restaurant.is_open) === 1;
    const nextOpen = currentOpen ? 0 : 1;
    setIsTogglingStore(true);

    // Optimistic instant local update so the button responds in 0ms!
    setRestaurant((prev) => (prev ? { ...prev, is_open: nextOpen } : null));

    try {
      const res = await apiRequest(`/api/restaurants/${restaurant.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_open: nextOpen })
      });
      if (res && res.data) {
        setRestaurant(res.data);
      }
      setDeliverySuccessMsg(
        nextOpen === 1
          ? '🟢 STORE OPENED: আপনার রেস্তোরাঁ এখন অনলাইন! গ্রাহকরা সরাসরি অর্ডার দিতে পারবেন।'
          : '⚪ STORE CLOSED: আপনার রেস্তোরাঁ এখন বন্ধ (অফলাইন) করা হয়েছে।'
      );
      setTimeout(() => setDeliverySuccessMsg(null), 4000);
    } catch (e: any) {
      // Revert optimistic update on error
      setRestaurant((prev) => (prev ? { ...prev, is_open: currentOpen ? 1 : 0 } : null));
      setDeliverySuccessMsg(`❌ স্ট্যাটাস পরিবর্তন ব্যর্থ: ${e.message || 'Error updating status'}`);
      setTimeout(() => setDeliverySuccessMsg(null), 5000);
    } finally {
      setIsTogglingStore(false);
    }
  };

  // Profile Photo and Payment Attachment Handlers
  const handlePhotoUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setProfilePhotos((prev) => {
          const next = [...prev];
          next[index] = base64;
          return next;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpiQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileUpiQrPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePassbookPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileBankPassbookPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveRestaurantProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setIsSavingProfile(true);
    setProfileFeedbackMsg(null);

    const cuisinesArray = profileCuisines
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const payload = {
      name: profileName,
      name_bn: profileNameBn,
      owner_name: profileOwnerName,
      phone: profilePhone,
      email: profileEmail,
      address: profileAddress,
      cuisine_types: cuisinesArray,
      is_pure_veg: profileIsPureVeg ? 1 : 0,
      avg_delivery_minutes: Number(profileAvgDeliveryMinutes) || 25,
      min_order_amount: Number(profileMinOrderAmount) || 99,
      self_delivery_enabled: profileSelfDeliveryEnabled ? 1 : 0,
      self_delivery_radius_km: Number(profileSelfDeliveryRadius) || 3,
      photo_url: profilePhotos[0] || restaurant.photo_url,
      banner_url: profilePhotos[0] || restaurant.banner_url,
      photos: profilePhotos.filter(Boolean),
      payment_method: profilePaymentMethod,
      upi_id: profileUpiId,
      upi_qr_photo: profileUpiQrPhoto,
      bank_name: profileBankName,
      bank_account_no: profileBankAccountNo,
      bank_account_holder: profileBankAccountHolder,
      bank_ifsc: profileBankIfsc,
      bank_passbook_photo: profileBankPassbookPhoto
    };

    try {
      const res = await apiRequest(`/api/restaurants/${restaurant.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (res && res.data) {
        const saved = res.data;
        setRestaurant(saved);
        setProfileName(saved.name || '');
        setProfileNameBn(saved.name_bn || saved.name || '');
        setProfileOwnerName(saved.owner_name || '');
        setProfilePhone(saved.phone || '');
        setProfileEmail(saved.email || '');
        setProfileAddress(saved.address || '');
        setProfileCuisines((saved.cuisine_types || []).join(', '));
        setProfileIsPureVeg(Number(saved.is_pure_veg) === 1);
        setProfileAvgDeliveryMinutes(String(saved.avg_delivery_minutes || 25));
        setProfileMinOrderAmount(String(saved.min_order_amount || 99));
        setProfileSelfDeliveryEnabled(Number(saved.self_delivery_enabled) === 1);
        setProfileSelfDeliveryRadius(String(saved.self_delivery_radius_km || 3));
        setProfilePaymentMethod((saved.payment_method as any) === 'bank' ? 'bank' : 'upi');
        setProfileUpiId(saved.upi_id || '');
        setProfileUpiQrPhoto(saved.upi_qr_photo || '');
        setProfileBankName(saved.bank_name || '');
        setProfileBankAccountNo(saved.bank_account_no || '');
        setProfileBankAccountHolder(saved.bank_account_holder || saved.owner_name || saved.name || '');
        setProfileBankIfsc(saved.bank_ifsc || '');
        setProfileBankPassbookPhoto(saved.bank_passbook_photo || '');
      }
      setProfileFeedbackMsg({
        type: 'success',
        text: '✅ রেস্তোরাঁর পেমেন্ট মেথড ও প্রোফাইল সফলভাবে সেভ হয়েছে! (Payment Details Saved Successfully)'
      });
      setShowRestSaveSuccessToast(true);
      setTimeout(() => {
        setProfileFeedbackMsg(null);
        setShowRestSaveSuccessToast(false);
      }, 5000);
      fetchRestaurantData();
    } catch (err: any) {
      setProfileFeedbackMsg({
        type: 'error',
        text: `❌ সেভ করতে সমস্যা হয়েছে: ${err.message || 'Error updating profile'}`
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string, prepMins?: number) => {
    try {
      await apiRequest(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, preparation_minutes: prepMins })
      });
      fetchRestaurantData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRequestDeliveryPartner = async (orderId: number) => {
    try {
      const res = await apiRequest(`/api/orders/${orderId}/request-rider`, {
        method: 'POST'
      });
      setDeliverySuccessMsg(res.message || 'Delivery partner requested successfully!');
      fetchRestaurantData();
      setTimeout(() => setDeliverySuccessMsg(null), 5000);
    } catch (e: any) {
      alert(e.message || 'Failed to request delivery partner');
    }
  };

  const handleHandoverToRider = async (orderId: number) => {
    try {
      const res = await apiRequest(`/api/orders/${orderId}/handover-to-rider`, {
        method: 'POST'
      });
      setDeliverySuccessMsg(res.message || 'খাবার রাইডারকে বুঝিয়ে দেওয়া হয়েছে!');
      fetchRestaurantData();
      setTimeout(() => setDeliverySuccessMsg(null), 5000);
    } catch (e: any) {
      alert(e.message || 'Failed to handover to rider');
    }
  };

  const handleMarkOutForDelivery = async (orderId: number) => {
    if (!hasSelfDelivery) {
      alert('Your restaurant is registered with Platform Rider delivery. Only delivery partners can mark orders out for delivery.');
      return;
    }
    try {
      await apiRequest(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'on_the_way',
          is_self_delivery: 1,
          delivery_mode: 'self_delivery'
        })
      });
      fetchRestaurantData();
      setActiveTab('self_delivery');
      setSelfDeliveryFilter('active');
    } catch (e: any) {
      alert(e.message || 'Failed to mark out for delivery');
    }
  };

  const handleMarkDeliveredBySelf = async (orderId: number, orderNumber?: string) => {
    setDeliveringOrderId(orderId);
    try {
      await apiRequest(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'delivered',
          is_self_delivery: 1
        })
      });
      await fetchRestaurantData();
      setDeliverySuccessMsg(`🎉 Order #${orderNumber || orderId} successfully marked as DELIVERED! (অর্ডার ডেলিভারি সফলভাবে সম্পন্ন হয়েছে)`);
      setTimeout(() => setDeliverySuccessMsg(null), 6000);
    } catch (e: any) {
      console.error('Failed to mark delivered:', e);
      setDeliverySuccessMsg(`❌ Delivery update failed: ${e.message || 'Error occurred'}`);
      setTimeout(() => setDeliverySuccessMsg(null), 6000);
    } finally {
      setDeliveringOrderId(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const rawBase64 = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const maxDim = 1000;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setNewDishPhoto(canvas.toDataURL('image/jpeg', 0.82));
          } else {
            setNewDishPhoto(rawBase64);
          }
        };
        img.onerror = () => setNewDishPhoto(rawBase64);
        img.src = rawBase64;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !newDishName || !newDishPrice) return;

    try {
      let categoryBn = 'মূল খাবার';
      if (newDishCategory === 'Sweets') categoryBn = 'মিষ্টি';
      else if (newDishCategory === 'Beverages') categoryBn = 'পানীয়';
      else if (newDishCategory === 'Breads') categoryBn = 'রুটি ও নান';
      else if (newDishCategory === 'Starters') categoryBn = 'স্ন্যাক্স';
      else if (newDishCategory === 'Rice') categoryBn = 'রাইস ও বিরিয়ানি';

      await apiRequest(`/api/restaurants/${restaurant.id}/menu`, {
        method: 'POST',
        body: JSON.stringify({
          name: newDishName,
          name_bn: newDishNameBn || newDishName,
          category: newDishCategory,
          category_bn: categoryBn,
          price: Number(newDishPrice),
          discount_price: newDishDiscountPrice ? Number(newDishDiscountPrice) : null,
          is_veg: newDishIsVeg ? 1 : 0,
          photo_url: newDishPhoto,
          preparation_minutes: Number(newDishPrepMins)
        })
      });

      setIsAddDishOpen(false);
      setNewDishName('');
      setNewDishNameBn('');
      setNewDishPrice('');
      setNewDishDiscountPrice('');
      fetchRestaurantData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleDishAvailability = async (foodId: number, currentAvailable: any) => {
    if (!restaurant) return;
    const isCurrentlyInStock = Number(currentAvailable) === 1 || currentAvailable === true || currentAvailable === '1';
    const newStatus = isCurrentlyInStock ? 0 : 1;

    // 1. Optimistically update local state immediately so user sees instant green/red change!
    setMenu((prevMenu) =>
      prevMenu.map((f) => (f.id === foodId ? { ...f, is_available: newStatus } : f))
    );

    try {
      await apiRequest(`/api/restaurants/${restaurant.id}/menu/${foodId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_available: newStatus })
      });
      fetchRestaurantData();
    } catch (e: any) {
      alert(e.message || 'Failed to update stock status');
      fetchRestaurantData();
    }
  };

  const handleDeleteDish = async (foodId: number) => {
    if (!restaurant) return;
    try {
      await apiRequest(`/api/restaurants/${restaurant.id}/menu/${foodId}`, {
        method: 'DELETE'
      });
      fetchRestaurantData();
      setDeliverySuccessMsg('খাবার আইটেমটি সফলভাবে মুছে ফেলা হয়েছে।');
      setTimeout(() => setDeliverySuccessMsg(null), 4000);
    } catch (e: any) {
      setDeliverySuccessMsg(`মুছে ফেলতে ব্যর্থ: ${e.message}`);
      setTimeout(() => setDeliverySuccessMsg(null), 4000);
    }
  };

  if (!restaurant) {
    return (
      <div className="min-h-screen p-8 text-center text-stone-500">
        Loading restaurant management console...
      </div>
    );
  }

  const isStoreOpen = Number(restaurant.is_open) === 1;

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  // Kitchen cooking in progress (accepted / preparing)
  const preparingOrders = orders.filter(
    (o) => ['accepted', 'preparing'].includes(o.status) && o.status !== 'ready'
  );
  // Ship to Rider: food is ready or rider assigned awaiting handover
  const shipToRiderOrders = orders.filter(
    (o) =>
      (o.status === 'ready' || (o.status === 'assigned' && !o.is_handed_over)) &&
      !['picked_up', 'on_the_way', 'delivered', 'cancelled'].includes(o.status)
  );
  // Out on road delivering
  const activeDeliveryOrders = orders.filter(
    (o) =>
      ['picked_up', 'on_the_way'].includes(o.status) ||
      (o.status === 'assigned' && Boolean(o.is_handed_over))
  );
  const completedOrders = orders.filter((o) => o.status === 'delivered');

  // Self Delivery Lists:
  // 1. On The Road (চলমান ডেলিভারি)
  const activeSelfDeliveries = orders.filter(
    (o) => (o.is_self_delivery || o.delivery_mode === 'self_delivery') && (o.status === 'on_the_way' || o.status === 'picked_up')
  );
  // 2. Ready in kitchen for dispatch (প্রস্তুত খাবার)
  const readySelfDeliveries = orders.filter(
    (o) => (o.status === 'ready' || o.status === 'preparing') && !o.delivery_partner_id
  );
  // 3. Completed Self Deliveries (সম্পন্ন নিজস্ব ডেলিভারি)
  const completedSelfDeliveries = orders.filter(
    (o) => (o.is_self_delivery || o.delivery_mode === 'self_delivery') && o.status === 'delivered'
  );

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Alarm Notification Banner for Pending Orders */}
      {pendingOrders.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 via-red-700 to-orange-600 text-white p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl font-bold animate-pulse">
              🔔
            </div>
            <div>
              <h4 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <span>নতুন অর্ডার অ্যালার্ম এসেছে! ({pendingOrders.length}টি পেন্ডিং অর্ডার)</span>
              </h4>
              <p className="text-xs text-red-100">
                দয়া করে এখনই অর্ডারটি কনফার্ম বা গ্রহণ (Accept) করুন খাবার প্রস্তুতের জন্য।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={playOrderAlertChime}
              className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>প্লে সাউন্ড</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className="bg-white text-red-700 hover:bg-red-50 font-black text-xs px-4 py-2 rounded-xl shadow-md cursor-pointer"
            >
              অর্ডার দেখুন →
            </button>
          </div>
        </div>
      )}

      {/* Restaurant Header Banner */}
      <div className="bg-white border-b border-stone-200 py-4 px-4 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={restaurant.photo_url}
              alt={restaurant.name}
              className="w-14 h-14 rounded-2xl object-cover border border-stone-200 shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-stone-900 leading-tight">
                  {restaurant.name}
                </h1>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    restaurant.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {restaurant.status}
                </span>
              </div>
              <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                <span>{restaurant.address}</span>
              </p>
            </div>
          </div>

          {/* Quick controls: Store Open/Closed Toggle + Test Sound */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Delivery mode informative badge based on registration setting (NO yes/no toggle in restaurant panel) */}
            {hasSelfDelivery ? (
              <div
                className="bg-orange-50 border border-orange-200/90 rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-xs shadow-2xs"
                title="রেজিস্ট্রেশনের সময় সেলফ ডেলিভারি চালু করা হয়েছে"
              >
                <Truck className="w-3.5 h-3.5 text-orange-600" />
                <span className="font-extrabold text-orange-950">Self Delivery:</span>
                <span className="text-[10px] font-black text-orange-900 bg-white border border-orange-200 px-2 py-0.5 rounded-md">
                  {restaurant.self_delivery_radius_km || 3} KM
                </span>
              </div>
            ) : (
              <div
                className="bg-stone-100 border border-stone-200/90 rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-xs text-stone-700 shadow-2xs"
                title="রেজিস্ট্রেশনের সময় সেলফ ডেলিভারি বন্ধ রাখা হয়েছে; প্ল্যাটফর্ম রাইডার ডেলিভারি করবে"
              >
                <Truck className="w-3.5 h-3.5 text-stone-500" />
                <span className="font-extrabold text-stone-800">Platform Delivery</span>
              </div>
            )}

            <button
              onClick={() => playOrderAlertChime()}
              className="p-2 text-stone-500 hover:text-stone-800 bg-stone-100 rounded-xl hover:bg-stone-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              title="Test Incoming Order Alert Sound"
            >
              <Volume2 className="w-4 h-4 text-orange-600" />
              <span className="hidden sm:inline">Test Alert</span>
            </button>

            {/* Direct Store Open/Close Toggle Button */}
            <button
              type="button"
              onClick={handleToggleStoreOpen}
              disabled={isTogglingStore}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer disabled:opacity-60 active:scale-95 ${
                isStoreOpen
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-500/20'
                  : 'bg-stone-200 text-stone-800 hover:bg-stone-300 ring-2 ring-stone-400/20'
              }`}
              title={
                isStoreOpen
                  ? 'রেস্তোরাঁ বর্তমানে খোলা (অনলাইন)। বন্ধ করতে ক্লিক করুন।'
                  : 'রেস্তোরাঁ বন্ধ (অফলাইন)। অনলাইন করতে ক্লিক করুন।'
              }
            >
              <Power
                className={`w-4 h-4 ${
                  isTogglingStore
                    ? 'animate-spin text-white'
                    : isStoreOpen
                    ? 'text-emerald-100 animate-pulse'
                    : 'text-stone-500'
                }`}
              />
              <span>
                {isTogglingStore
                  ? 'আপডেট হচ্ছে...'
                  : isStoreOpen
                  ? '🟢 STORE IS OPEN (অনলাইন)'
                  : '⚪ STORE IS CLOSED (অফলাইন)'}
              </span>
            </button>
          </div>
        </div>

        {/* Success / Status Banner */}
        {deliverySuccessMsg && (
          <div className="max-w-7xl mx-auto mt-3">
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in">
              <span>{deliverySuccessMsg}</span>
              <button
                onClick={() => setDeliverySuccessMsg(null)}
                className="text-emerald-700 hover:text-emerald-950 font-black ml-2"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Tab Bar */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-4 pt-2 border-t border-stone-100 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-200'
            }`}
          >
            <span>Live Kitchen Orders</span>
            {pendingOrders.length > 0 && (
              <span className="w-5 h-5 bg-white text-orange-700 text-[10px] font-black rounded-full flex items-center justify-center animate-bounce">
                {pendingOrders.length}
              </span>
            )}
          </button>

          {hasSelfDelivery && (
            <button
              onClick={() => setActiveTab('self_delivery')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'self_delivery'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-200'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Self Delivery (নিজস্ব ডেলিভারি)</span>
              {activeSelfDeliveries.length > 0 && (
                <span className="w-5 h-5 bg-white text-orange-700 text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {activeSelfDeliveries.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'menu'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-200'
            }`}
          >
            Menu Management ({menu.length})
          </button>

          <button
            onClick={() => setActiveTab('order_history')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'order_history'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Order History (অর্ডার হিস্ট্রি)</span>
          </button>

          <button
            onClick={() => setActiveTab('earnings')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'earnings'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-200'
            }`}
          >
            Sales & Payout Ledger
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile (প্রোফাইল ও পেমেন্ট)</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* TAB 1: LIVE KITCHEN ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* New Pending Orders Alert */}
            {pendingOrders.length > 0 && (
              <div className="bg-amber-500 text-white p-4 rounded-3xl shadow-lg animate-pulse">
                <div className="flex items-center gap-2 text-sm font-black">
                  <Bell className="w-5 h-5" />
                  <span>ACTION REQUIRED: {pendingOrders.length} New Order(s) Awaiting Confirmation!</span>
                </div>
              </div>
            )}

            {/* Orders Kanban Grid: 3 Dedicated Stages (Pending -> Preparing -> Ship to Rider) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Column 1: Pending Acceptance */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b-2 border-amber-500">
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-stone-700">
                    1. Pending ({pendingOrders.length})
                  </h3>
                  <span className="text-[10px] text-amber-700 bg-amber-100 font-bold px-2 py-0.5 rounded">
                    Incoming
                  </span>
                </div>

                {pendingOrders.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center text-xs text-stone-400 border border-stone-200">
                    No new pending orders
                  </div>
                ) : (
                  pendingOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-white rounded-2xl p-4 border-2 border-amber-400 shadow-md space-y-3 animate-in fade-in"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-stone-900">
                          {ord.order_number}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {ord.is_self_delivery || ord.delivery_mode === 'self_delivery' ? (
                            <span className="text-[9px] font-black bg-orange-100 text-orange-900 border border-orange-200 px-1.5 py-0.5 rounded">
                              🚴‍♂️ Self Delivery
                            </span>
                          ) : (
                            <span className="text-[9px] font-black bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded">
                              🛵 Platform Rider
                            </span>
                          )}
                          <span className="font-mono text-xs font-bold text-orange-600">
                            ₹{ord.grand_total}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-stone-800 space-y-1">
                        {ord.items.map((item, i) => (
                          <div key={i} className="flex justify-between font-medium">
                            <span>
                              {item.quantity}x {item.food_name}
                            </span>
                            <span className="font-mono text-stone-500">₹{item.total_price}</span>
                          </div>
                        ))}
                      </div>

                      <div className="bg-stone-50 p-2 rounded-xl text-[11px] font-medium text-stone-600 flex items-center justify-between border border-stone-100">
                        <span>রেস্তোরাঁর প্রাপ্য:</span>
                        <span className="font-mono font-black text-emerald-700">
                          ₹{(ord as any).net_restaurant_amount || Math.round(ord.subtotal * 0.85)}
                        </span>
                      </div>

                      {ord.customer_notes && (
                        <div className="text-[11px] bg-stone-50 p-2 rounded-lg text-stone-600 italic">
                          Note: "{ord.customer_notes}"
                        </div>
                      )}

                      {/* Non-self-delivery Rider Alert Status */}
                      {!ord.is_self_delivery && ord.delivery_mode !== 'self_delivery' && (
                        <div className="bg-blue-50/90 border border-blue-200 p-2.5 rounded-xl space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-black text-blue-900">
                            <span className="flex items-center gap-1">
                              <Bike className="w-3.5 h-3.5 text-blue-600" />
                              <span>Platform Rider Dispatch</span>
                            </span>
                            {ord.delivery_partner_id ? (
                              <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-black text-[10px]">
                                ✓ Rider Accepted
                              </span>
                            ) : (
                              <span className="text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-black text-[10px] animate-pulse">
                                ⏳ Rider Acceptance Pending
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-blue-800 leading-tight">
                            {ord.delivery_partner_id
                              ? `রাইডার ${ord.delivery_partner_name} (ফোন: ${ord.delivery_partner_phone}) অর্ডার গ্রহণ করেছেন।`
                              : `নিকটবর্তী রাইডারদের কাছে নোটিফিকেশন পাঠানো হয়েছে। ডেলিভারি পার্টনার গ্রহণ করলেই অর্ডার কনফার্ম হবে।`}
                          </p>
                        </div>
                      )}

                      {/* Accept / Reject actions */}
                      <div className="pt-2 border-t border-stone-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-stone-500">
                            Accept with Prep Time:
                          </span>
                          {!ord.is_self_delivery && (
                            <button
                              onClick={() => handleRequestDeliveryPartner(ord.id)}
                              className="text-[10px] font-black text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Bell className="w-3 h-3" />
                              <span>Alert Riders</span>
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'accepted', 15)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-1.5 rounded-xl shadow-2xs cursor-pointer"
                          >
                            15 Mins
                          </button>
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'accepted', 25)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-1.5 rounded-xl shadow-2xs cursor-pointer"
                          >
                            25 Mins
                          </button>
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'accepted', 40)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-1.5 rounded-xl shadow-2xs cursor-pointer"
                          >
                            40 Mins
                          </button>
                        </div>

                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'cancelled')}
                          className="w-full text-stone-400 hover:text-red-600 text-xs font-bold py-1 hover:underline cursor-pointer"
                        >
                          Reject Order
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Column 2: Kitchen Preparing / Cooking */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b-2 border-orange-500">
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-stone-700">
                    2. Preparing ({preparingOrders.length})
                  </h3>
                  <span className="text-[10px] text-orange-700 bg-orange-100 font-bold px-2 py-0.5 rounded">
                    Kitchen
                  </span>
                </div>

                {preparingOrders.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center text-xs text-stone-400 border border-stone-200">
                    No orders currently cooking
                  </div>
                ) : (
                  preparingOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-stone-900">
                          {ord.order_number}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {ord.is_self_delivery || ord.delivery_mode === 'self_delivery' ? (
                            <span className="text-[9px] font-black bg-orange-100 text-orange-900 border border-orange-200 px-1.5 py-0.5 rounded">
                              🚴‍♂️ Self Delivery
                            </span>
                          ) : (
                            <span className="text-[9px] font-black bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded">
                              🛵 Platform Rider
                            </span>
                          )}
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                            {ord.status}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-stone-800 space-y-1">
                        {ord.items.map((item, i) => (
                          <div key={i} className="flex justify-between">
                            <span className="font-bold">
                              {item.quantity}x {item.food_name}
                            </span>
                            <span className="font-mono text-stone-500">₹{item.total_price}</span>
                          </div>
                        ))}
                      </div>

                      <div className="bg-stone-50 p-2 rounded-xl text-[11px] font-medium text-stone-600 flex items-center justify-between border border-stone-100">
                        <span>রেস্তোরাঁর নিট প্রাপ্য:</span>
                        <span className="font-mono font-black text-emerald-700">
                          ₹{(ord as any).net_restaurant_amount || Math.round(ord.subtotal * 0.85)}
                        </span>
                      </div>

                      {/* Rider Status & Contact in Preparing Stage */}
                      {!ord.is_self_delivery && ord.delivery_mode !== 'self_delivery' && (
                        <div className="bg-emerald-50/90 border border-emerald-200 p-2.5 rounded-xl space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-black">
                            <span className="text-emerald-900 flex items-center gap-1">
                              <Bike className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Assigned Rider:</span>
                            </span>
                            {ord.delivery_partner_id ? (
                              <span className="text-emerald-800 bg-emerald-200/80 px-1.5 py-0.2 rounded font-black text-[10px]">
                                ✓ Accepted & Heading Here
                              </span>
                            ) : (
                              <span className="text-amber-800 bg-amber-200/80 px-1.5 py-0.2 rounded font-black text-[10px] animate-pulse">
                                ⏳ Awaiting Rider Acceptance
                              </span>
                            )}
                          </div>
                          {ord.delivery_partner_id ? (
                            <div className="text-[11px] text-stone-800 font-bold flex flex-wrap items-center justify-between gap-1 pt-0.5">
                              <span>🛵 {ord.delivery_partner_name}</span>
                              {ord.delivery_partner_phone && (
                                <a
                                  href={`tel:${ord.delivery_partner_phone}`}
                                  className="text-emerald-700 hover:text-emerald-900 font-black inline-flex items-center gap-1 hover:underline text-[11px]"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{ord.delivery_partner_phone}</span>
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] text-stone-600">রাইডার অর্ডার গ্রহণ করলেই নাম ও ফোন দেখতে পাবেন</span>
                              <button
                                onClick={() => handleRequestDeliveryPartner(ord.id)}
                                className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-lg hover:bg-blue-700 cursor-pointer"
                              >
                                Re-alert
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="pt-2 border-t border-stone-100 space-y-2">
                        {ord.status === 'accepted' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'preparing')}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs py-2 rounded-xl shadow-2xs cursor-pointer"
                          >
                            Mark: Cooking Now (রান্না শুরু হয়েছে)
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'ready')}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-xs py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>Food Ready → Send to Ship Section (শিপ সেকশনে পাঠান)</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Column 3: Ship to Rider / Handover (খাবার প্রস্তুত - রাইডারকে শিপ করুন) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b-2 border-purple-500">
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-purple-900 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-purple-600" />
                    <span>3. Ship to Rider ({shipToRiderOrders.length})</span>
                  </h3>
                  <span className="text-[10px] text-purple-700 bg-purple-100 font-bold px-2 py-0.5 rounded">
                    Handover
                  </span>
                </div>

                {shipToRiderOrders.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center text-xs text-stone-400 border border-stone-200">
                    No orders waiting to ship
                  </div>
                ) : (
                  shipToRiderOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-white rounded-2xl p-4 border-2 border-purple-300 shadow-md space-y-3 animate-in fade-in"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-stone-900">
                          {ord.order_number}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {ord.is_self_delivery || ord.delivery_mode === 'self_delivery' ? (
                            <span className="text-[9px] font-black bg-orange-100 text-orange-900 border border-orange-200 px-1.5 py-0.5 rounded">
                              🚴‍♂️ Self Delivery
                            </span>
                          ) : (
                            <span className="text-[9px] font-black bg-purple-100 text-purple-900 border border-purple-200 px-1.5 py-0.5 rounded">
                              📦 Ship to Rider
                            </span>
                          )}
                          <span className="font-mono text-xs font-bold text-orange-600">
                            ₹{ord.grand_total}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-stone-800 space-y-1">
                        {ord.items.map((item, i) => (
                          <div key={i} className="flex justify-between">
                            <span className="font-bold">
                              {item.quantity}x {item.food_name}
                            </span>
                            <span className="font-mono text-stone-500">₹{item.total_price}</span>
                          </div>
                        ))}
                      </div>

                      <div className="text-center text-xs font-extrabold text-emerald-800 bg-emerald-50 py-1.5 rounded-xl border border-emerald-200">
                        ✓ Food Ready & Packed (খাবার প্রস্তুত ও প্যাকড)
                      </div>

                      {/* Ship to Rider / Handover Action Controls */}
                      {hasSelfDelivery && (ord.is_self_delivery || ord.delivery_mode === 'self_delivery') ? (
                        <div className="pt-2 border-t border-stone-100 space-y-2">
                          <button
                            type="button"
                            onClick={() => handleMarkOutForDelivery(ord.id)}
                            className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                          >
                            <Truck className="w-4 h-4" />
                            <span>🚀 Ship Self Delivery (নিজস্ব ডেলিভারিতে বের হোন)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRequestDeliveryPartner(ord.id)}
                            className="w-full text-[11px] text-blue-700 hover:text-blue-900 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/80 py-1.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Bike className="w-3.5 h-3.5 text-blue-600" />
                            <span>প্ল্যাটফর্ম রাইডারকে রিকোয়েস্ট পাঠান (Request Platform Rider)</span>
                          </button>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-stone-100 space-y-2">
                          {ord.delivery_partner_name ? (
                            <div className="bg-purple-50 p-3 rounded-2xl border border-purple-200 text-xs space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="font-black text-purple-950 flex items-center gap-1.5">
                                  <Truck className="w-4 h-4 text-purple-700" />
                                  <span>Rider: {ord.delivery_partner_name}</span>
                                </div>
                                <span className="text-[10px] bg-purple-200 text-purple-900 font-extrabold px-2 py-0.5 rounded-md">
                                  {ord.is_handed_over ? 'Handed Over ✓' : 'At Restaurant'}
                                </span>
                              </div>

                              {ord.delivery_partner_phone && (
                                <div className="flex items-center justify-between pt-0.5">
                                  <a
                                    href={`tel:${ord.delivery_partner_phone}`}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-900 hover:underline bg-white px-2 py-1 rounded-lg border border-purple-200"
                                  >
                                    <Phone className="w-3 h-3 text-purple-600" />
                                    <span>📞 {ord.delivery_partner_phone}</span>
                                  </a>
                                  <span className="text-[10px] text-stone-500">Contact Rider</span>
                                </div>
                              )}

                              {ord.is_handed_over ? (
                                <div className="text-center font-bold text-[11px] text-emerald-800 bg-white py-1.5 rounded-xl border border-emerald-200">
                                  ✓ খাবার রাইডারকে বুঝিয়ে দেওয়া হয়েছে
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleHandoverToRider(ord.id)}
                                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                                >
                                  <span>🤝 Ship to Rider / Handover (রাইডারকে খাবার দিন)</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {ord.rider_requested ? (
                                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs space-y-1.5">
                                  <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                    <span>রাইডারের অপেক্ষা... (নিকটবর্তী রাইডারদের অ্যালার্ট পাঠানো হয়েছে)</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRequestDeliveryPartner(ord.id)}
                                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] py-1.5 rounded-lg shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <span>🔔 Re-alert Riders (পুনরায় নোটিফিকেশন দিন)</span>
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRequestDeliveryPartner(ord.id)}
                                  className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs py-2.5 rounded-xl shadow-md border border-stone-800 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                                >
                                  <Truck className="w-4 h-4 text-amber-400" />
                                  <span>🛵 Request to Rider (রাইডার খুঁজুন)</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SELF DELIVERY (নিজস্ব ডেলিভারি কনসোল) - শুধুমাত্র রেজিস্ট্রেশনের সময় YES করা রেস্তোরাঁ পাবে */}
        {activeTab === 'self_delivery' && hasSelfDelivery && (
          <div className="space-y-6 animate-in fade-in">
            {/* Delivery Success In-App Toast Banner */}
            {deliverySuccessMsg && (
              <div className="bg-emerald-600 text-white font-bold text-xs sm:text-sm px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <span>{deliverySuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeliverySuccessMsg(null)}
                  className="p-1 hover:bg-emerald-700 rounded-lg text-emerald-100 hover:text-white cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Header Hero Banner */}
            <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 rounded-3xl p-5 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-white shadow-inner">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                      <span>Restaurant Self-Delivery Console</span>
                      <span className="text-[10px] bg-white text-orange-800 font-extrabold px-2 py-0.5 rounded-full uppercase">
                        Rider Mode
                      </span>
                    </h3>
                    <p className="text-xs text-orange-100">
                      ডেলিভারি পার্টনারের মতোই নিজস্ব লোক দিয়ে খাবার পৌঁছে দিন, কাস্টমারকে কল করুন ও ডেলিভারি মার্ক করুন
                    </p>
                  </div>
                </div>
              </div>

              {/* Status / Radius Pill */}
              <div className="bg-white/10 backdrop-blur-md border border-white/25 rounded-2xl p-3 text-xs flex items-center gap-3 shrink-0">
                <div>
                  <div className="text-[10px] text-orange-200 uppercase font-bold">Service Status</div>
                  <div className="font-extrabold flex items-center gap-1.5 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${restaurant.self_delivery_enabled ? 'bg-emerald-400 animate-pulse' : 'bg-stone-300'}`} />
                    <span>{restaurant.self_delivery_enabled ? 'Active (চালু)' : 'Inactive'}</span>
                  </div>
                </div>

                <div className="border-l border-white/20 pl-3">
                  <div className="text-[10px] text-orange-200 uppercase font-bold">Self Radius</div>
                  <div className="font-mono font-black mt-0.5">{restaurant.self_delivery_radius_km || 3} KM</div>
                </div>
              </div>
            </div>

            {/* Filter Toggle Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSelfDeliveryFilter('active')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  selfDeliveryFilter === 'active'
                    ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-500/20 shadow-xs'
                    : 'bg-white border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-500 uppercase">On The Road (চলমান ডেলিভারি)</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                </div>
                <div className="text-2xl font-black font-mono text-stone-900 mt-1">
                  {activeSelfDeliveries.length}
                </div>
                <div className="text-[11px] text-orange-700 font-semibold mt-0.5">
                  Out for delivery right now
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelfDeliveryFilter('ready')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  selfDeliveryFilter === 'ready'
                    ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-white border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-500 uppercase">Ready in Kitchen (প্রস্তুত খাবার)</span>
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-2xl font-black font-mono text-stone-900 mt-1">
                  {readySelfDeliveries.length}
                </div>
                <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                  Food packed, ready to go
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelfDeliveryFilter('completed')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  selfDeliveryFilter === 'completed'
                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-500 uppercase">Delivered (সম্পন্ন ডেলিভারি)</span>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="text-2xl font-black font-mono text-stone-900 mt-1">
                  {completedSelfDeliveries.length}
                </div>
                <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                  Delivered with own staff
                </div>
              </button>
            </div>

            {/* List for Selected Filter */}
            {(() => {
              const currentList =
                selfDeliveryFilter === 'active'
                  ? activeSelfDeliveries
                  : selfDeliveryFilter === 'ready'
                  ? readySelfDeliveries
                  : completedSelfDeliveries;

              if (currentList.length === 0) {
                return (
                  <div className="bg-white rounded-3xl p-12 text-center text-stone-400 border border-stone-200">
                    <Truck className="w-12 h-12 mx-auto mb-2 text-stone-300" />
                    <p className="font-bold text-sm text-stone-600">
                      {selfDeliveryFilter === 'active'
                        ? 'No orders are currently out for self-delivery.'
                        : selfDeliveryFilter === 'ready'
                        ? 'No ready orders waiting for dispatch right now.'
                        : 'No completed self-deliveries yet today.'}
                    </p>
                    <p className="text-xs text-stone-400 mt-1">
                      {selfDeliveryFilter === 'active'
                        ? 'Prepare an order in Live Kitchen and click "Mark Out for Delivery" to start delivery run.'
                        : 'New orders will appear here as they are prepared.'}
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {currentList.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-white rounded-3xl p-5 border-2 border-stone-200 hover:border-orange-300 shadow-xs transition-all space-y-4"
                    >
                      {/* Top Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-black text-stone-900 bg-stone-100 px-3 py-1 rounded-xl">
                            {ord.order_number}
                          </span>
                          <span className="text-xs text-stone-500 font-medium flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            <span>{ord.placed_at ? new Date(ord.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}</span>
                          </span>

                          <span
                            className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                              ord.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'on_the_way' || ord.status === 'picked_up'
                                ? 'bg-orange-100 text-orange-800 animate-pulse'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            <Truck className="w-3 h-3" />
                            <span>
                              {ord.status === 'delivered'
                                ? 'Delivered (সম্পন্ন)'
                                : ord.status === 'on_the_way' || ord.status === 'picked_up'
                                ? 'Out for Delivery (চলমান)'
                                : 'Ready to Dispatch (প্রস্তুত)'}
                            </span>
                          </span>
                        </div>

                        <div className="font-mono text-base font-black text-stone-900">
                          ₹{ord.grand_total}
                        </div>
                      </div>

                      {/* Customer Info & Action Grid (Call + Maps) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Customer & Call */}
                        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                          <div>
                            <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                              Customer Contact (গ্রাহকের বিবরণ)
                            </div>
                            <div className="text-sm font-black text-stone-900 mt-0.5 flex items-center gap-1.5">
                              <User className="w-4 h-4 text-stone-500" />
                              <span>{ord.customer_name}</span>
                            </div>
                          </div>

                          {/* Direct Phone Call Button */}
                          {ord.customer_phone ? (
                            <a
                              href={`tel:${ord.customer_phone}`}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                            >
                              <Phone className="w-4 h-4" />
                              <span>Call Customer: {ord.customer_phone} (ফোনে কথা বলুন)</span>
                            </a>
                          ) : (
                            <div className="text-xs text-stone-400 italic">No phone provided</div>
                          )}
                        </div>

                        {/* Location & Navigation */}
                        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3 flex flex-col justify-between">
                          <div>
                            <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                              Drop Location (ডেলিভারির ঠিকানা)
                            </div>
                            <div className="text-xs font-bold text-stone-800 mt-1 flex items-start gap-1.5">
                              <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                              <span className="leading-snug">
                                {ord.delivery_address} {ord.delivery_landmark ? `(Landmark: ${ord.delivery_landmark})` : ''}
                              </span>
                            </div>
                          </div>

                          {/* Google Maps Directions Button */}
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ord.delivery_address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                          >
                            <Navigation className="w-4 h-4" />
                            <span>Navigate with Google Maps (ম্যাপে ডিরেকশন)</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      {/* Cash to Collect / Payment Info Banner */}
                      <div
                        className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                          ord.payment_method === 'cod' && ord.status !== 'delivered'
                            ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">
                            {ord.payment_method === 'cod' && ord.status !== 'delivered' ? '💵' : '✅'}
                          </span>
                          <div>
                            <div className="font-extrabold uppercase">
                              {ord.payment_method === 'cod' && ord.status !== 'delivered'
                                ? 'Cash on Delivery (নগদ সংগ্রহ করতে হবে)'
                                : ord.payment_method === 'cod' && ord.status === 'delivered'
                                ? 'Cash Collected (নগদ টাকা সংগৃহীত)'
                                : 'Prepaid Online (অনলাইন পেমেন্ট সম্পন্ন)'}
                            </div>
                            <div className="text-[11px] text-stone-600 font-normal">
                              {ord.payment_method === 'cod' && ord.status !== 'delivered'
                                ? `কাস্টমারের কাছ থেকে নগদ ₹${ord.grand_total} সংগ্রহ করে ডেলিভারি সম্পন্ন মার্ক করুন`
                                : `অনলাইনে মূল্য পরিশোধিত, কাস্টমারের কাছ থেকে বাড়তি টাকা নেওয়ার প্রয়োজন নেই`}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono text-base font-black text-stone-900">
                            ₹{ord.grand_total}
                          </div>
                          <div className="text-[11px] font-bold text-emerald-800 mt-0.5">
                            রেস্তোরাঁর নিট প্রাপ্য: ₹{(ord as any).net_restaurant_amount || Math.round(ord.subtotal * 0.85 + Number(ord.delivery_fee || 0))}
                          </div>
                          <div className="text-[10px] text-stone-500">
                            (নিজস্ব ডেলিভারি ফি ₹{ord.delivery_fee} সহ)
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs space-y-1">
                        <div className="text-[10px] text-stone-400 font-bold uppercase mb-1">
                          Food Items ({ord.items.reduce((acc, it) => acc + it.quantity, 0)} Items):
                        </div>
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between font-medium text-stone-800">
                            <span>{it.quantity}x {it.food_name}</span>
                            <span className="font-mono text-stone-600">₹{it.total_price}</span>
                          </div>
                        ))}
                      </div>

                      {/* Primary Actions */}
                      <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                        {(ord.status === 'ready' || ord.status === 'preparing' || ord.status === 'accepted') && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleMarkOutForDelivery(ord.id)}
                              className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-sm py-3 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                            >
                              <Truck className="w-4 h-4" />
                              <span>🚀 Out for Delivery (ডেলিভারির জন্য বের হোন)</span>
                            </button>

                            <button
                              type="button"
                              disabled={deliveringOrderId === ord.id}
                              onClick={() => handleMarkDeliveredBySelf(ord.id, ord.order_number)}
                              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs py-3 px-4 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-xs"
                              title="Directly mark order delivered if already handed over"
                            >
                              {deliveringOrderId === ord.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              <span>সরাসরি ডেলিভারি সম্পন্ন</span>
                            </button>
                          </>
                        )}

                        {(ord.status === 'on_the_way' || ord.status === 'picked_up') && (
                          <button
                            type="button"
                            disabled={deliveringOrderId === ord.id}
                            onClick={() => handleMarkDeliveredBySelf(ord.id, ord.order_number)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                          >
                            {deliveringOrderId === ord.id ? (
                              <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                <span>Marking Delivered... (প্রক্রিয়াধীন...)</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-5 h-5" />
                                <span>✅ Mark Delivered (কাস্টমারকে খাবার দেওয়া হয়েছে)</span>
                              </>
                            )}
                          </button>
                        )}

                        {ord.status !== 'delivered' && (
                          <button
                            type="button"
                            onClick={() => handleRequestDeliveryPartner(ord.id)}
                            className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs py-3 px-4 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                            title="Request platform delivery partner rider instead"
                          >
                            <Truck className="w-4 h-4 text-stone-500" />
                            <span>রাইডার রিকোয়েস্ট (Request Rider)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 2: MENU MANAGEMENT */}
        {activeTab === 'menu' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-stone-900">Restaurant Menu Catalog</h3>
                <p className="text-xs text-stone-500">Add, edit, set offer prices, or toggle availability of dishes</p>
              </div>

              <button
                onClick={() => setIsAddDishOpen(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-4 py-2 rounded-2xl shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Dish</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {menu.map((food) => {
                const isInStock = Number(food.is_available) === 1 || (food.is_available as any) === true || (food.is_available as any) === '1';
                return (
                  <div
                    key={food.id}
                    className={`bg-white rounded-2xl p-3.5 border shadow-2xs flex gap-3 justify-between transition-all ${
                      isInStock
                        ? 'border-stone-200 hover:border-emerald-300'
                        : 'border-rose-300 bg-rose-50/25 ring-1 ring-rose-200'
                    }`}
                  >
                    <div className="relative shrink-0 group">
                      <img
                        src={food.photo_url}
                        alt={food.name}
                        className={`w-18 h-18 rounded-xl object-cover border border-stone-200 ${
                          !isInStock ? 'grayscale-40' : ''
                        }`}
                      />
                      {/* Photo Stock Badge Point */}
                      {isInStock ? (
                        <span
                          className="absolute top-1 right-1 flex items-center gap-1 bg-white/95 backdrop-blur-xs px-1.5 py-0.5 rounded-md text-[8px] font-black text-emerald-800 shadow-2xs border border-emerald-300"
                          title="In Stock (স্টকে আছে)"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>In Stock</span>
                        </span>
                      ) : (
                        <span
                          className="absolute top-1 right-1 flex items-center gap-1 bg-rose-600 text-white px-1.5 py-0.5 rounded-md text-[8px] font-black shadow-2xs"
                          title="Out of Stock (স্টক শেষ)"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          <span>Stock Out</span>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(food)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center text-white text-[10px] font-bold gap-0.5 cursor-pointer"
                        title="Edit dish prices, name & photo"
                      >
                        <Edit className="w-4 h-4 text-orange-400" />
                        <span>Edit Dish</span>
                      </button>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between space-y-1.5">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              food.is_veg ? 'bg-emerald-600' : 'bg-red-600'
                            }`}
                            title={food.is_veg ? 'Pure Veg' : 'Non-Veg'}
                          />
                          <h4 className="font-extrabold text-xs text-stone-900 truncate">
                            {food.name_bn || food.name}
                          </h4>

                          {/* Stock Status Badge */}
                          {isInStock ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>স্টকে আছে</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              <span>স্টক শেষ</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-500 font-medium truncate mt-0.5">
                          {food.category || 'Main Course'} • {food.name}
                        </div>

                        {/* Prominent Price & Offer Price Card Section */}
                        <div className="bg-orange-50/60 p-2 rounded-xl border border-orange-200/80 mt-1.5 space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <div>
                              <span className="text-[9px] text-stone-500 font-sans block font-bold">আসল দাম:</span>
                              <span className="text-stone-900 font-black">₹{food.price}</span>
                            </div>

                            <div className="text-right">
                              <span className="text-[9px] text-orange-700 font-sans block font-bold">অফার দাম:</span>
                              {food.discount_price ? (
                                <span className="text-orange-600 font-black">₹{food.discount_price}</span>
                              ) : (
                                <span className="text-stone-400 font-sans text-[10px]">অফার নেই</span>
                              )}
                            </div>
                          </div>

                          {food.discount_price ? (
                            <div className="text-[9px] bg-red-100 text-red-700 font-black px-2 py-0.5 rounded-md text-center">
                              🔥 ₹{food.price - food.discount_price} ছাড় ({Math.round(((food.price - food.discount_price) / food.price) * 100)}% OFF)
                            </div>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(food)}
                            className="w-full text-[10px] font-extrabold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 px-2.5 py-1 rounded-lg flex items-center justify-center gap-1 shadow-2xs cursor-pointer transition-all active:scale-95 mt-1"
                            title="Click to edit Actual Price and Offer Price"
                          >
                            <Tag className="w-3 h-3" />
                            <span>আসল ও অফার মূল্য আপডেট (Price & Offer)</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                        {/* In Stock / Out of Stock Toggle Button with Vibrant Green & Red */}
                        <button
                          type="button"
                          onClick={() => handleToggleDishAvailability(food.id, food.is_available)}
                          className={`text-[10px] font-black px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs ${
                            isInStock
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200'
                          }`}
                          title="Click to toggle availability"
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isInStock ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'
                            }`}
                          />
                          <span>{isInStock ? '🟢 In Stock (স্টকে আছে)' : '🔴 Out of Stock (স্টক শেষ)'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDish(food.id)}
                          className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: ORDER HISTORY (অর্ডার হিস্ট্রি) */}
        {activeTab === 'order_history' && (
          <div className="space-y-6">
            {/* Order History Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-stone-200 shadow-2xs">
              <div>
                <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-orange-600" />
                  <span>Restaurant Order History (অর্ডার হিস্ট্রি)</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  View past completed, cancelled, and active customer orders with detailed invoices
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-stone-600">
                <span className="bg-orange-50 text-orange-800 border border-orange-200 px-3 py-1.5 rounded-2xl">
                  Total Orders: {orders.length}
                </span>
              </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-2xs">
                <div className="text-[11px] text-stone-500 font-bold uppercase">All Time Orders</div>
                <div className="text-xl font-black font-mono text-stone-900 mt-1">{orders.length}</div>
              </div>
              <div className="bg-white rounded-2xl p-3.5 border border-emerald-200 bg-emerald-50/40 shadow-2xs">
                <div className="text-[11px] text-emerald-800 font-bold uppercase">Delivered Orders</div>
                <div className="text-xl font-black font-mono text-emerald-700 mt-1">
                  {orders.filter((o) => o.status === 'delivered').length}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-3.5 border border-amber-200 bg-amber-50/40 shadow-2xs">
                <div className="text-[11px] text-amber-800 font-bold uppercase">Active In Kitchen</div>
                <div className="text-xl font-black font-mono text-amber-600 mt-1">
                  {orders.filter((o) => ['pending', 'accepted', 'preparing', 'ready', 'assigned', 'picked_up', 'on_the_way'].includes(o.status)).length}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-3.5 border border-red-200 bg-red-50/40 shadow-2xs">
                <div className="text-[11px] text-red-800 font-bold uppercase">Cancelled</div>
                <div className="text-xl font-black font-mono text-red-600 mt-1">
                  {orders.filter((o) => o.status === 'cancelled').length}
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Search input */}
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search by Order # or Customer Name..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl pl-9 pr-8 py-2 text-xs font-medium text-stone-900 focus:outline-hidden focus:border-orange-500"
                  />
                  {historySearch && (
                    <button
                      onClick={() => setHistorySearch('')}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Status Filter Dropdown */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter className="w-4 h-4 text-stone-500 shrink-0" />
                  <select
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                    className="bg-stone-50 border border-stone-200 rounded-2xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-hidden"
                  >
                    <option value="all">All Statuses (সব অর্ডার)</option>
                    <option value="delivered">✅ Delivered (ডেলিভার্ড)</option>
                    <option value="active">🔥 Active/Preparing (চলমান)</option>
                    <option value="cancelled">❌ Cancelled (বাতিলকৃত)</option>
                  </select>

                  <select
                    value={historyDateFilter}
                    onChange={(e) => setHistoryDateFilter(e.target.value as any)}
                    className="bg-stone-50 border border-stone-200 rounded-2xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-hidden"
                  >
                    <option value="all">All Time (সব সময়)</option>
                    <option value="today">Today (আজকের অর্ডার)</option>
                    <option value="7days">Last 7 Days (গত ৭ দিন)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Orders List Table / Cards */}
            {(() => {
              const filteredList = orders.filter((o) => {
                const q = historySearch.trim().toLowerCase();
                const matchesSearch =
                  !q ||
                  o.order_number.toLowerCase().includes(q) ||
                  o.customer_name.toLowerCase().includes(q) ||
                  o.items.some((it) => it.food_name.toLowerCase().includes(q));

                let matchesStatus = true;
                if (historyStatusFilter === 'delivered') {
                  matchesStatus = o.status === 'delivered';
                } else if (historyStatusFilter === 'cancelled') {
                  matchesStatus = o.status === 'cancelled';
                } else if (historyStatusFilter === 'active') {
                  matchesStatus = ['pending', 'accepted', 'preparing', 'ready', 'assigned', 'picked_up', 'on_the_way'].includes(o.status);
                }

                let matchesDate = true;
                if (historyDateFilter === 'today') {
                  const todayStr = new Date().toISOString().split('T')[0];
                  matchesDate = o.placed_at ? o.placed_at.startsWith(todayStr) : true;
                } else if (historyDateFilter === '7days') {
                  const sevenDaysAgo = new Date();
                  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                  const orderDate = new Date(o.placed_at);
                  matchesDate = orderDate >= sevenDaysAgo;
                }

                return matchesSearch && matchesStatus && matchesDate;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="bg-white rounded-3xl p-12 text-center text-stone-400 border border-stone-200">
                    <History className="w-12 h-12 mx-auto mb-2 text-stone-300" />
                    <p className="font-bold text-sm text-stone-600">No order history matched your search filter.</p>
                    <p className="text-xs text-stone-400 mt-1">Try clearing filters or search term.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {filteredList.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-white rounded-3xl p-4 border border-stone-200 shadow-2xs hover:border-orange-200 transition-all space-y-3"
                    >
                      {/* Header Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-black text-stone-900 bg-stone-100 px-2.5 py-1 rounded-xl">
                            {ord.order_number}
                          </span>
                          <span className="text-xs text-stone-500 font-medium flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            <span>{ord.placed_at ? new Date(ord.placed_at).toLocaleString() : 'Recent'}</span>
                          </span>

                          {/* Self Delivery vs Platform Rider Badge */}
                          {ord.is_self_delivery || ord.delivery_mode === 'self_delivery' ? (
                            <span className="text-[10px] font-black bg-orange-100 text-orange-900 border border-orange-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Truck className="w-3 h-3 text-orange-600" />
                              <span>Self Delivery (নিজস্ব লোক)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-black bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Truck className="w-3 h-3 text-blue-600" />
                              <span>Platform Rider (রাইডার)</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Status Badge */}
                          <span
                            className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase ${
                              ord.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ord.status === 'delivered'
                              ? '✅ Delivered'
                              : ord.status === 'cancelled'
                              ? '❌ Cancelled'
                              : `🔥 ${ord.status}`}
                          </span>

                          <button
                            onClick={() => setSelectedOrderForDetails(ord)}
                            className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Invoice</span>
                          </button>
                        </div>
                      </div>

                      {/* Customer & Address Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div>
                          <div className="text-[10px] text-stone-400 font-bold uppercase">Customer Info</div>
                          <div className="font-extrabold text-stone-900 flex items-center gap-1 mt-0.5">
                            <User className="w-3.5 h-3.5 text-stone-500" />
                            <span>{ord.customer_name}</span>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-stone-400 font-bold uppercase">Delivery Address</div>
                          <p className="text-stone-700 mt-0.5 line-clamp-2">{ord.delivery_address}</p>
                        </div>

                        <div className="md:text-right">
                          <div className="text-[10px] text-stone-400 font-bold uppercase">Payment & Amount</div>
                          <div className="font-mono text-sm font-black text-stone-900 mt-0.5">
                            Customer: ₹{ord.grand_total}
                          </div>
                          <div className="text-xs font-black text-emerald-700 mt-0.5">
                            রেস্তোরাঁর নিট প্রাপ্য: ₹{(ord as any).net_restaurant_amount || Math.round(ord.subtotal * 0.85)}
                          </div>
                          <div className="text-[10px] font-semibold text-stone-500 mt-0.5">
                            {ord.is_self_delivery || ord.delivery_mode === 'self_delivery'
                              ? `(+₹${ord.delivery_fee} নিজস্ব ডেলিভারি ফি সহ)`
                              : `(ডেলিভারি কমিশন ও ফি ₹${ord.delivery_fee} বাদ দিয়ে)`}
                          </div>
                          <div className="text-[10px] text-stone-400 uppercase font-extrabold mt-1">
                            {ord.payment_method?.toUpperCase()} • {ord.payment_status?.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* Food Items Breakdown */}
                      <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 text-xs space-y-1">
                        <div className="text-[10px] text-stone-400 font-extrabold uppercase mb-1">Items Ordered:</div>
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between font-medium text-stone-800">
                            <span>
                              {it.quantity}x {it.food_name}
                            </span>
                            <span className="font-mono font-bold text-stone-700">₹{it.total_price}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 3: EARNINGS & DIRECT SETTLEMENT */}
        {activeTab === 'earnings' && earnings && (
          <div className="space-y-6">
            {/* Direct Admin Settlement Policy Notice */}
            <div className="bg-purple-50 border border-purple-200 rounded-3xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shrink-0 mt-0.5">
                💳
              </div>
              <div className="text-xs text-purple-900 leading-relaxed">
                <strong className="font-extrabold block text-sm mb-0.5">
                  সরাসরি পেমেন্ট মেথড সেটেলমেন্ট নীতি (Direct Payment Settlement Policy):
                </strong>
                গ্রাহক অর্ডার করার পর মোট পেমেন্ট সরাসরি অ্যাডমিনের প্ল্যাটফর্ম পেমেন্ট মেথডে জমা হয়। সেটেলমেন্টের সময় রেস্তোরাঁর প্রাপ্য নিট আয় সরাসরি আপনার প্রোফাইলে যুক্ত পেমেন্ট মেথডে (UPI ID বা ব্যাংক অ্যাকাউন্ট) পাঠিয়ে দেওয়া হয়। কোনো ওয়ালেটে হোল্ড করার প্রয়োজন নেই, সরাসরি আপনার অ্যাকাউন্টে জমা হয়।
              </div>
            </div>

            {/* Delivery Commission & Self-Delivery Payout Policy Notice */}
            <div className="bg-orange-50 border border-orange-200 rounded-3xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold shrink-0 mt-0.5">
                🚴‍♂️
              </div>
              <div className="text-xs text-orange-950 leading-relaxed">
                <strong className="font-extrabold block text-sm mb-0.5">
                  ডেলিভারি কমিশন ও পেমেন্ট বণ্টন নিয়ম (Delivery Commission & Payout Policy):
                </strong>
                • <strong>সেলফ ডেলিভারি (Self Delivery):</strong> রেস্তোরাঁ নিজস্ব লোক দিয়ে ডেলিভারি করলে খাদ্য মূল্য থেকে প্ল্যাটফর্ম ফি ({restaurant.commission_rate}%) বাদে সম্পূর্ণ ডেলিভারি ফি রেস্তোরাঁর নিট আয়ে যুক্ত হয়ে সরাসরি পেমেন্ট মেথডে ট্রান্সফার হবে।
                <br />
                • <strong>সেলফ ডেলিভারি না করলে (Platform Rider):</strong> প্ল্যাটফর্ম রাইডার দিয়ে খাবার ডেলিভারি করা হলে ডেলিভারি কমিশন ও রাইডার ফি বাদ দিয়ে বাকি খাবার মূল্যের কমিশন কাটা অর্থ রেস্তোরাঁ সরাসরি পাবে।
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs">
                <div className="text-xs text-stone-500 font-bold uppercase">Gross Food Sales</div>
                <div className="text-2xl font-black font-mono text-stone-900 mt-1">
                  ₹{earnings.grossSales}
                </div>
                <div className="text-[11px] text-stone-400 mt-1">Across all completed orders</div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-2xs bg-amber-50/40">
                <div className="text-xs text-amber-800 font-bold uppercase">Pending Direct Settlement</div>
                <div className="text-2xl font-black font-mono text-amber-600 mt-1">
                  ₹{
                    orders
                      .filter((o) => o.status === 'delivered' && o.escrow_status === 'holding')
                      .reduce((sum, o) => sum + Number((o as any).net_restaurant_amount || o.subtotal * 0.85), 0)
                      .toFixed(2)
                  }
                </div>
                <div className="text-[11px] text-amber-700 font-medium mt-1">
                  {orders.filter((o) => o.status === 'delivered' && o.escrow_status === 'holding').length} orders awaiting admin direct settlement
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-2xs bg-emerald-50/50">
                <div className="text-xs text-emerald-800 font-bold uppercase">Total Direct Settled Earnings</div>
                <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
                  ₹{earnings.wallet?.balance || earnings.netEarnings}
                </div>
                <div className="text-[11px] text-emerald-600 font-semibold mt-1">Directly Transferred to Saved UPI / Bank</div>
              </div>
            </div>

            {/* List of Delivered Orders with Direct Settlement Status */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-2xs space-y-3">
              <h4 className="font-extrabold text-sm text-stone-900">
                Delivered Orders & Direct Settlement Breakdown
              </h4>

              <div className="divide-y divide-stone-100 text-xs">
                {orders
                  .filter((o) => o.status === 'delivered')
                  .map((ord) => (
                    <div key={ord.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-stone-800">{ord.order_number}</span>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              ord.escrow_status === 'settled'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.escrow_status === 'holding'
                                ? 'bg-amber-100 text-amber-800'
                                : ord.escrow_status === 'refunded'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {ord.escrow_status === 'holding'
                              ? 'Pending Settlement'
                              : ord.escrow_status === 'matured'
                              ? 'Ready for Direct Transfer'
                              : ord.escrow_status === 'settled'
                              ? 'Directly Settled ✓'
                              : ord.escrow_status || 'Pending'}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          Items: {ord.items.map((i) => `${i.quantity}x ${i.food_name}`).join(', ')}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-black text-stone-900 text-sm">
                          ₹{(ord as any).net_restaurant_amount || Math.round(ord.subtotal * 0.85)}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          Gross: ₹{ord.subtotal} (-{restaurant.commission_rate}%)
                        </div>
                        <div className="text-[9px] font-bold mt-0.5">
                          {ord.is_self_delivery || ord.delivery_mode === 'self_delivery' ? (
                            <span className="text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded">
                              +₹{ord.delivery_fee} সেলফ ফি সহ
                            </span>
                          ) : (
                            <span className="text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                              ডেলিভারি কমিশন বাদ
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: RESTAURANT PROFILE & SETTINGS & PAYMENT METHODS */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
            {/* Header / Intro */}
            <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-stone-900 text-white p-6 rounded-3xl shadow-lg flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-orange-200 uppercase tracking-wider">
                  <Store className="w-4 h-4" />
                  <span>Restaurant Profile & Payment Management</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black mt-1">
                  {profileName || restaurant?.name || 'Restaurant Profile'}
                </h2>
                <p className="text-xs text-orange-100/90 mt-1 max-w-xl leading-relaxed">
                  এখানে রেস্তোরাঁর নাম, ছবি (৩টি স্লাইডার ফটো), ঠিকানা এবং ব্যাংক / ইউপিআই পেমেন্ট ডিটেইলস আপডেট করুন। অ্যাডমিন এখান থেকে সরাসরি পেমেন্ট সেটেলমেন্ট করবেন।
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveRestaurantProfile}
                  disabled={isSavingProfile}
                  className="bg-white hover:bg-orange-50 text-orange-900 font-black text-xs px-5 py-2.5 rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-orange-600" />
                  <span>{isSavingProfile ? 'Saving Changes...' : 'Save Profile (সেভ করুন)'}</span>
                </button>
              </div>
            </div>

            {/* Floating Toast Notification for Save Success */}
            {showRestSaveSuccessToast && (
              <div className="fixed top-20 right-4 z-50 bg-emerald-700 text-white p-4 rounded-2xl shadow-2xl border-2 border-emerald-300 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 max-w-md">
                <div className="w-10 h-10 rounded-full bg-white text-emerald-800 flex items-center justify-center font-black text-xl shadow-md shrink-0">
                  ✓
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-black text-sm text-white">Save Successful! (পেমেন্ট সেভ সফল হয়েছে!)</div>
                  <div className="text-xs text-emerald-100 font-medium mt-0.5 truncate">
                    {profilePaymentMethod === 'upi'
                      ? `UPI Settlement ID: ${profileUpiId || 'Updated'}`
                      : `Bank Account: ${profileBankName || 'Updated'} (${profileBankAccountNo || ''})`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRestSaveSuccessToast(false)}
                  className="text-emerald-200 hover:text-white font-black text-xs shrink-0"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Profile Feedback Toast */}
            {profileFeedbackMsg && (
              <div
                className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in slide-in-from-top-2 ${
                  profileFeedbackMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                    : 'bg-red-50 text-red-900 border border-red-300'
                }`}
              >
                <span>{profileFeedbackMsg.text}</span>
                <button
                  onClick={() => setProfileFeedbackMsg(null)}
                  className="font-black hover:opacity-75 ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleSaveRestaurantProfile} className="space-y-6">
              {/* SECTION 1: 3 RESTAURANT PHOTOS (AUTO SLIDE FOR CUSTOMERS) */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-stone-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-orange-600" />
                      <span>3 Restaurant Showcase Photos (রেস্তোরাঁর ৩টি ছবি)</span>
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      গ্রাহকরা যখন অ্যাপে আপনার রেস্তোরাঁর উপর ক্লিক করবে, তখন এই ৩টি ছবি স্বয়ংক্রিয়ভাবে বাঁ থেকে ডানে স্লাইড হবে (Auto Slide Gallery)।
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-orange-100 text-orange-800 px-2.5 py-1 rounded-full uppercase">
                    Customer Carousel Feature
                  </span>
                </div>

                {/* 3 Photos Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[0, 1, 2].map((idx) => {
                    const currentUrl = profilePhotos[idx] || '';
                    return (
                      <div key={idx} className="bg-stone-50 rounded-2xl p-3 border border-stone-200 space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                          <span>Photo #{idx + 1} {idx === 0 ? '(Main Banner)' : `(Slide ${idx + 1})`}</span>
                          {currentUrl && (
                            <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-black">
                              Ready ✓
                            </span>
                          )}
                        </div>

                        {/* Image Preview */}
                        <div className="h-36 rounded-xl overflow-hidden bg-stone-200 border-2 border-dashed border-stone-300 relative group">
                          {currentUrl ? (
                            <img
                              src={currentUrl}
                              alt={`Photo ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 gap-1 p-2 text-center text-[11px]">
                              <ImageIcon className="w-6 h-6 text-stone-300" />
                              <span>No Photo Added</span>
                            </div>
                          )}
                        </div>

                        {/* Upload & URL Input */}
                        <div className="space-y-1.5">
                          <label className="cursor-pointer w-full bg-stone-900 hover:bg-stone-800 text-white rounded-xl py-1.5 px-3 text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95">
                            <Upload className="w-3.5 h-3.5 text-orange-400" />
                            <span>Upload Device File</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePhotoUpload(idx, e)}
                              className="hidden"
                            />
                          </label>

                          <input
                            type="text"
                            value={currentUrl}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProfilePhotos((prev) => {
                                const next = [...prev];
                                next[idx] = val;
                                return next;
                              });
                            }}
                            placeholder="Or paste image URL (https://...)"
                            className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-[11px] text-stone-800"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: BASIC STORE DETAILS */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-2xs space-y-4">
                <div className="border-b border-stone-100 pb-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-orange-600" />
                    <span>Restaurant Information & Operational Settings</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Restaurant Name (English) <span className="text-orange-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="e.g. Royal Bengal Kitchen"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Restaurant Name (Bengali বাংলা)
                    </label>
                    <input
                      type="text"
                      value={profileNameBn}
                      onChange={(e) => setProfileNameBn(e.target.value)}
                      placeholder="যেমন: রয়্যাল বেঙ্গল কিচেন"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Owner / Manager Name <span className="text-orange-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profileOwnerName}
                      onChange={(e) => setProfileOwnerName(e.target.value)}
                      placeholder="e.g. Sourav Mukherjee"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Contact Phone Number <span className="text-orange-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="+91..."
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Restaurant Physical Address <span className="text-orange-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      placeholder="Shop/Street address, Area, City, Pin"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Cuisine Types (কমা দিয়ে লিখুন)
                    </label>
                    <input
                      type="text"
                      value={profileCuisines}
                      onChange={(e) => setProfileCuisines(e.target.value)}
                      placeholder="Biryani, Bengali, Sweets, Fast Food"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Average Delivery / Prep Time (Minutes)
                    </label>
                    <input
                      type="number"
                      value={profileAvgDeliveryMinutes}
                      onChange={(e) => setProfileAvgDeliveryMinutes(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Minimum Order Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={profileMinOrderAmount}
                      onChange={(e) => setProfileMinOrderAmount(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 font-mono"
                    />
                  </div>
                </div>

                {/* Dietary Pure Veg Toggle */}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-stone-800 block">100% Pure Vegetarian Restaurant (নিরামিষ রেস্তোরাঁ)</span>
                    <span className="text-[11px] text-stone-500">Show pure veg green badge on customer app</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profileIsPureVeg}
                      onChange={(e) => setProfileIsPureVeg(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* SECTION 3: PAYMENT METHOD SETTLEMENT DETAILS (UPI OR BANK ACCOUNT) */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-2xs space-y-5">
                <div className="border-b border-stone-100 pb-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>Payment Settlement Methods (অ্যাডমিন পেমেন্ট সেটেলমেন্টের তথ্য)</span>
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      অ্যাডমিন প্যানেল থেকে আপনার বিক্রির অর্থ এই ইউপিআই বা ব্যাংক অ্যাকাউন্টে সেটেলমেন্ট ও ট্রান্সফার করবেন।
                    </p>
                  </div>

                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 uppercase flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Admin Payout Ready</span>
                  </span>
                </div>

                {/* Inline Live Saved Status Banner */}
                {(profileUpiId || profileBankAccountNo) && (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 flex items-center justify-between text-xs text-emerald-900 font-bold shadow-2xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                      <div>
                        <span>Saved Payment Method (সংরক্ষিত পেমেন্ট মাধ্যম): </span>
                        <span className="font-mono text-emerald-950 font-black">
                          {profilePaymentMethod === 'upi' ? `UPI (${profileUpiId})` : `Bank (${profileBankName} - ${profileBankAccountNo})`}
                        </span>
                      </div>
                    </div>
                    <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shrink-0 shadow-2xs">
                      Save Successful ✓
                    </span>
                  </div>
                )}

                {/* Method Selection Toggle */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setProfilePaymentMethod('upi')}
                    className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      profilePaymentMethod === 'upi'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>UPI ID & Scanner QR (ইউপিআই)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProfilePaymentMethod('bank')}
                    className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      profilePaymentMethod === 'bank'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>Bank Account & Passbook (ব্যাংক অ্যাকাউন্ট)</span>
                  </button>
                </div>

                {/* 1. UPI Mode Form */}
                {profilePaymentMethod === 'upi' && (
                  <div className="bg-emerald-50/40 rounded-2xl p-4 border border-emerald-200 space-y-4 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        UPI ID (যেমন: restaurant@okaxis / 9800000002@upi) <span className="text-emerald-700">*</span>
                      </label>
                      <input
                        type="text"
                        value={profileUpiId}
                        onChange={(e) => setProfileUpiId(e.target.value)}
                        placeholder="e.g. deliciousfoods@okhdfcbank"
                        className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-stone-900 focus:border-emerald-600 focus:outline-hidden"
                      />
                    </div>

                    {/* UPI QR Scanner Photo Upload */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-stone-800">
                        Upload UPI Scanner QR Code Photo (ইউপিআই স্ক্যানার কিউআর কোডের ছবি)
                      </label>

                      <div className="flex items-center gap-3">
                        <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-emerald-300 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                          {profileUpiQrPhoto ? (
                            <img src={profileUpiQrPhoto} alt="UPI QR" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center p-2 text-stone-400">
                              <QrCode className="w-7 h-7 mx-auto text-emerald-400 mb-0.5" />
                              <span className="text-[9px] font-bold">No QR Uploaded</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-2">
                          <label className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl py-2 px-3.5 text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all active:scale-95">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload QR Code Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleUpiQrUpload}
                              className="hidden"
                            />
                          </label>

                          <input
                            type="text"
                            value={profileUpiQrPhoto}
                            onChange={(e) => setProfileUpiQrPhoto(e.target.value)}
                            placeholder="Or enter image URL (https://...)"
                            className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-[11px] text-stone-700"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Bank Account Mode Form */}
                {profilePaymentMethod === 'bank' && (
                  <div className="bg-emerald-50/40 rounded-2xl p-4 border border-emerald-200 space-y-4 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">
                          Bank Name (ব্যাংকের নাম) <span className="text-emerald-700">*</span>
                        </label>
                        <input
                          type="text"
                          value={profileBankName}
                          onChange={(e) => setProfileBankName(e.target.value)}
                          placeholder="e.g. State Bank of India"
                          className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">
                          Account Holder Name (হোল্ডারের নাম) <span className="text-emerald-700">*</span>
                        </label>
                        <input
                          type="text"
                          value={profileBankAccountHolder}
                          onChange={(e) => setProfileBankAccountHolder(e.target.value)}
                          placeholder="e.g. Sourav Mukherjee"
                          className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">
                          Bank Account Number (অ্যাকাউন্ট নং) <span className="text-emerald-700">*</span>
                        </label>
                        <input
                          type="text"
                          value={profileBankAccountNo}
                          onChange={(e) => setProfileBankAccountNo(e.target.value)}
                          placeholder="e.g. 38472910482"
                          className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-stone-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">
                          IFSC Code (আইএফএসসি কোড) <span className="text-emerald-700">*</span>
                        </label>
                        <input
                          type="text"
                          value={profileBankIfsc}
                          onChange={(e) => setProfileBankIfsc(e.target.value)}
                          placeholder="e.g. SBIN0001420"
                          className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-stone-900 uppercase"
                        />
                      </div>
                    </div>

                    {/* Passbook Photo Upload */}
                    <div className="space-y-2 pt-2 border-t border-emerald-200">
                      <label className="block text-xs font-bold text-stone-800">
                        Upload Bank Passbook / Cheque Photo (ব্যাংক পাসবুক বা চেকের ছবি)
                      </label>

                      <div className="flex items-center gap-3">
                        <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-emerald-300 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                          {profileBankPassbookPhoto ? (
                            <img src={profileBankPassbookPhoto} alt="Passbook" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center p-2 text-stone-400">
                              <Building2 className="w-7 h-7 mx-auto text-emerald-400 mb-0.5" />
                              <span className="text-[9px] font-bold">No Passbook</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-2">
                          <label className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl py-2 px-3.5 text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all active:scale-95">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Passbook Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePassbookPhotoUpload}
                              className="hidden"
                            />
                          </label>

                          <input
                            type="text"
                            value={profileBankPassbookPhoto}
                            onChange={(e) => setProfileBankPassbookPhoto(e.target.value)}
                            placeholder="Or enter passbook image URL (https://...)"
                            className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-[11px] text-stone-700"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: RESTAURANT SPECIAL PROMOCODES (রেস্তোরাঁর নিজস্ব প্রোমোকোড) */}
              <div className="bg-amber-50/40 rounded-3xl p-5 border border-amber-200 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-amber-200/80 pb-3">
                  <div>
                    <h4 className="text-sm font-black text-amber-950 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-amber-700" />
                      <span>4. Restaurant Special Promocodes (রেস্তোরাঁর নিজস্ব প্রোমোকোড ও ডিসকাউন্ট অফার)</span>
                    </h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      এখানে আপনার রেস্তোরাঁর বিশেষ প্রোমোকোড তৈরি করুন। গ্রাহকরা আপনার খাবার অর্ডার করার সময় এই কুপন ব্যবহার করে ডিসকাউন্ট পাবেন।
                    </p>
                  </div>
                  <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full">
                    {restPromocodes.length} Active Codes
                  </span>
                </div>

                {/* Add Promo Form */}
                <div className="bg-white rounded-2xl p-4 border border-amber-200 space-y-3">
                  <div className="text-xs font-black text-stone-900">
                    Set New Promocode (নতুন প্রোমোকোড দিন):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Promo Code (যেমন: FEAST15)</label>
                      <input
                        type="text"
                        value={restPromoCode}
                        onChange={(e) => setRestPromoCode(e.target.value.toUpperCase())}
                        placeholder="e.g. FEAST15"
                        className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 font-mono font-black text-stone-900 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Discount % (% ছাড়)</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={restPromoDiscount}
                          onChange={(e) => setRestPromoDiscount(e.target.value)}
                          placeholder="15"
                          className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 font-mono font-bold text-stone-900"
                        />
                        <span className="font-bold text-stone-500">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Max Discount Cap (সর্বোচ্চ ₹)</label>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-stone-400">₹</span>
                        <input
                          type="number"
                          value={restPromoMaxDisc}
                          onChange={(e) => setRestPromoMaxDisc(e.target.value)}
                          placeholder="75"
                          className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 font-mono font-bold text-stone-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Min Order Subtotal (সর্বনিম্ন ₹)</label>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-stone-400">₹</span>
                        <input
                          type="number"
                          value={restPromoMinSubtotal}
                          onChange={(e) => setRestPromoMinSubtotal(e.target.value)}
                          placeholder="149"
                          className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 font-mono font-bold text-stone-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleSaveRestPromo}
                      disabled={isSavingRestPromo || !restPromoCode.trim()}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isSavingRestPromo ? 'Saving...' : 'Save Promocode (প্রোমোকোড যুক্ত করুন)'}</span>
                    </button>
                  </div>
                </div>

                {/* List of Active Restaurant Promocodes */}
                {restPromocodes.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-bold text-amber-950">Active Restaurant Promocodes (সক্রিয় কুপন তালিকা):</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {restPromocodes.map((promo: any) => (
                        <div key={promo.code} className="bg-white p-3 rounded-2xl border border-amber-200 flex items-center justify-between gap-3 shadow-2xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-lg text-xs">
                                {promo.code}
                              </span>
                              <span className="text-xs font-extrabold text-emerald-700">
                                {promo.discount_percentage}% OFF
                              </span>
                            </div>
                            <div className="text-[10px] text-stone-500 mt-1">
                              Max Cap: ₹{promo.max_discount} | Min Order: ₹{promo.min_order_amount}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteRestPromo(promo.code)}
                            className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer"
                            title="Delete Promocode"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Save Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm px-7 py-3 rounded-2xl shadow-lg transition-all cursor-pointer active:scale-95 flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingProfile ? 'Saving All Details...' : 'Save Restaurant Profile & Details (সেভ করুন)'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Add Dish Modal */}
      {isAddDishOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <form
            onSubmit={handleAddDish}
            className="bg-white w-full max-w-lg rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-3.5 my-8"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h3 className="font-black text-stone-900 text-base flex items-center gap-2">
                <Utensils className="w-4 h-4 text-orange-600" />
                <span>Add New Menu Dish (নতুন খাবার যোগ করুন)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddDishOpen(false)}
                className="text-stone-400 hover:text-stone-700 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Category Selection (ক্যাটাগরি বেছে নিন) <span className="text-orange-600">*</span>
              </label>
              <select
                value={newDishCategory}
                onChange={(e) => setNewDishCategory(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:border-orange-500 focus:outline-hidden"
              >
                {(availableCategories.length > 0
                  ? availableCategories.filter((c) => c.is_active !== 0)
                  : [
                      { id: 1, name: 'Sweets', name_bn: 'মিষ্টি ও ডেজার্ট', icon: '🍰' },
                      { id: 2, name: 'Beverages', name_bn: 'পানীয় ও কোল্ড ড্রিঙ্কস', icon: '🥤' },
                      { id: 3, name: 'Breads', name_bn: 'রুটি ও নান', icon: '🫓' },
                      { id: 4, name: 'Starters', name_bn: 'স্ন্যাক্স ও স্টার্টার', icon: '🍟' },
                      { id: 5, name: 'Rice', name_bn: 'বিরিয়ানি ও রাইস', icon: '🍚' },
                      { id: 6, name: 'Main Course', name_bn: 'মূল খাবার কারি', icon: '🍲' }
                    ]
                ).map((cat: any) => (
                  <option key={cat.id || cat.name} value={cat.name}>
                    {cat.icon || '🍽️'} {cat.name} ({cat.name_bn || cat.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Food Name (English) <span className="text-orange-600">*</span></label>
                <input
                  type="text"
                  required
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  placeholder="e.g. Mutton Kasha"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Food Name (Bengali বাংলা)</label>
                <input
                  type="text"
                  value={newDishNameBn}
                  onChange={(e) => setNewDishNameBn(e.target.value)}
                  placeholder="যেমন: খাসির মাংসের কষা"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bengali"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Actual Price (আসল মূল্য ₹) <span className="text-orange-600">*</span></label>
                <input
                  type="number"
                  required
                  value={newDishPrice}
                  onChange={(e) => setNewDishPrice(e.target.value)}
                  placeholder="220"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Offer Price (অফার মূল্য ₹)</label>
                <input
                  type="number"
                  value={newDishDiscountPrice}
                  onChange={(e) => setNewDishDiscountPrice(e.target.value)}
                  placeholder="195 (optional)"
                  className="w-full bg-orange-50/60 border border-orange-200 rounded-xl px-3 py-2 text-xs font-mono font-extrabold text-orange-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Prep Time (Mins)</label>
                <input
                  type="number"
                  value={newDishPrepMins}
                  onChange={(e) => setNewDishPrepMins(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            {/* Food Image Upload & Photo URL Section */}
            <div className="space-y-2 bg-orange-50/50 p-3 rounded-2xl border border-orange-200/60">
              <label className="block text-xs font-extrabold text-stone-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
                  <span>Food Photo (খাবারের ছবি আপলোড / লিংক)</span>
                </span>
                <span className="text-[10px] text-orange-600 font-normal">Customer and Addon feed-এ দেখাবে</span>
              </label>

              {/* Live Preview Box */}
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-stone-200 border border-stone-300 overflow-hidden shrink-0 relative">
                  {newDishPhoto ? (
                    <img src={newDishPhoto} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400 text-[10px]">No Image</div>
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  <label className="cursor-pointer bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-orange-600" />
                    <span>Upload Image File (ডিভাইস থেকে ছবি আপলোড)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <input
                    type="text"
                    value={newDishPhoto}
                    onChange={(e) => setNewDishPhoto(e.target.value)}
                    placeholder="or paste Image URL (https://...)"
                    className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-1 text-[11px]"
                  />
                </div>
              </div>

              {/* Sample Preset Photos */}
              <div className="pt-1">
                <div className="text-[10px] font-bold text-stone-500 mb-1">Quick Food Photo Presets (তাত্ক্ষণিক ছবি বেছে নিন):</div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { label: 'Biryani', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500' },
                    { label: 'Sweet', url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500' },
                    { label: 'Cold Drink', url: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=500' },
                    { label: 'Snacks/Roll', url: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=500' },
                    { label: 'Naan/Bread', url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500' },
                    { label: 'Bengali Thali', url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500' },
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewDishPhoto(p.url)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap border transition-all ${
                        newDishPhoto === p.url
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Veg / Non-Veg Selection Option Cards */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Food Type (খাবারের ধরণ - Veg / Non-Veg) <span className="text-orange-600">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewDishIsVeg(true)}
                  className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                    newDishIsVeg
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs ring-2 ring-emerald-500/20'
                      : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    newDishIsVeg ? 'border-emerald-600 bg-emerald-600' : 'border-stone-400'
                  }`}>
                    {newDishIsVeg && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                    <div className="text-left leading-tight">
                      <div className="text-xs font-black">Veg (নিরামিষ)</div>
                      <div className="text-[10px] text-stone-500 font-medium">Pure Vegetarian</div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewDishIsVeg(false)}
                  className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                    !newDishIsVeg
                      ? 'bg-red-50 border-red-500 text-red-900 shadow-xs ring-2 ring-red-500/20'
                      : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    !newDishIsVeg ? 'border-red-600 bg-red-600' : 'border-stone-400'
                  }`}>
                    {!newDishIsVeg && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
                    <div className="text-left leading-tight">
                      <div className="text-xs font-black">Non-Veg (আমিষ)</div>
                      <div className="text-[10px] text-stone-500 font-medium">Chicken / Fish / Egg</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsAddDishOpen(false)}
                className="px-4 py-2 text-xs font-bold text-stone-500 hover:text-stone-800"
              >
                Cancel (বাতিল)
              </button>
              <button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
              >
                Save Food Item (সংরক্ষণ করুন)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Food Details & Prices Modal */}
      {editingFood && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <form
            onSubmit={handleSaveUpdatedDish}
            className="bg-white w-full max-w-lg rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-4 my-auto"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h3 className="font-black text-stone-900 text-base flex items-center gap-2">
                <Edit className="w-4 h-4 text-orange-600" />
                <span>Update Dish Prices & Details (মূল্য ও বিবরণ আপডেট)</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingFood(null)}
                className="text-stone-400 hover:text-stone-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Dish Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Dish Name (English)</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Dish Name (Bengali বাংলা)</label>
                <input
                  type="text"
                  value={editNameBn}
                  onChange={(e) => setEditNameBn(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bengali"
                />
              </div>
            </div>

            {/* Category Select */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Food Category (খাবারের ক্যাটাগরি) <span className="text-orange-600">*</span>
              </label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:border-orange-500 focus:outline-hidden"
              >
                {(availableCategories.length > 0
                  ? availableCategories.filter((c) => c.is_active !== 0)
                  : [
                      { id: 1, name: 'Sweets', name_bn: 'মিষ্টি ও ডেজার্ট', icon: '🍰' },
                      { id: 2, name: 'Beverages', name_bn: 'পানীয় ও কোল্ড ড্রিঙ্কস', icon: '🥤' },
                      { id: 3, name: 'Breads', name_bn: 'রুটি ও নান', icon: '🫓' },
                      { id: 4, name: 'Starters', name_bn: 'স্ন্যাক্স ও স্টার্টার', icon: '🍟' },
                      { id: 5, name: 'Rice', name_bn: 'বিরিয়ানি ও রাইস', icon: '🍚' },
                      { id: 6, name: 'Main Course', name_bn: 'মূল খাবার কারি', icon: '🍲' }
                    ]
                ).map((cat: any) => (
                  <option key={cat.id || cat.name} value={cat.name}>
                    {cat.icon || '🍽️'} {cat.name} ({cat.name_bn || cat.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Actual Price & Offer Price Inputs */}
            <div className="grid grid-cols-2 gap-2.5 bg-orange-50/50 p-3 rounded-2xl border border-orange-200/70">
              <div>
                <label className="block text-xs font-extrabold text-stone-800 mb-1">
                  Actual Price (আসল মূল্য ₹) <span className="text-orange-600">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="220"
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-stone-900"
                />
                <span className="text-[10px] text-stone-500 mt-0.5 block">মেনু কার্ডের আসল দাম</span>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-orange-700 mb-1">
                  Offer Price (অফার মূল্য ₹)
                </label>
                <input
                  type="number"
                  value={editDiscountPrice}
                  onChange={(e) => setEditDiscountPrice(e.target.value)}
                  placeholder="195 (ফাঁকা রাখলে ছাড় থাকবে না)"
                  className="w-full bg-white border border-orange-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-orange-600 shadow-2xs"
                />
                <span className="text-[10px] text-orange-600 font-semibold mt-0.5 block">
                  {editDiscountPrice ? `কাস্টমার ₹${Number(editPrice) - Number(editDiscountPrice)} ছাড় পাবে` : 'ছাড় না দিলে খালি রাখুন'}
                </span>
              </div>
            </div>

            {/* Veg / Non-Veg Selector */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Food Type (খাবারের ধরণ)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditIsVeg(true)}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    editIsVeg
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                      : 'bg-white border-stone-200 text-stone-700'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                  <span className="text-xs font-bold">Veg (নিরামিষ)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditIsVeg(false)}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    !editIsVeg
                      ? 'bg-red-50 border-red-500 text-red-900 ring-2 ring-red-500/20'
                      : 'bg-white border-stone-200 text-stone-700'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
                  <span className="text-xs font-bold">Non-Veg (আমিষ)</span>
                </button>
              </div>
            </div>

            {/* Stock Availability Selector (In Stock / Out of Stock) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Item Stock Status (স্টক স্ট্যাটাস)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditIsAvailable(true)}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    editIsAvailable
                      ? 'bg-emerald-100 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/30'
                      : 'bg-white border-stone-200 text-stone-700'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0 animate-pulse" />
                  <span className="text-xs font-extrabold">🟢 In Stock (স্টকে আছে)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditIsAvailable(false)}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    !editIsAvailable
                      ? 'bg-rose-100 border-rose-500 text-rose-900 ring-2 ring-rose-500/30'
                      : 'bg-white border-stone-200 text-stone-700'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                  <span className="text-xs font-extrabold">🔴 Out of Stock (স্টক শেষ)</span>
                </button>
              </div>
            </div>

            {/* Photo Upload & Preview Container */}
            <div className="space-y-3 bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
              <label className="block text-xs font-extrabold text-stone-800 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-orange-600" />
                <span>Update Dish Photo (ছবি পরিবর্তন করুন)</span>
              </label>

              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-2xl bg-stone-200 border-2 border-dashed border-stone-300 overflow-hidden shrink-0 shadow-2xs">
                  {editPhotoUrl ? (
                    <img src={editPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400 text-[10px] font-bold">
                      No Photo
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <label className="cursor-pointer bg-stone-900 hover:bg-stone-800 text-white border rounded-xl px-3 py-1.5 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95">
                    <Upload className="w-3.5 h-3.5 text-orange-400" />
                    <span>Upload New Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditFileUpload}
                      className="hidden"
                    />
                  </label>

                  <input
                    type="text"
                    value={editPhotoUrl}
                    onChange={(e) => setEditPhotoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-[11px]"
                  />
                </div>
              </div>

              {/* Sample Preset Photos */}
              <div>
                <div className="text-[10px] font-bold text-stone-500 mb-1">Quick Presets:</div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { label: 'Biryani', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500' },
                    { label: 'Sweets', url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500' },
                    { label: 'Beverage', url: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=500' },
                    { label: 'Snacks/Roll', url: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=500' },
                    { label: 'Naan/Bread', url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500' },
                    { label: 'Bengali Thali', url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500' },
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditPhotoUrl(p.url)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap border transition-all cursor-pointer ${
                        editPhotoUrl === p.url
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setEditingFood(null)}
                className="px-4 py-2 text-xs font-bold text-stone-500 hover:text-stone-800"
              >
                Cancel (বাতিল)
              </button>
              <button
                type="submit"
                disabled={isUpdatingDish}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                {isUpdatingDish ? 'Saving Changes...' : 'Save Prices & Details (পরিবর্তন সেভ করুন)'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Order Details & Printable Invoice Modal */}
      {selectedOrderForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-black text-stone-900 text-base">
                  Order Invoice #{selectedOrderForDetails.order_number}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {selectedOrderForDetails.placed_at ? new Date(selectedOrderForDetails.placed_at).toLocaleString() : 'Recent'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForDetails(null)}
                className="text-stone-400 hover:text-stone-700 font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-1">
                <div className="font-extrabold text-stone-900">Customer: {selectedOrderForDetails.customer_name}</div>
                <div className="text-stone-600">Address: {selectedOrderForDetails.delivery_address}</div>
              </div>

              <div className="border border-stone-200 rounded-2xl p-3 space-y-2">
                <div className="font-extrabold text-stone-900 border-b pb-1">Items Breakdown</div>
                {selectedOrderForDetails.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between font-medium">
                    <span>{it.quantity}x {it.food_name}</span>
                    <span className="font-mono font-bold">₹{it.total_price}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-black text-sm text-stone-900">
                  <span>Customer Total Bill</span>
                  <span className="font-mono text-orange-600">₹{selectedOrderForDetails.grand_total}</span>
                </div>
              </div>

              {/* Settlement & Delivery Mode Payout */}
              <div className="bg-orange-50/70 border border-orange-200 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="font-extrabold text-stone-900 flex items-center justify-between border-b border-orange-200/80 pb-1.5">
                  <span>Restaurant Net Earning (রেস্তোরাঁর নিট প্রাপ্য):</span>
                  <span className="font-mono text-sm font-black text-emerald-700">
                    ₹{(selectedOrderForDetails as any).net_restaurant_amount || Math.round(selectedOrderForDetails.subtotal * 0.85)}
                  </span>
                </div>
                <div className="text-[11px] leading-relaxed">
                  {selectedOrderForDetails.is_self_delivery || selectedOrderForDetails.delivery_mode === 'self_delivery' ? (
                    <div className="text-orange-950 font-bold">
                      🚴‍♂️ <span className="underline">সেলফ ডেলিভারি হিসাব:</span> খাবারের মোট মূল্য থেকে {restaurant.commission_rate}% প্ল্যাটফর্ম ফি বাদ + সম্পূর্ণ ডেলিভারি ফি (₹{selectedOrderForDetails.delivery_fee}) সহ রেস্তোরাঁ মোট অর্থ পাবে।
                    </div>
                  ) : (
                    <div className="text-stone-800 font-bold">
                      🛵 <span className="underline">প্ল্যাটফর্ম রাইডার ডেলিভারি:</span> রেস্তোরাঁ সেলফ ডেলিভারি না করায় ডেলিভারি কমিশন ও রাইডার ফি (₹{selectedOrderForDetails.delivery_fee}) বাদ দিয়ে বাকি খাবারের মূল্য (₹{selectedOrderForDetails.subtotal} - {restaurant.commission_rate}%) রেস্তোরাঁ পাবে।
                    </div>
                  )}
                </div>
              </div>

              <div className="text-stone-500 text-[11px] text-center pt-1">
                Payment Method: <span className="font-bold uppercase">{selectedOrderForDetails.payment_method}</span> | Status: <span className="font-bold uppercase text-emerald-700">{selectedOrderForDetails.payment_status}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
              >
                Print Invoice
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrderForDetails(null)}
                className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
