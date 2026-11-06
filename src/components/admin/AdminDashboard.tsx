import React, { useEffect, useState } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import {
  ShieldAlert,
  Users,
  Store,
  Bike,
  ShoppingBag,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  FileText,
  DollarSign,
  Layers,
  Search,
  Clock,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  Filter,
  Lock,
  Unlock,
  HelpCircle,
  Sparkles,
  MessageSquare,
  Ban,
  Send,
  Mail,
  Sliders,
  Percent,
  Calculator,
  Edit3,
  Navigation,
  Compass,
  Check,
  Eye,
  X,
  ExternalLink,
  Calendar,
  CreditCard,
  Phone,
  Shield,
  Award,
  Package,
  Truck,
  Info,
  History,
  Plus,
  Trash2,
  Crosshair,
  Globe,
  Tag,
  Gift,
  BadgePercent,
  Zap,
  Edit,
  Camera,
  Save,
  Upload
} from 'lucide-react';
import { Restaurant, DeliveryPartner, Order, ServiceArea } from '../../types';
import { apiRequest } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const isPointInPolygon = (point: { lat: number; lng: number }, polygon: { lat: number; lng: number }[]): boolean => {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;

    const intersect = ((yi > point.lng) !== (yj > point.lng))
      && (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const findServiceAreaForPoint = (point: { lat: number; lng: number }, areas: ServiceArea[]) => {
  for (const sa of areas) {
    if (sa.is_active && sa.polygon && sa.polygon.length >= 3 && isPointInPolygon(point, sa.polygon)) {
      return sa;
    }
  }
  return null;
};

const MapCircleOverlay: React.FC<{
  center: { lat: number; lng: number };
  radiusMeters: number;
  strokeColor?: string;
  fillColor?: string;
}> = ({ center, radiusMeters, strokeColor = '#9333ea', fillColor = '#a855f7' }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps || !google.maps.Circle) return;

    const circle = new google.maps.Circle({
      center,
      radius: radiusMeters,
      strokeColor,
      strokeOpacity: 0.85,
      strokeWeight: 2,
      fillColor,
      fillOpacity: 0.18,
      map
    });

    return () => {
      circle.setMap(null);
    };
  }, [map, center.lat, center.lng, radiusMeters, strokeColor, fillColor]);

  return null;
};

const MapPolygonOverlay: React.FC<{
  paths: { lat: number; lng: number }[];
  strokeColor?: string;
  fillColor?: string;
}> = ({ paths, strokeColor = '#7c3aed', fillColor = '#8b5cf6' }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps || !google.maps.Polygon) return;

    const polygon = new google.maps.Polygon({
      paths,
      strokeColor,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor,
      fillOpacity: 0.15,
      map
    });

    return () => {
      polygon.setMap(null);
    };
  }, [map, paths, strokeColor, fillColor]);

  return null;
};

export const AdminDashboard: React.FC = () => {
  const { language } = useLanguage();

  const [metrics, setMetrics] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [globalCodEnabled, setGlobalCodEnabled] = useState<boolean>(false);
  const [escrowMetrics, setEscrowMetrics] = useState<any>(null);
  const [escrowOrders, setEscrowOrders] = useState<any[]>([]);
  const [escrowFilter, setEscrowFilter] = useState<'all' | 'holding' | 'matured' | 'disputed' | 'refunded' | 'settled'>('all');
  const [escrowSearch, setEscrowSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'cod' | 'prepaid'>('all');
  const [partnerFilter, setPartnerFilter] = useState<'all' | 'pending' | 'approved' | 'blocked'>('all');
  const [partnerSearch, setPartnerSearch] = useState('');
  const [refundModalOrder, setRefundModalOrder] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState('Order dispute / quality issue resolved by Admin');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundPercentage, setRefundPercentage] = useState<number>(50);
  const [withholdRestPct, setWithholdRestPct] = useState<number>(50);
  const [withholdDpPct, setWithholdDpPct] = useState<number>(50);
  const [isProcessingRefund, setIsProcessingRefund] = useState<boolean>(false);
  const [disputeModalOrder, setDisputeModalOrder] = useState<any | null>(null);
  const [disputeReason, setDisputeReason] = useState('Payment held pending customer issue investigation');
  const [settleModalOrder, setSettleModalOrder] = useState<any | null>(null);
  const [settleNote, setSettleNote] = useState('24h maturity / manual Admin release approved');

  // Messaging Modal State
  const [messageModalData, setMessageModalData] = useState<{
    role: 'restaurant' | 'delivery' | 'customer';
    id: number;
    name: string;
  } | null>(null);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgTitleBn, setMsgTitleBn] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgBodyBn, setMsgBodyBn] = useState('');
  const [msgPriority, setMsgPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  // Full Details Modals for Restaurant, Delivery Partner, and Customer
  const [selectedDetailRestaurant, setSelectedDetailRestaurant] = useState<Restaurant | null>(null);
  const [selectedDetailPartner, setSelectedDetailPartner] = useState<DeliveryPartner | null>(null);
  const [selectedDetailCustomer, setSelectedDetailCustomer] = useState<any | null>(null);
  const [isLoadingFullRest, setIsLoadingFullRest] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  // Admin Direct Settlement & Customer Refund Modals State
  const [settleRestaurantModal, setSettleRestaurantModal] = useState<Restaurant | null>(null);
  const [settlePartnerModal, setSettlePartnerModal] = useState<DeliveryPartner | null>(null);
  const [refundCustomerModal, setRefundCustomerModal] = useState<any | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [settleReference, setSettleReference] = useState<string>('');
  const [settleNotes, setSettleNotes] = useState<string>('Payment settled via Admin Portal');
  const [isProcessingSettlement, setIsProcessingSettlement] = useState<boolean>(false);
  const [settleFeedbackMsg, setSettleFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSettleRestaurantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleRestaurantModal) return;
    setIsProcessingSettlement(true);
    try {
      const res = await apiRequest(`/api/admin/restaurants/${settleRestaurantModal.id}/settle`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(settleAmount),
          reference: settleReference || `UTR-${Date.now()}`,
          note: settleNotes
        })
      });
      setSettleFeedbackMsg({ type: 'success', text: res.message || 'Restaurant settlement recorded successfully!' });
      setSettleRestaurantModal(null);
      setSettleAmount('');
      setSettleReference('');
      fetchAdminData();
      setTimeout(() => setSettleFeedbackMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Settlement failed');
    } finally {
      setIsProcessingSettlement(false);
    }
  };

  const handleSettlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlePartnerModal) return;
    setIsProcessingSettlement(true);
    try {
      const res = await apiRequest(`/api/admin/delivery-partners/${settlePartnerModal.id}/settle`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(settleAmount),
          reference: settleReference || `UTR-${Date.now()}`,
          note: settleNotes
        })
      });
      setSettleFeedbackMsg({ type: 'success', text: res.message || 'Delivery partner settlement recorded successfully!' });
      setSettlePartnerModal(null);
      setSettleAmount('');
      setSettleReference('');
      fetchAdminData();
      setTimeout(() => setSettleFeedbackMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Settlement failed');
    } finally {
      setIsProcessingSettlement(false);
    }
  };

  const handleRefundCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundCustomerModal) return;
    setIsProcessingSettlement(true);
    try {
      const res = await apiRequest(`/api/admin/customers/${refundCustomerModal.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(settleAmount),
          reference: settleReference || `REF-${Date.now()}`,
          note: settleNotes
        })
      });
      setSettleFeedbackMsg({ type: 'success', text: res.message || 'Customer refund processed successfully!' });
      setRefundCustomerModal(null);
      setSettleAmount('');
      setSettleReference('');
      fetchAdminData();
      setTimeout(() => setSettleFeedbackMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Refund failed');
    } finally {
      setIsProcessingSettlement(false);
    }
  };

  const handleExecuteOrderSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleModalOrder) return;
    setIsProcessingSettlement(true);
    try {
      const res = await apiRequest(`/api/admin/escrow/${settleModalOrder.id}/settle`, {
        method: 'POST',
        body: JSON.stringify({ note: settleNote })
      });
      setSettleFeedbackMsg({
        type: 'success',
        text: res.message || 'Payment successfully settled to Restaurant & Delivery Partner accounts!'
      });
      setSettleModalOrder(null);
      fetchAdminData();
      setTimeout(() => setSettleFeedbackMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Settlement failed');
    } finally {
      setIsProcessingSettlement(false);
    }
  };

  const handleExecuteOrderRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalOrder) return;
    setIsProcessingRefund(true);
    try {
      const res = await apiRequest(`/api/admin/escrow/${refundModalOrder.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({
          reason: refundReason,
          amount: refundAmount,
          refund_percentage: refundPercentage,
          withhold_restaurant_pct: withholdRestPct,
          withhold_delivery_pct: withholdDpPct
        })
      });
      setSettleFeedbackMsg({
        type: 'success',
        text: res.message || 'Refund decision executed successfully! Payouts updated in restaurant & rider portals.'
      });
      setRefundModalOrder(null);
      fetchAdminData();
      setTimeout(() => setSettleFeedbackMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Refund failed');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const handleOpenRestaurantDetails = async (rest: Restaurant) => {
    setSelectedDetailRestaurant(rest);
    try {
      setIsLoadingFullRest(true);
      const full = await apiRequest(`/api/restaurants/${rest.id}`);
      if (full) {
        setSelectedDetailRestaurant(full);
      }
    } catch (e) {
      console.error('Error fetching full restaurant details:', e);
    } finally {
      setIsLoadingFullRest(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'restaurants' | 'partners' | 'orders' | 'customers' | 'escrow' | 'geofence' | 'rates' | 'offers' | 'ranking'>('overview');
  const [selectedRestForMap, setSelectedRestForMap] = useState<Restaurant | null>(null);

  // Food Categories Management State (ক্যাটাগরি পরিচালনা)
  const [categories, setCategories] = useState<any[]>([]);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<any | null>(null);
  const [categoryMsg, setCategoryMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [catFormError, setCatFormError] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Category Form Input State
  const [catName, setCatName] = useState('');
  const [catNameBn, setCatNameBn] = useState('');
  const [catIcon, setCatIcon] = useState('🍽️');
  const [catImageUrl, setCatImageUrl] = useState('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400');
  const [catDesc, setCatDesc] = useState('');
  const [catIsActive, setCatIsActive] = useState(true);

  const handleCatImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const rawBase64 = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
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
            setCatImageUrl(canvas.toDataURL('image/jpeg', 0.82));
          } else {
            setCatImageUrl(rawBase64);
          }
        };
        img.onerror = () => setCatImageUrl(rawBase64);
        img.src = rawBase64;
      };
      reader.readAsDataURL(file);
    }
  };

  const resetCategoryForm = () => {
    setCatName('');
    setCatNameBn('');
    setCatIcon('🍽️');
    setCatImageUrl('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400');
    setCatDesc('');
    setCatIsActive(true);
    setCatFormError(null);
  };

  const handleOpenCreateCategory = () => {
    resetCategoryForm();
    setIsCreatingCategory(true);
  };

  const handleOpenEditCategory = (cat: any) => {
    setEditingCategory(cat);
    setCatName(cat.name || '');
    setCatNameBn(cat.name_bn || cat.name || '');
    setCatIcon(cat.icon || '🍽️');
    setCatImageUrl(cat.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400');
    setCatDesc(cat.description || '');
    setCatIsActive(cat.is_active !== 0);
    setCatFormError(null);
  };

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      setCatFormError('দয়া করে ক্যাটাগরির নাম লিখুন (Category name is required)');
      return;
    }
    setIsSavingCategory(true);
    setCatFormError(null);
    try {
      const res = await apiRequest('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: catName.trim(),
          name_bn: catNameBn.trim() || catName.trim(),
          icon: catIcon,
          image_url: catImageUrl,
          description: catDesc,
          is_active: catIsActive ? 1 : 0
        })
      });
      setCategoryMsg({ type: 'success', text: res.message || 'New category created successfully!' });
      setIsCreatingCategory(false);
      resetCategoryForm();
      fetchAdminData();
      setTimeout(() => setCategoryMsg(null), 5000);
    } catch (err: any) {
      setCatFormError(err.message || 'Failed to create category');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleUpdateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !catName.trim()) {
      setCatFormError('দয়া করে ক্যাটাগরির নাম লিখুন (Category name is required)');
      return;
    }
    setIsSavingCategory(true);
    setCatFormError(null);
    try {
      const res = await apiRequest(`/api/admin/categories/${editingCategory.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: catName.trim(),
          name_bn: catNameBn.trim() || catName.trim(),
          icon: catIcon,
          image_url: catImageUrl,
          description: catDesc,
          is_active: catIsActive ? 1 : 0
        })
      });
      setCategoryMsg({ type: 'success', text: res.message || 'Category updated successfully!' });
      setEditingCategory(null);
      resetCategoryForm();
      fetchAdminData();
      setTimeout(() => setCategoryMsg(null), 5000);
    } catch (err: any) {
      setCatFormError(err.message || 'Failed to update category');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategorySubmit = async () => {
    if (!deletingCategory) return;
    setIsSavingCategory(true);
    try {
      const res = await apiRequest(`/api/admin/categories/${deletingCategory.id}`, {
        method: 'DELETE'
      });
      setCategoryMsg({ type: 'success', text: res.message || 'Category deleted successfully!' });
      setDeletingCategory(null);
      fetchAdminData();
      setTimeout(() => setCategoryMsg(null), 5000);
    } catch (err: any) {
      setCategoryMsg({ type: 'error', text: err.message || 'Failed to delete category' });
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleToggleCategoryActive = async (cat: any) => {
    try {
      const nextActive = cat.is_active === 1 || cat.is_active === undefined ? 0 : 1;
      await apiRequest(`/api/admin/categories/${cat.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: nextActive })
      });
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: nextActive } : c))
      );
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle category status');
    }
  };

  // Platform Commission & Dynamic Fare Pricing State
  const [platformSettings, setPlatformSettings] = useState({
    restaurant_commission_percent: 15.0,
    delivery_partner_commission_percent: 10.0,
    delivery_per_km_rate: 10.0,
    delivery_base_fare: 25.0,
    delivery_base_distance_km: 2.0,
    min_delivery_fare: 20.0
  });
  const [isSavingRates, setIsSavingRates] = useState(false);
  const [ratesSaveSuccess, setRatesSaveSuccess] = useState('');

  // Interactive Live Distance Fare Simulator
  const [testSimDistance, setTestSimDistance] = useState(4.5);
  const [testSimOrderAmount, setTestSimOrderAmount] = useState(450);

  // ========================================================
  // Offers & Campaign Discount State
  // (রেস্তোরাঁ প্ল্যাটফর্ম চার্জ, রাইডার প্ল্যাটফর্ম চার্জ ও কাস্টমার ডেলিভারি চার্জ ডিসকাউন্ট)
  // ========================================================
  const [promotions, setPromotions] = useState<any>({
    restaurant_discount_enabled: 1,
    restaurant_discount_type: 'percent_off_commission',
    restaurant_discount_value: 50.0,
    restaurant_discount_title: 'Festival Partner Offer: 50% Off Platform Fee',
    restaurant_discount_title_bn: 'রেস্তোরাঁ উৎসব অফার: প্ল্যাটফর্ম ফি-তে ৫০% বিশেষ ছাড়!',
    restaurant_discount_note: 'All restaurant partners enjoy 50% discount on standard commission rates during this campaign period.',

    partner_discount_enabled: 1,
    partner_discount_type: 'zero_fee',
    partner_discount_value: 100.0,
    partner_bonus_per_order: 5.0,
    partner_discount_title: 'Rider Super Bonus: 0% Platform Deduction + ₹5 Extra Payout',
    partner_discount_title_bn: 'রাইডার ধামাকা বোনাস: ০% প্ল্যাটফর্ম কর্তন ও প্রতি ডেলিভারিতে অতিরিক্ত ₹৫ ইনসেনটিভ',
    partner_discount_note: 'Riders retain 100% of delivery fees with zero platform deduction and receive ₹5 cash bonus per completed delivery.',

    customer_delivery_discount_enabled: 1,
    customer_delivery_discount_type: 'free_delivery_above',
    customer_delivery_discount_value: 100.0,
    customer_min_order_for_free_delivery: 199.0,
    customer_flat_delivery_discount: 10.0,
    customer_first_order_free_delivery: 1,
    customer_promo_banner_enabled: 1,
    customer_promo_banner_text: '🎉 বিশেষ অফার: ₹১৯৯ টাকার বেশি অর্ডারে সম্পূর্ণ ফ্রি ডেলিভারি!',
    customer_promo_banner_text_en: '🎉 Limited Time Offer: FREE Delivery on all food orders above ₹199!'
  });
  const [isSavingOffers, setIsSavingOffers] = useState(false);
  const [offersSaveSuccess, setOffersSaveSuccess] = useState('');
  const [offersSaveError, setOffersSaveError] = useState('');

  // Customer Promocodes Management State
  const [adminCoupons, setAdminCoupons] = useState<any[]>([]);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoValue, setNewPromoValue] = useState('20');
  const [newPromoMaxDisc, setNewPromoMaxDisc] = useState('100');
  const [newPromoMinSubtotal, setNewPromoMinSubtotal] = useState('149');
  const [newPromoDesc, setNewPromoDesc] = useState('');
  const [newPromoDescBn, setNewPromoDescBn] = useState('');
  const [isCreatingPromo, setIsCreatingPromo] = useState(false);

  // Location-wise Nearby Restaurant Ranking State (কাছাকাছি রেস্তোরাঁ র‍্যাঙ্কিং ও অবস্থান)
  const [restaurantRankings, setRestaurantRankings] = useState<any[]>([]);
  const [selectedRankingAreaId, setSelectedRankingAreaId] = useState<number>(0);
  const [topRanksMap, setTopRanksMap] = useState<{ [rank: number]: number }>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  });
  const [isSavingRankings, setIsSavingRankings] = useState(false);
  const [rankingSuccessMsg, setRankingSuccessMsg] = useState('');

  // Radius-wise Specific Location Ranking Rules State (পয়েন্ট ও রেডিয়াস নির্ভর র‍্যাঙ্কিং)
  const [locationRadiusRules, setLocationRadiusRules] = useState<any[]>([]);
  const [isRadiusRuleModalOpen, setIsRadiusRuleModalOpen] = useState(false);
  const [editingRadiusRule, setEditingRadiusRule] = useState<any | null>(null);
  const [isSavingRadiusRule, setIsSavingRadiusRule] = useState(false);
  const [deletingRadiusRule, setDeletingRadiusRule] = useState<{ id: number; name: string } | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState(false);

  const handleStartCreateRadiusRule = () => {
    let initLat = 22.5400;
    let initLng = 88.3600;
    const firstActiveSa = serviceAreas.find((sa) => sa.is_active && sa.polygon && sa.polygon.length > 0);
    if (firstActiveSa && firstActiveSa.polygon.length > 0) {
      let tLat = 0, tLng = 0;
      firstActiveSa.polygon.forEach((p) => { tLat += p.lat; tLng += p.lng; });
      initLat = parseFloat((tLat / firstActiveSa.polygon.length).toFixed(6));
      initLng = parseFloat((tLng / firstActiveSa.polygon.length).toFixed(6));
    }

    setEditingRadiusRule({
      id: null,
      name: '',
      name_bn: '',
      lat: initLat,
      lng: initLng,
      radius_km: 3.5,
      is_active: 1,
      rankings: [
        { rank: 1, restaurant_id: 0 },
        { rank: 2, restaurant_id: 0 },
        { rank: 3, restaurant_id: 0 },
        { rank: 4, restaurant_id: 0 },
        { rank: 5, restaurant_id: 0 }
      ]
    });
    setIsRadiusRuleModalOpen(true);
  };

  const handleStartEditRadiusRule = (rule: any) => {
    const rankArray = [1, 2, 3, 4, 5].map((rNum) => {
      const existing = (rule.rankings || []).find((r: any) => Number(r.rank) === rNum);
      return {
        rank: rNum,
        restaurant_id: existing ? Number(existing.restaurant_id) : 0
      };
    });

    setEditingRadiusRule({
      ...rule,
      rankings: rankArray
    });
    setIsRadiusRuleModalOpen(true);
  };

  const handleSaveRadiusRule = async () => {
    if (!editingRadiusRule) return;
    if (!editingRadiusRule.name?.trim()) {
      alert('Please provide a Location Ranking Rule Name (e.g. Park Circus Crossing 3KM).');
      return;
    }

    // Strict Client-side Service Boundary Check
    const isInside = !!findServiceAreaForPoint(
      { lat: Number(editingRadiusRule.lat), lng: Number(editingRadiusRule.lng) },
      serviceAreas
    );

    if (!isInside) {
      alert('⚠️ নির্বাচিত অবস্থানটি সার্ভিস বাউন্ডারির বাইরে (Out of Service Area)! অনুগ্রহ করে ম্যাপে সবুজ চিহ্নিত সার্ভিস এরিয়ার ভেতরে পিন সিলেক্ট করুন।');
      return;
    }

    setIsSavingRadiusRule(true);
    try {
      const saved = await apiRequest('/api/admin/location-rankings', {
        method: 'POST',
        body: JSON.stringify(editingRadiusRule)
      });
      if (saved) {
        setLocationRadiusRules((prev) => {
          const idx = prev.findIndex((r) => r.id === saved.id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = saved;
            return next;
          }
          return [saved, ...prev];
        });
      }
      setRankingSuccessMsg('Location Radius Ranking Rule saved successfully! (রেডিয়াস র‍্যাঙ্কিং রুল সেভ করা হয়েছে)');
      setIsRadiusRuleModalOpen(false);
      fetchAdminData();
    } catch (e: any) {
      alert(e.message || 'Failed to save location radius rule');
    } finally {
      setIsSavingRadiusRule(false);
    }
  };

  const handleOpenDeleteRadiusRule = (ruleId: number, ruleName: string) => {
    setDeletingRadiusRule({ id: ruleId, name: ruleName });
  };

  const handleConfirmDeleteRadiusRule = async () => {
    if (!deletingRadiusRule) return;
    setIsDeletingRule(true);
    try {
      await apiRequest(`/api/admin/location-rankings/${deletingRadiusRule.id}`, {
        method: 'DELETE'
      });
      setLocationRadiusRules((prev) => prev.filter((r) => r.id !== deletingRadiusRule.id));
      setRankingSuccessMsg(`Location ranking rule "${deletingRadiusRule.name}" deleted successfully! (রুলটি মুছে ফেলা হয়েছে)`);
      setDeletingRadiusRule(null);
      fetchAdminData();
    } catch (e: any) {
      alert(e.message || 'Failed to delete location ranking rule');
    } finally {
      setIsDeletingRule(false);
    }
  };

  const handleToggleRadiusRuleStatus = async (ruleId: number) => {
    try {
      const updated = await apiRequest(`/api/admin/location-rankings/${ruleId}/toggle-status`, {
        method: 'PUT'
      });
      if (updated) {
        setLocationRadiusRules((prev) =>
          prev.map((r) => (r.id === ruleId ? { ...r, is_active: updated.is_active } : r))
        );
      }
      fetchAdminData();
    } catch (e: any) {
      alert(e.message || 'Failed to toggle status');
    }
  };

  // Live offer simulators
  const [testRestSubtotal, setTestRestSubtotal] = useState(500);
  const [testRiderDeliveryFare, setTestRiderDeliveryFare] = useState(40);
  const [testCustomerSubtotal, setTestCustomerSubtotal] = useState(250);
  const [testCustomerDeliveryFee, setTestCustomerDeliveryFee] = useState(35);

  // Individual restaurant commission override modal
  const [editingRestCommission, setEditingRestCommission] = useState<{ id: number; name: string; rate: number } | null>(null);
  const [isSavingRestComm, setIsSavingRestComm] = useState(false);

  // ========================================================
  // Service Area & Geofence Boundary Management State
  // ========================================================
  const [editingServiceArea, setEditingServiceArea] = useState<ServiceArea | null>(null);
  const [isCreatingServiceArea, setIsCreatingServiceArea] = useState<boolean>(false);
  const [isSavingArea, setIsSavingArea] = useState<boolean>(false);
  const [serviceAreaMsg, setServiceAreaMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [createModalError, setCreateModalError] = useState<string | null>(null);

  // New service area form state
  const [newAreaName, setNewAreaName] = useState('Raidighi Bazaar & Town Service Area');
  const [newAreaNameBn, setNewAreaNameBn] = useState('রায়দিঘি বাজার ও শহর সার্ভিস এরিয়া');
  const [newAreaMinCharge, setNewAreaMinCharge] = useState<number>(20);
  const [newAreaPerKmCharge, setNewAreaPerKmCharge] = useState<number>(7);
  const [newAreaPoints, setNewAreaPoints] = useState<{ lat: number; lng: number }[]>([
    { lat: 21.9400, lng: 88.4100 },
    { lat: 21.9400, lng: 88.4600 },
    { lat: 21.9000, lng: 88.4650 },
    { lat: 21.8950, lng: 88.4150 }
  ]);

  // Radius generator for new / edit modal
  const [radiusCenterLat, setRadiusCenterLat] = useState<number>(21.9212);
  const [radiusCenterLng, setRadiusCenterLng] = useState<number>(88.4350);
  const [radiusDistanceKm, setRadiusDistanceKm] = useState<number>(4);
  const [polygonVertexCount, setPolygonVertexCount] = useState<number>(12);
  const [createInteractionMode, setCreateInteractionMode] = useState<'drag' | 'click_add'>('drag');
  const [editInteractionMode, setEditInteractionMode] = useState<'drag' | 'click_add'>('drag');

  // Location / Boundary GPS Testing Tool
  const [showLocationTester, setShowLocationTester] = useState<boolean>(false);
  const [testLocationLat, setTestLocationLat] = useState<string>('21.9212');
  const [testLocationLng, setTestLocationLng] = useState<string>('88.4350');
  const [testLocationResult, setTestLocationResult] = useState<any | null>(null);
  const [isTestingLocation, setIsTestingLocation] = useState<boolean>(false);
  const [selectedAreaForMap, setSelectedAreaForMap] = useState<ServiceArea | null>(null);

  // Delete Service Area Modal State
  const [deletingArea, setDeletingArea] = useState<ServiceArea | null>(null);
  const [isDeletingArea, setIsDeletingArea] = useState<boolean>(false);

  // Helper to generate circular polygon vertices from center and radius
  const generateRadiusPolygon = (centerLat: number, centerLng: number, radiusKm: number, numPoints = 12) => {
    const points: { lat: number; lng: number }[] = [];
    const earthRadius = 6371; // km
    for (let i = 0; i < numPoints; i++) {
      const angle = (i * 360 / numPoints) * (Math.PI / 180);
      const dLat = (radiusKm * Math.cos(angle)) / earthRadius;
      const dLng = (radiusKm * Math.sin(angle)) / (earthRadius * Math.cos(centerLat * Math.PI / 180));
      const pLat = Number((centerLat + (dLat * 180 / Math.PI)).toFixed(5));
      const pLng = Number((centerLng + (dLng * 180 / Math.PI)).toFixed(5));
      points.push({ lat: pLat, lng: pLng });
    }
    return points;
  };

  // Helper to update center coordinates and regenerate polygon
  const handleUpdateNewAreaCenter = (lat: number, lng: number, radius = radiusDistanceKm, vertices = polygonVertexCount) => {
    const roundedLat = Number(lat.toFixed(5));
    const roundedLng = Number(lng.toFixed(5));
    setRadiusCenterLat(roundedLat);
    setRadiusCenterLng(roundedLng);
    const pts = generateRadiusPolygon(roundedLat, roundedLng, radius, vertices);
    setNewAreaPoints(pts);
  };

  const calculateCenterOfPolygon = (polygon: { lat: number; lng: number }[]) => {
    if (!polygon || polygon.length === 0) return { lat: 21.9212, lng: 88.4350 };
    const validPts = polygon.filter(p => !isNaN(Number(p.lat)) && !isNaN(Number(p.lng)));
    if (validPts.length === 0) return { lat: 21.9212, lng: 88.4350 };
    const avgLat = validPts.reduce((sum, p) => sum + Number(p.lat), 0) / validPts.length;
    const avgLng = validPts.reduce((sum, p) => sum + Number(p.lng), 0) / validPts.length;
    return { lat: Number(avgLat.toFixed(5)), lng: Number(avgLng.toFixed(5)) };
  };

  const handleCreateServiceAreaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateModalError(null);
    if (!newAreaName.trim()) {
      setCreateModalError('দয়া করে সার্ভিস এরিয়ার নাম লিখুন (Please enter service area name)');
      return;
    }

    const validPolygon = (newAreaPoints || [])
      .map((pt) => ({ lat: Number(Number(pt.lat).toFixed(5)), lng: Number(Number(pt.lng).toFixed(5)) }))
      .filter((pt) => !isNaN(pt.lat) && !isNaN(pt.lng));

    if (validPolygon.length < 3) {
      setCreateModalError('বাউন্ডারি পলিগনে কমপক্ষে ৩টি সঠিক কোঅর্ডিনেট পয়েন্ট থাকতে হবে (Boundary polygon must contain at least 3 points)');
      return;
    }

    setIsSavingArea(true);
    setServiceAreaMsg(null);
    try {
      const payload = {
        name: newAreaName.trim(),
        name_bn: (newAreaNameBn || newAreaName).trim(),
        min_delivery_charge: Math.max(0, Number(newAreaMinCharge) || 0),
        per_km_charge: Math.max(0, Number(newAreaPerKmCharge) || 0),
        is_active: 1,
        polygon: validPolygon
      };

      const created = await apiRequest('/api/admin/service-areas', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (created) {
        setServiceAreas((prev) => [...prev, created]);
      }

      setServiceAreaMsg({ text: `Service area "${payload.name}" created successfully (সার্ভিস এরিয়া বাউন্ডারি যুক্ত হয়েছে)`, type: 'success' });
      setIsCreatingServiceArea(false);
      fetchAdminData();
      setTimeout(() => setServiceAreaMsg(null), 5000);
    } catch (e: any) {
      console.error('Create service area error:', e);
      setCreateModalError(e.message || 'Failed to create service area');
    } finally {
      setIsSavingArea(false);
    }
  };

  const handleUpdateServiceAreaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServiceArea) return;
    setEditModalError(null);
    if (!editingServiceArea.name.trim()) {
      setEditModalError('দয়া করে সার্ভিস এরিয়ার নাম লিখুন (Please enter service area name)');
      return;
    }

    const validPolygon = (editingServiceArea.polygon || [])
      .map((pt) => ({ lat: Number(Number(pt.lat).toFixed(5)), lng: Number(Number(pt.lng).toFixed(5)) }))
      .filter((pt) => !isNaN(pt.lat) && !isNaN(pt.lng));

    if (validPolygon.length < 3) {
      setEditModalError('বাউন্ডারি পলিগনে কমপক্ষে ৩টি সঠিক কোঅর্ডিনেট পয়েন্ট থাকতে হবে (Boundary polygon must contain at least 3 points)');
      return;
    }

    setIsSavingArea(true);
    setServiceAreaMsg(null);
    try {
      const payload = {
        name: editingServiceArea.name.trim(),
        name_bn: (editingServiceArea.name_bn || editingServiceArea.name).trim(),
        min_delivery_charge: Math.max(0, Number(editingServiceArea.min_delivery_charge) || 0),
        per_km_charge: Math.max(0, Number(editingServiceArea.per_km_charge) || 0),
        is_active: editingServiceArea.is_active ? 1 : 0,
        polygon: validPolygon
      };

      await apiRequest(`/api/admin/service-areas/${editingServiceArea.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      // Update local state instantly
      setServiceAreas((prev) =>
        prev.map((sa) => (sa.id === editingServiceArea.id ? { ...sa, ...payload } : sa))
      );

      setServiceAreaMsg({ text: `Service area "${payload.name}" updated successfully (বাউন্ডারি সফলভাবে আপডেট হয়েছে)!`, type: 'success' });
      setEditingServiceArea(null);
      fetchAdminData();
      setTimeout(() => setServiceAreaMsg(null), 5000);
    } catch (e: any) {
      console.error('Update service area error:', e);
      setEditModalError(e.message || 'Failed to update service area boundary');
    } finally {
      setIsSavingArea(false);
    }
  };

  const handleToggleAreaActive = async (sa: ServiceArea) => {
    try {
      await apiRequest(`/api/admin/service-areas/${sa.id}/toggle`, {
        method: 'PUT'
      });
      fetchAdminData();
    } catch (e: any) {
      alert(e.message || 'Failed to toggle status');
    }
  };

  const handleConfirmDeleteArea = async () => {
    if (!deletingArea) return;
    setIsDeletingArea(true);
    try {
      const res = await apiRequest(`/api/admin/service-areas/${deletingArea.id}`, {
        method: 'DELETE'
      });
      setServiceAreaMsg({
        text: res.message || `Service area "${deletingArea.name}" deleted successfully (সার্ভিস এরিয়া সফলভাবে ডিলিট হয়েছে)।`,
        type: 'success'
      });
      if (editingServiceArea?.id === deletingArea.id) {
        setEditingServiceArea(null);
      }
      setDeletingArea(null);
      fetchAdminData();
      setTimeout(() => setServiceAreaMsg(null), 5000);
    } catch (e: any) {
      setServiceAreaMsg({ text: e.message || 'Failed to delete service area', type: 'error' });
    } finally {
      setIsDeletingArea(false);
    }
  };

  const handleTestLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingLocation(true);
    setTestLocationResult(null);
    try {
      const res = await apiRequest('/api/admin/service-areas/test-location', {
        method: 'POST',
        body: JSON.stringify({
          lat: Number(testLocationLat),
          lng: Number(testLocationLng)
        })
      });
      setTestLocationResult(res.data);
    } catch (e: any) {
      alert(e.message || 'Failed to test location');
    } finally {
      setIsTestingLocation(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      const dash = await apiRequest('/api/admin/dashboard');
      setMetrics(dash.metrics);

      // Fetch enriched service areas
      try {
        const saList = await apiRequest('/api/admin/service-areas');
        setServiceAreas(saList || dash.serviceAreas || []);
      } catch (err) {
        setServiceAreas(dash.serviceAreas || []);
      }

      const rests = await apiRequest('/api/admin/restaurants');
      setRestaurants(rests);

      const dps = await apiRequest('/api/admin/delivery-partners');
      setPartners(dps);

      const ords: Order[] = await apiRequest('/api/orders');
      setOrders(ords);

      const custData = await apiRequest('/api/admin/customers');
      setCustomers(custData.customers || []);
      setGlobalCodEnabled(Boolean(custData.global_cod_enabled));

      const escrowData = await apiRequest('/api/admin/escrow');
      setEscrowMetrics(escrowData.metrics);
      setEscrowOrders(escrowData.orders || []);

      // Fetch dynamic rates & commissions from admin settings
      const settingsData = await apiRequest('/api/admin/settings');
      const s = settingsData?.data ? settingsData.data : settingsData;
      if (s) {
        setPlatformSettings({
          restaurant_commission_percent: Number(s.restaurant_commission_percent ?? 15),
          delivery_partner_commission_percent: Number(s.delivery_partner_commission_percent ?? 10),
          delivery_per_km_rate: Number(s.delivery_per_km_rate ?? 10),
          delivery_base_fare: Number(s.delivery_base_fare ?? 25),
          delivery_base_distance_km: Number(s.delivery_base_distance_km ?? 2),
          min_delivery_fare: Number(s.min_delivery_fare ?? 20)
        });
      }

      // Fetch promotions & platform charge discount offers
      try {
        const promoData = await apiRequest('/api/admin/promotions');
        const p = promoData?.data ? promoData.data : promoData;
        if (p) {
          setPromotions({
            restaurant_discount_enabled: p.restaurant_discount_enabled !== undefined ? Number(p.restaurant_discount_enabled) : 1,
            restaurant_discount_type: p.restaurant_discount_type || 'percent_off_commission',
            restaurant_discount_value: Number(p.restaurant_discount_value ?? 50),
            restaurant_discount_title: p.restaurant_discount_title || 'Festival Partner Offer: 50% Off Platform Fee',
            restaurant_discount_title_bn: p.restaurant_discount_title_bn || 'রেস্তোরাঁ উৎসব অফার: প্ল্যাটফর্ম ফি-তে ৫০% বিশেষ ছাড়!',
            restaurant_discount_note: p.restaurant_discount_note || 'All restaurant partners enjoy 50% discount on standard commission rates during this campaign period.',

            partner_discount_enabled: p.partner_discount_enabled !== undefined ? Number(p.partner_discount_enabled) : 1,
            partner_discount_type: p.partner_discount_type || 'zero_fee',
            partner_discount_value: Number(p.partner_discount_value ?? 100),
            partner_bonus_per_order: Number(p.partner_bonus_per_order ?? 5),
            partner_discount_title: p.partner_discount_title || 'Rider Super Bonus: 0% Platform Deduction + ₹5 Extra Payout',
            partner_discount_title_bn: p.partner_discount_title_bn || 'রাইডার ধামাকা বোনাস: ০% প্ল্যাটফর্ম কর্তন ও প্রতি ডেলিভারিতে অতিরিক্ত ₹৫ ইনসেনটিভ',
            partner_discount_note: p.partner_discount_note || 'Riders retain 100% of delivery fees with zero platform deduction and receive ₹5 cash bonus per completed delivery.',

            customer_delivery_discount_enabled: p.customer_delivery_discount_enabled !== undefined ? Number(p.customer_delivery_discount_enabled) : 1,
            customer_delivery_discount_type: p.customer_delivery_discount_type || 'free_delivery_above',
            customer_delivery_discount_value: Number(p.customer_delivery_discount_value ?? 100),
            customer_min_order_for_free_delivery: Number(p.customer_min_order_for_free_delivery ?? 199),
            customer_flat_delivery_discount: Number(p.customer_flat_delivery_discount ?? 10),
            customer_first_order_free_delivery: p.customer_first_order_free_delivery !== undefined ? Number(p.customer_first_order_free_delivery) : 1,
            customer_promo_banner_enabled: p.customer_promo_banner_enabled !== undefined ? Number(p.customer_promo_banner_enabled) : 1,
            customer_promo_banner_text: p.customer_promo_banner_text || '🎉 বিশেষ অফার: ₹১৯৯ টাকার বেশি অর্ডারে সম্পূর্ণ ফ্রি ডেলিভারি!',
            customer_promo_banner_text_en: p.customer_promo_banner_text_en || '🎉 Limited Time Offer: FREE Delivery on all food orders above ₹199!'
          });
        }
      } catch (err) {
        console.error('Fetch promo error:', err);
      }
      // Fetch dynamic categories
      try {
        const catRes = await apiRequest('/api/admin/categories');
        const cList = catRes?.data ? catRes.data : catRes;
        if (cList && Array.isArray(cList)) {
          setCategories(cList);
        }
      } catch (err) {
        console.error('Fetch categories error:', err);
      }

      // Fetch platform customer coupons
      try {
        const cRes = await apiRequest('/api/coupons');
        if (cRes?.data?.platformCoupons) {
          setAdminCoupons(cRes.data.platformCoupons);
        }
      } catch (err) {
        console.error('Fetch coupons error:', err);
      }

      // Fetch restaurant & location rankings
      try {
        const [rankRes, locRulesRes] = await Promise.allSettled([
          apiRequest('/api/admin/restaurant-rankings'),
          apiRequest('/api/admin/location-rankings')
        ]);

        if (rankRes.status === 'fulfilled' && rankRes.value) {
          const val = rankRes.value;
          if (Array.isArray(val)) {
            setRestaurantRankings(val);
          } else {
            if (val.service_area_rankings) setRestaurantRankings(val.service_area_rankings);
            if (val.location_rankings && Array.isArray(val.location_rankings)) {
              setLocationRadiusRules(val.location_rankings);
            }
          }
        }

        if (locRulesRes.status === 'fulfilled' && Array.isArray(locRulesRes.value)) {
          setLocationRadiusRules(locRulesRes.value);
        }
      } catch (err) {
        console.error('Fetch rankings error:', err);
      }
    } catch (e) {
      console.error('Fetch admin data error:', e);
    }
  };

  const handleSavePromotions = async () => {
    setIsSavingOffers(true);
    setOffersSaveSuccess('');
    setOffersSaveError('');
    try {
      const res = await apiRequest('/api/admin/promotions', {
        method: 'PUT',
        body: JSON.stringify(promotions)
      });
      setOffersSaveSuccess(res.message || 'All promotional discounts & platform charges updated successfully! (অফার ও ডিসকাউন্ট সফলভাবে সেভ হয়েছে)');
      setTimeout(() => setOffersSaveSuccess(''), 5000);
      fetchAdminData();
    } catch (e: any) {
      setOffersSaveError(e.message || 'Failed to update offers');
    } finally {
      setIsSavingOffers(false);
    }
  };

  const handleCreateCustomerPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim()) return;
    setIsCreatingPromo(true);
    try {
      const res = await apiRequest('/api/coupons/admin', {
        method: 'POST',
        body: JSON.stringify({
          code: newPromoCode.trim().toUpperCase(),
          discount_type: 'percentage',
          discount_value: Number(newPromoValue) || 20,
          max_discount: Number(newPromoMaxDisc) || 100,
          min_order_amount: Number(newPromoMinSubtotal) || 149,
          description: newPromoDesc || `${newPromoCode.toUpperCase()} - ${newPromoValue}% OFF`,
          description_bn: newPromoDescBn || `${newPromoCode.toUpperCase()} - ${newPromoValue}% বিশেষ ছাড়`
        })
      });
      if (res.success) {
        setNewPromoCode('');
        setNewPromoDesc('');
        setNewPromoDescBn('');
        fetchAdminData();
        alert(res.message || 'Customer Promocode created!');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create customer promocode');
    } finally {
      setIsCreatingPromo(false);
    }
  };

  const handleToggleCustomerPromo = async (id: number) => {
    try {
      const res = await apiRequest(`/api/coupons/admin/${id}/toggle`, {
        method: 'PUT'
      });
      if (res.success) {
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleDeleteCustomerPromo = async (id: number) => {
    if (!confirm('Are you sure you want to delete this customer promocode?')) return;
    try {
      const res = await apiRequest(`/api/coupons/admin/${id}`, {
        method: 'DELETE'
      });
      if (res.success) {
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer promocode');
    }
  };

  // Sync Top 5 Rank Map when Area or Rankings change
  useEffect(() => {
    const rule = restaurantRankings.find(
      (r: any) => Number(r.service_area_id) === Number(selectedRankingAreaId)
    );
    const newMap: { [rank: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (rule && rule.rankings && Array.isArray(rule.rankings)) {
      rule.rankings.forEach((item: any) => {
        if (item.rank >= 1 && item.rank <= 5) {
          newMap[item.rank] = Number(item.restaurant_id) || 0;
        }
      });
    }
    setTopRanksMap(newMap);
  }, [selectedRankingAreaId, restaurantRankings]);

  const handleSelectRankSlot = (rank: number, restaurantId: number) => {
    setTopRanksMap((prev) => ({
      ...prev,
      [rank]: restaurantId
    }));
  };

  const handleSaveLocationRankings = async () => {
    setIsSavingRankings(true);
    setRankingSuccessMsg('');
    try {
      const rankingsList = [1, 2, 3, 4, 5]
        .map((rank) => ({
          rank,
          restaurant_id: topRanksMap[rank] || 0
        }))
        .filter((r) => r.restaurant_id > 0);

      const res = await apiRequest('/api/admin/restaurant-rankings', {
        method: 'POST',
        body: JSON.stringify({
          service_area_id: selectedRankingAreaId,
          rankings: rankingsList
        })
      });

      setRankingSuccessMsg(
        res.message || 'Location restaurant ranking saved successfully! (র‍্যাঙ্কিং ও পজিশন সেভ করা হয়েছে)'
      );
      setTimeout(() => setRankingSuccessMsg(''), 5000);
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to save rankings');
    } finally {
      setIsSavingRankings(false);
    }
  };

  const handleSavePlatformRates = async () => {
    setIsSavingRates(true);
    setRatesSaveSuccess('');
    try {
      await apiRequest('/api/admin/settings/rates', {
        method: 'PUT',
        body: JSON.stringify(platformSettings)
      });
      setRatesSaveSuccess('Rates & Commissions successfully updated! All new orders and live calculations will use these rates. (কমিশন ও প্রতি কিমি রেট আপডেট হয়েছে)');
      setTimeout(() => setRatesSaveSuccess(''), 5000);
      fetchAdminData();
    } catch (e: any) {
      alert(e.message || 'Failed to update rates');
    } finally {
      setIsSavingRates(false);
    }
  };

  const handleUpdateSingleRestaurantCommission = async () => {
    if (!editingRestCommission) return;
    setIsSavingRestComm(true);
    try {
      await apiRequest(`/api/admin/restaurants/${editingRestCommission.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ commission_rate: editingRestCommission.rate })
      });
      setEditingRestCommission(null);
      fetchAdminData();
    } catch (e: any) {
      alert(e.message || 'Failed to update restaurant commission');
    } finally {
      setIsSavingRestComm(false);
    }
  };

  const handleSettleEscrow = async (orderId: number, note?: string) => {
    try {
      await apiRequest(`/api/admin/escrow/${orderId}/settle`, {
        method: 'POST',
        body: JSON.stringify({ note: note || 'Instant release approved by Admin' })
      });
      setSettleModalOrder(null);
      fetchAdminData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSettleAllMatured = async () => {
    try {
      const res = await apiRequest('/api/admin/escrow/settle-all-matured', {
        method: 'POST'
      });
      alert(res.message);
      fetchAdminData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRefundEscrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalOrder) return;
    try {
      await apiRequest(`/api/admin/escrow/${refundModalOrder.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({
          reason: refundReason,
          amount: refundAmount > 0 ? refundAmount : refundModalOrder.grand_total
        })
      });
      setRefundModalOrder(null);
      fetchAdminData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDisputeEscrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeModalOrder) return;
    try {
      await apiRequest(`/api/admin/escrow/${disputeModalOrder.id}/dispute`, {
        method: 'POST',
        body: JSON.stringify({ reason: disputeReason })
      });
      setDisputeModalOrder(null);
      fetchAdminData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleCustomerCod = async (customerId: number, currentStatus: boolean | number) => {
    try {
      const newStatus = !currentStatus;
      await apiRequest(`/api/admin/customers/${customerId}/cod`, {
        method: 'PUT',
        body: JSON.stringify({ cod_enabled: newStatus })
      });
      fetchAdminData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleGlobalCod = async () => {
    try {
      const newStatus = !globalCodEnabled;
      await apiRequest('/api/admin/settings/cod', {
        method: 'PUT',
        body: JSON.stringify({ global_cod_enabled: newStatus })
      });
      setGlobalCodEnabled(newStatus);
      fetchAdminData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const getRemainingTimeText = (holdingUntilStr?: string, status?: string) => {
    if (status === 'settled') return 'Settled to Restaurant';
    if (status === 'refunded') return 'Refunded to Customer';
    if (status === 'disputed') return 'Payment Frozen / Dispute';
    if (!holdingUntilStr) return 'Matured (Eligible)';
    const remainingMs = new Date(holdingUntilStr).getTime() - Date.now();
    if (remainingMs <= 0) return '24h Matured (Ready to Release)';
    const hours = Math.floor(remainingMs / 3600000);
    const minutes = Math.floor((remainingMs % 3600000) / 60000);
    return `Auto-releases in ${hours}h ${minutes}m`;
  };


  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateRestStatus = async (restId: number, status: 'approved' | 'rejected') => {
    try {
      await apiRequest(`/api/admin/restaurants/${restId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      fetchAdminData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdatePartnerStatus = async (dpId: number, status: 'approved' | 'rejected') => {
    try {
      const res = await apiRequest(`/api/admin/delivery-partners/${dpId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      alert(
        status === 'approved'
          ? '✓ Delivery Partner approved successfully! Rider can now go online and deliver orders.'
          : 'Delivery Partner application rejected.'
      );
      fetchAdminData();
    } catch (e: any) {
      alert(e.message);
    }
  };


  const handleToggleRestaurantBlock = async (restId: number) => {
    try {
      const res = await apiRequest(`/api/admin/restaurants/${restId}/block`, {
        method: 'PUT'
      });
      alert(res.message);
      fetchAdminData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleTogglePartnerBlock = async (dpId: number) => {
    try {
      const res = await apiRequest(`/api/admin/delivery-partners/${dpId}/block`, {
        method: 'PUT'
      });
      alert(res.message);
      fetchAdminData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleCustomerBlock = async (customerId: number) => {
    try {
      const res = await apiRequest(`/api/admin/customers/${customerId}/block`, {
        method: 'PUT'
      });
      alert(res.message);
      fetchAdminData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleOpenSendMessage = (
    role: 'restaurant' | 'delivery' | 'customer',
    id: number,
    name: string
  ) => {
    setMessageModalData({ role, id, name });
    if (role === 'restaurant') {
      setMsgTitle('Important Notice from Administration');
      setMsgTitleBn('অ্যাডমিন থেকে জরুরি বিজ্ঞপ্তি');
      setMsgBody('Please review your menu items and ensure fast, hygienic order preparation.');
      setMsgBodyBn('অনুগ্রহ করে খাবারের মান ও সময়মতো খাবার প্রস্তুতের বিষয়ে বিশেষ নজর দিন।');
    } else if (role === 'delivery') {
      setMsgTitle('Dispatch Advisory for Delivery Partners');
      setMsgTitleBn('রাইডারদের জন্য ডিসপ্যাচ নির্দেশিকা');
      setMsgBody('Please drive safely with helmet and ensure prompt customer doorstep delivery.');
      setMsgBodyBn('দয়া করে সাবধানে ও হেলমেট পরে গাড়ি চালান এবং যথাসময়ে খাবার পৌঁছে দিন।');
    } else {
      setMsgTitle('Message from AharLocal Support');
      setMsgTitleBn('আহারলোকাল সাপোর্ট থেকে বার্তা');
      setMsgBody('Thank you for ordering with us. Please let us know if you need any assistance.');
      setMsgBodyBn('আমাদের সাথে থাকার জন্য ধন্যবাদ। কোনো সহযোগিতার প্রয়োজন হলে জানান।');
    }
    setMsgPriority('normal');
  };

  const handleSendMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageModalData || !msgBody) return;
    setIsSendingMsg(true);
    try {
      let endpoint = '';
      if (messageModalData.role === 'restaurant') {
        endpoint = `/api/admin/restaurants/${messageModalData.id}/message`;
      } else if (messageModalData.role === 'delivery') {
        endpoint = `/api/admin/delivery-partners/${messageModalData.id}/message`;
      } else {
        endpoint = `/api/admin/customers/${messageModalData.id}/message`;
      }

      const res = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          title: msgTitle,
          title_bn: msgTitleBn || msgTitle,
          message: msgBody,
          message_bn: msgBodyBn || msgBody,
          priority: msgPriority
        })
      });

      alert(res.message || 'Message sent successfully!');
      setMessageModalData(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSendingMsg(false);
    }
  };


  return (
    <div className="min-h-screen bg-stone-100 pb-20">
      {/* Admin Top Header - Note: Zero GPS calls in Admin mode */}
      <div className="bg-stone-900 text-white py-4 px-4 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center font-bold text-lg shadow-md">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight leading-none">
                  AharLocal Ops Command Center
                </h1>
                <span className="text-[10px] font-bold bg-purple-500/30 text-purple-300 border border-purple-400/30 px-2 py-0.5 rounded">
                  Admin (No GPS Access)
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Centralized management for restaurants, riders, orders & service zones
              </p>
            </div>
          </div>

          <div className="text-xs text-stone-400 font-mono">
            System Online • Kolkata Cluster
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-4 pt-2 border-t border-stone-800 overflow-x-auto">
          {[
            { id: 'overview', label: 'KPI Metrics' },
            { id: 'categories', label: `🍔 Food Categories (${categories.length}) (ক্যাটাগরি)` },
            { id: 'offers', label: '🏷️ Offers & Discounts (অফার ও ডিসকাউন্ট)' },
            { id: 'rates', label: '⚙️ Commissions & Rates (কমিশন ও রেট)' },
            { id: 'restaurants', label: `Restaurants (${restaurants.length})` },
            { id: 'partners', label: `Delivery Riders (${partners.length})` },
            { id: 'orders', label: `Orders Radar (${orders.length})` },
            { id: 'customers', label: `Customer (${customers.length})` },
            { id: 'ranking', label: '🏆 Nearby Restaurant Ranking (র‍্যাঙ্কিং ও পজিশন)' },
            { id: 'escrow', label: `💳 Payment Settlement (${escrowOrders.length}) (পেমেন্ট সেটেলমেন্ট)` },
            { id: 'geofence', label: `🗺️ Service Area Boundaries (${serviceAreas.length}) (সার্ভিস এরিয়া বাউন্ডারি)` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-stone-300 hover:bg-stone-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* TAB: FOOD CATEGORIES MANAGEMENT (ক্যাটাগরি ম্যানেজমেন্ট) */}
        {activeTab === 'categories' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Feedback Message Banner */}
            {categoryMsg && (
              <div
                className={`px-4 py-3 rounded-2xl flex items-center justify-between shadow-xs ${
                  categoryMsg.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                    : 'bg-red-50 border border-red-300 text-red-900'
                }`}
              >
                <div className="flex items-center gap-2.5 text-xs font-bold">
                  {categoryMsg.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  )}
                  <span>{categoryMsg.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCategoryMsg(null)}
                  className="text-stone-400 hover:text-stone-700 font-bold"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Header Hero */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-stone-900 p-5 sm:p-6 rounded-3xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider bg-white/20 text-purple-200 px-3 py-0.5 rounded-full">
                    Admin Exclusive Control
                  </span>
                  <span className="text-xs text-purple-200">
                    শুধুমাত্র অ্যাডমিন নতুন ক্যাটাগরি তৈরি, এডিট ও ডিলিট করতে পারবে
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Food Categories Management (খাবারের ক্যাটাগরি পরিচালনা)
                </h2>
                <p className="text-xs text-stone-300 max-w-2xl">
                  এখানে অ্যাড করা ক্যাটাগরিগুলো রেস্তোরাঁ তাদের মেনু যোগ করার সময় দেখতে পাবে এবং কাস্টমার অ্যাপে ক্যাটাগরি ফিল্টার হিসেবে প্রদর্শিত হবে।
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenCreateCategory}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add New Category (নতুন ক্যাটাগরি)</span>
                </button>
              </div>
            </div>

            {/* Stats Summary Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-stone-500 uppercase">Total Categories</span>
                  <div className="text-2xl font-black font-mono text-stone-900 mt-0.5">{categories.length}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-lg">
                  🍔
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-600 uppercase">Active Categories</span>
                  <div className="text-2xl font-black font-mono text-emerald-700 mt-0.5">
                    {categories.filter((c) => c.is_active !== 0).length}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg">
                  ✅
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-stone-500 uppercase">Inactive / Hidden</span>
                  <div className="text-2xl font-black font-mono text-stone-700 mt-0.5">
                    {categories.filter((c) => c.is_active === 0).length}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-lg">
                  🔒
                </div>
              </div>
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`bg-white rounded-3xl border shadow-2xs overflow-hidden flex flex-col justify-between transition-all hover:shadow-md ${
                    cat.is_active === 0 ? 'border-stone-200 bg-stone-50/70 opacity-75' : 'border-stone-200 hover:border-purple-300'
                  }`}
                >
                  <div className="relative h-36 w-full bg-stone-100 overflow-hidden">
                    <img
                      src={cat.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="w-8 h-8 rounded-xl bg-white/90 backdrop-blur-md shadow-xs flex items-center justify-center text-lg">
                        {cat.icon || '🍽️'}
                      </span>
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full shadow-xs ${
                          cat.is_active !== 0
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-700 text-stone-200'
                        }`}
                      >
                        {cat.is_active !== 0 ? 'ACTIVE (সক্রিয়)' : 'INACTIVE (নিষ্ক্রিয়)'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-stone-900 text-sm sm:text-base truncate">
                          {cat.name}
                        </h4>
                      </div>
                      <p className="text-xs text-stone-500 font-bold font-bengali mt-0.5">
                        {cat.name_bn || cat.name}
                      </p>
                      {cat.description && (
                        <p className="text-[11px] text-stone-500 line-clamp-2 mt-1 leading-snug">
                          {cat.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleCategoryActive(cat)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                          cat.is_active !== 0
                            ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                        title="Toggle Active/Inactive"
                      >
                        {cat.is_active !== 0 ? 'Hide' : 'Show'}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCategory(cat)}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-purple-200 transition-all flex items-center gap-1 cursor-pointer"
                          title="Edit Category"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingCategory(cat)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold p-1.5 rounded-xl border border-red-200 transition-all cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* TAB: OFFERS & PLATFORM CHARGE DISCOUNTS (অফার ও ডিসকাউন্ট) */}
        {activeTab === 'offers' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Success / Error Notification */}
            {offersSaveSuccess && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5 text-xs font-bold">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{offersSaveSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOffersSaveSuccess('')}
                  className="text-stone-400 hover:text-stone-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {offersSaveError && (
              <div className="bg-red-50 border border-red-300 text-red-900 px-4 py-3 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5 text-xs font-bold">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <span>{offersSaveError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOffersSaveError('')}
                  className="text-stone-400 hover:text-stone-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Header & Quick Action */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-purple-700" />
                    Special Campaign & Discounts Engine
                  </span>
                  <span className="text-xs text-stone-500 font-medium">
                    অফার ও প্ল্যাটফর্ম চার্জ ডিসকাউন্ট ব্যবস্থাপনা
                  </span>
                </div>
                <h3 className="text-lg font-black text-stone-900">
                  Offers & Platform Charge Discounts (অফার ও ডিসকাউন্ট সেন্টার)
                </h3>
                <p className="text-xs text-stone-500 max-w-3xl leading-relaxed">
                  Configure special promotional discounts on <strong>Restaurant Commission</strong>, <strong>Delivery Partner Platform Fee & Bonuses</strong>, and <strong>Customer Delivery Charges (Free Delivery)</strong>. Changes apply instantly across order calculations.
                </p>
              </div>

              <div className="flex items-center gap-3 self-start md:self-center shrink-0">
                <button
                  type="button"
                  onClick={handleSavePromotions}
                  disabled={isSavingOffers}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold text-xs px-5 py-2.5 rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSavingOffers ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span>{isSavingOffers ? 'Saving Offers...' : 'Save All Offers (অফার সেভ করুন)'}</span>
                </button>
              </div>
            </div>

            {/* Highlights Summary Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 1. Restaurant Discount Status */}
              <div className={`p-4 rounded-3xl border transition-all ${
                promotions.restaurant_discount_enabled
                  ? 'bg-purple-50/60 border-purple-200 shadow-2xs'
                  : 'bg-stone-50 border-stone-200 opacity-70'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                      promotions.restaurant_discount_enabled ? 'bg-purple-600 text-white' : 'bg-stone-300 text-stone-600'
                    }`}>
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-stone-700">Restaurant Platform Fee</div>
                      <div className="text-xs font-black text-purple-900">রেস্তোরাঁ প্ল্যাটফর্ম চার্জে ছাড়</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    promotions.restaurant_discount_enabled
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-stone-200 text-stone-600'
                  }`}>
                    {promotions.restaurant_discount_enabled ? 'Active ✓' : 'Disabled'}
                  </span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-purple-200/50 flex justify-between items-center text-xs">
                  <span className="text-stone-500">Discount Mode:</span>
                  <span className="font-mono font-bold text-purple-800">
                    {promotions.restaurant_discount_type === 'percent_off_commission'
                      ? `${promotions.restaurant_discount_value}% Off Commission`
                      : `Flat ${promotions.restaurant_discount_value}% Commission`}
                  </span>
                </div>
              </div>

              {/* 2. Rider Discount Status */}
              <div className={`p-4 rounded-3xl border transition-all ${
                promotions.partner_discount_enabled
                  ? 'bg-emerald-50/60 border-emerald-200 shadow-2xs'
                  : 'bg-stone-50 border-stone-200 opacity-70'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                      promotions.partner_discount_enabled ? 'bg-emerald-600 text-white' : 'bg-stone-300 text-stone-600'
                    }`}>
                      <Bike className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-stone-700">Rider Platform Charge</div>
                      <div className="text-xs font-black text-emerald-900">রাইডার প্ল্যাটফর্ম ফি ছাড় ও বোনাস</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    promotions.partner_discount_enabled
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-stone-200 text-stone-600'
                  }`}>
                    {promotions.partner_discount_enabled ? 'Active ✓' : 'Disabled'}
                  </span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-emerald-200/50 flex justify-between items-center text-xs">
                  <span className="text-stone-500">Incentive:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {promotions.partner_discount_type === 'zero_fee'
                      ? '0% Fee (100% Payout)'
                      : `${promotions.partner_discount_value}% Off Fee`}
                    {promotions.partner_bonus_per_order > 0 ? ` + ₹${promotions.partner_bonus_per_order} Bonus` : ''}
                  </span>
                </div>
              </div>

              {/* 3. Customer Delivery Discount Status */}
              <div className={`p-4 rounded-3xl border transition-all ${
                promotions.customer_delivery_discount_enabled
                  ? 'bg-amber-50/60 border-amber-200 shadow-2xs'
                  : 'bg-stone-50 border-stone-200 opacity-70'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                      promotions.customer_delivery_discount_enabled ? 'bg-amber-500 text-white' : 'bg-stone-300 text-stone-600'
                    }`}>
                      <Gift className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-stone-700">Customer Delivery Charge</div>
                      <div className="text-xs font-black text-amber-900">কাস্টমার ফ্রি ডেলিভারি / ছাড়</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    promotions.customer_delivery_discount_enabled
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-stone-200 text-stone-600'
                  }`}>
                    {promotions.customer_delivery_discount_enabled ? 'Active ✓' : 'Disabled'}
                  </span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-amber-200/50 flex justify-between items-center text-xs">
                  <span className="text-stone-500">Free Delivery:</span>
                  <span className="font-mono font-bold text-amber-800">
                    {promotions.customer_delivery_discount_type === 'free_delivery_above'
                      ? `Orders ≥ ₹${promotions.customer_min_order_for_free_delivery}`
                      : promotions.customer_delivery_discount_type === 'flat_discount'
                      ? `Flat ₹${promotions.customer_flat_delivery_discount} Off`
                      : `${promotions.customer_delivery_discount_value}% Off Fee`}
                  </span>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* OFFER SECTION 1: RESTAURANT PLATFORM CHARGE DISCOUNT     */}
            {/* ======================================================== */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-2xs shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-black text-stone-900">
                        1. Restaurant Platform Charge Discount (রেস্তোরাঁর প্ল্যাটফর্ম চার্জে ছাড়)
                      </h4>
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                        Standard Commission: {platformSettings.restaurant_commission_percent}%
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Reduce platform commission rates charged to restaurants during promotional festivals or vendor growth campaigns.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-stone-700 cursor-pointer flex items-center gap-2 bg-stone-50 px-3.5 py-2 rounded-2xl border border-stone-200">
                    <input
                      type="checkbox"
                      checked={Boolean(promotions.restaurant_discount_enabled)}
                      onChange={(e) =>
                        setPromotions({
                          ...promotions,
                          restaurant_discount_enabled: e.target.checked ? 1 : 0
                        })
                      }
                      className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                    />
                    <span className="text-stone-900 font-extrabold">
                      {promotions.restaurant_discount_enabled ? 'Discount Active (সক্রিয়)' : 'Discount Disabled (বন্ধ)'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Discount Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Mode & Value */}
                <div className="space-y-4">
                  {/* Mode Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 block">
                      Discount Calculation Mode (ডিসকাউন্ট পদ্ধতি):
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setPromotions({
                            ...promotions,
                            restaurant_discount_type: 'percent_off_commission'
                          })
                        }
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          promotions.restaurant_discount_type === 'percent_off_commission'
                            ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-2xs font-extrabold'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Percent className="w-3.5 h-3.5 text-purple-600" />
                          <span>% Off Commission</span>
                        </div>
                        <div className="text-[10px] text-stone-500 font-normal">
                          e.g. 50% discount on {platformSettings.restaurant_commission_percent}% = {(platformSettings.restaurant_commission_percent * 0.5).toFixed(1)}% final commission
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPromotions({
                            ...promotions,
                            restaurant_discount_type: 'flat_commission_rate'
                          })
                        }
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          promotions.restaurant_discount_type === 'flat_commission_rate'
                            ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-2xs font-extrabold'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <BadgePercent className="w-3.5 h-3.5 text-purple-600" />
                          <span>Flat Promo Rate</span>
                        </div>
                        <div className="text-[10px] text-stone-500 font-normal">
                          e.g. Flat promotional 5% commission on all food sales
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Value Slider */}
                  <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-purple-950">
                        {promotions.restaurant_discount_type === 'percent_off_commission'
                          ? 'Commission Discount Percentage (% ছাড়):'
                          : 'Promotional Flat Commission Rate (প্রমোশনাল কমিশন রেট):'}
                      </span>
                      <span className="text-base font-black font-mono text-purple-700 bg-white px-3 py-1 rounded-xl border border-purple-200 shadow-2xs">
                        {promotions.restaurant_discount_value}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max={promotions.restaurant_discount_type === 'percent_off_commission' ? 100 : 25}
                      step={promotions.restaurant_discount_type === 'percent_off_commission' ? 5 : 0.5}
                      value={promotions.restaurant_discount_value}
                      onChange={(e) =>
                        setPromotions({
                          ...promotions,
                          restaurant_discount_value: Number(e.target.value)
                        })
                      }
                      className="w-full accent-purple-600 cursor-pointer"
                    />

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-stone-500 font-bold">Quick Presets:</span>
                      {(promotions.restaurant_discount_type === 'percent_off_commission'
                        ? [25, 30, 50, 75, 100]
                        : [0, 3, 5, 8, 10]
                      ).map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() =>
                            setPromotions({
                              ...promotions,
                              restaurant_discount_value: val
                            })
                          }
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                            promotions.restaurant_discount_value === val
                              ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                              : 'bg-white hover:bg-purple-50 text-stone-700 border-stone-200'
                          }`}
                        >
                          {val === 0 && promotions.restaurant_discount_type === 'flat_commission_rate'
                            ? '0% (Free)'
                            : val === 100 && promotions.restaurant_discount_type === 'percent_off_commission'
                            ? '100% (Free Platform)'
                            : `${val}%`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Campaign Title Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">
                        Offer Title (English):
                      </label>
                      <input
                        type="text"
                        value={promotions.restaurant_discount_title || ''}
                        onChange={(e) =>
                          setPromotions({
                            ...promotions,
                            restaurant_discount_title: e.target.value
                          })
                        }
                        placeholder="e.g. Festival Offer: 50% Off Platform Fee"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-purple-600"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-stone-700 block mb-1">
                        Offer Title (বাংলা):
                      </label>
                      <input
                        type="text"
                        value={promotions.restaurant_discount_title_bn || ''}
                        onChange={(e) =>
                          setPromotions({
                            ...promotions,
                            restaurant_discount_title_bn: e.target.value
                          })
                        }
                        placeholder="রেস্তোরাঁ উৎসব অফার: প্ল্যাটফর্ম ফি-তে ৫০% বিশেষ ছাড়!"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-purple-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Simulator */}
                <div className="bg-purple-950 text-white rounded-2xl p-5 border border-purple-800/40 space-y-4 shadow-md flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-purple-800/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-black uppercase text-purple-200">
                          Live Restaurant Payout Simulator
                        </span>
                      </div>
                      <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-400/30 px-2 py-0.5 rounded">
                        লাইভ সিমুলেটর
                      </span>
                    </div>

                    {/* Food Subtotal Slider */}
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold">
                        <span className="text-stone-300">Simulated Food Order Subtotal:</span>
                        <span className="font-mono text-purple-300">₹{testRestSubtotal}</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="3000"
                        step="50"
                        value={testRestSubtotal}
                        onChange={(e) => setTestRestSubtotal(Number(e.target.value))}
                        className="w-full accent-purple-400 cursor-pointer"
                      />
                    </div>

                    {/* Calculation Output */}
                    {(() => {
                      const standardCommRate = platformSettings.restaurant_commission_percent;
                      let finalCommRate = standardCommRate;
                      if (promotions.restaurant_discount_enabled) {
                        if (promotions.restaurant_discount_type === 'percent_off_commission') {
                          finalCommRate = standardCommRate * ((100 - promotions.restaurant_discount_value) / 100);
                        } else {
                          finalCommRate = promotions.restaurant_discount_value;
                        }
                      }
                      const standardFee = Math.round(testRestSubtotal * (standardCommRate / 100));
                      const discountedFee = Math.round(testRestSubtotal * (finalCommRate / 100));
                      const restaurantReceives = testRestSubtotal - discountedFee;
                      const restaurantSaves = Math.max(0, standardFee - discountedFee);

                      return (
                        <div className="space-y-2 text-xs pt-1">
                          <div className="bg-white/10 rounded-xl p-2.5 flex justify-between items-center">
                            <span className="text-stone-300">Standard Platform Fee ({standardCommRate}%):</span>
                            <span className="font-mono line-through text-stone-400">₹{standardFee}</span>
                          </div>

                          <div className="bg-purple-900/50 rounded-xl p-2.5 flex justify-between items-center border border-purple-700/50">
                            <span className="text-purple-200 font-bold">
                              Discounted Fee ({finalCommRate.toFixed(1)}%):
                            </span>
                            <span className="font-mono text-base font-black text-amber-300">₹{discountedFee}</span>
                          </div>

                          <div className="bg-emerald-900/40 rounded-xl p-3 flex justify-between items-center border border-emerald-700/50">
                            <div>
                              <div className="text-[11px] text-emerald-300 font-bold">Restaurant Payout:</div>
                              <div className="text-[10px] text-stone-300">রেস্তোরাঁ ওয়ালেটে জমা হবে</div>
                            </div>
                            <span className="font-mono text-xl font-black text-emerald-300">₹{restaurantReceives}</span>
                          </div>

                          {promotions.restaurant_discount_enabled && restaurantSaves > 0 && (
                            <div className="text-center text-[11px] font-bold text-amber-300 bg-amber-500/20 py-1.5 rounded-lg border border-amber-400/30">
                              🎉 Restaurant saves ₹{restaurantSaves} extra per order!
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* OFFER SECTION 2: DELIVERY PARTNER PLATFORM CHARGE & BONUS */}
            {/* ======================================================== */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-2xs shrink-0">
                    <Bike className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-black text-stone-900">
                        2. Delivery Partner Platform Charge Discount & Bonuses (ডেলিভারি পার্টনার প্ল্যাটফর্ম চার্জে ছাড় ও ইনসেনটিভ)
                      </h4>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                        Standard Fee: {platformSettings.delivery_partner_commission_percent}%
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Waive rider platform fee (0% deduction) or provide cash bonuses to encourage rider availability and fast delivery.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-stone-700 cursor-pointer flex items-center gap-2 bg-stone-50 px-3.5 py-2 rounded-2xl border border-stone-200">
                    <input
                      type="checkbox"
                      checked={Boolean(promotions.partner_discount_enabled)}
                      onChange={(e) =>
                        setPromotions({
                          ...promotions,
                          partner_discount_enabled: e.target.checked ? 1 : 0
                        })
                      }
                      className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                    />
                    <span className="text-stone-900 font-extrabold">
                      {promotions.partner_discount_enabled ? 'Incentive Active (সক্রিয়)' : 'Incentive Disabled (বন্ধ)'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Delivery Partner Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Mode, Bonus & Inputs */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 block">
                      Rider Platform Fee Mode (রাইডার প্ল্যাটফর্ম ফি কর্তন পদ্ধতি):
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setPromotions({
                            ...promotions,
                            partner_discount_type: 'zero_fee',
                            partner_discount_value: 100
                          })
                        }
                        className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                          promotions.partner_discount_type === 'zero_fee'
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-2xs font-extrabold'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <Zap className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                        <div className="font-extrabold">0% Platform Fee</div>
                        <div className="text-[10px] text-stone-500">100% Payout</div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPromotions({
                            ...promotions,
                            partner_discount_type: 'percent_off_fee'
                          })
                        }
                        className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                          promotions.partner_discount_type === 'percent_off_fee'
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-2xs font-extrabold'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <Percent className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                        <div className="font-extrabold">% Off Fee</div>
                        <div className="text-[10px] text-stone-500">Reduced fee</div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPromotions({
                            ...promotions,
                            partner_discount_type: 'flat_fee_rate'
                          })
                        }
                        className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                          promotions.partner_discount_type === 'flat_fee_rate'
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-2xs font-extrabold'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <BadgePercent className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                        <div className="font-extrabold">Flat Fee</div>
                        <div className="text-[10px] text-stone-500">Fixed rate</div>
                      </button>
                    </div>
                  </div>

                  {/* Cash Bonus per Order */}
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-emerald-950">
                        Extra Cash Bonus Per Order (প্রতি ডেলিভারিতে অতিরিক্ত বোনাস):
                      </span>
                      <span className="text-base font-black font-mono text-emerald-700 bg-white px-3 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                        +₹{promotions.partner_bonus_per_order || 0}
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={promotions.partner_bonus_per_order || 0}
                      onChange={(e) =>
                        setPromotions({
                          ...promotions,
                          partner_bonus_per_order: Number(e.target.value)
                        })
                      }
                      className="w-full accent-emerald-600 cursor-pointer"
                    />

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-stone-500 font-bold">Bonus Presets:</span>
                      {[0, 5, 10, 15, 20].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() =>
                            setPromotions({
                              ...promotions,
                              partner_bonus_per_order: b
                            })
                          }
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                            (promotions.partner_bonus_per_order || 0) === b
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white hover:bg-emerald-50 text-stone-700 border-stone-200'
                          }`}
                        >
                          {b === 0 ? 'No Bonus (₹0)' : `+₹${b} Bonus`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Campaign Title Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">
                        Rider Announcement (English):
                      </label>
                      <input
                        type="text"
                        value={promotions.partner_discount_title || ''}
                        onChange={(e) =>
                          setPromotions({
                            ...promotions,
                            partner_discount_title: e.target.value
                          })
                        }
                        placeholder="e.g. Rider Super Bonus: 0% Fee + ₹5 Bonus"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-stone-700 block mb-1">
                        Rider Announcement (বাংলা):
                      </label>
                      <input
                        type="text"
                        value={promotions.partner_discount_title_bn || ''}
                        onChange={(e) =>
                          setPromotions({
                            ...promotions,
                            partner_discount_title_bn: e.target.value
                          })
                        }
                        placeholder="রাইডার ধামাকা বোনাস: ০% প্ল্যাটফর্ম কর্তন ও অতিরিক্ত ইনসেনটিভ"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Rider Live Simulator */}
                <div className="bg-stone-900 text-white rounded-2xl p-5 border border-emerald-800/40 space-y-4 shadow-md flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Bike className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-black uppercase text-emerald-300">
                          Live Delivery Partner Payout Simulator
                        </span>
                      </div>
                      <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded">
                        রাইডার আয় সিমুলেটর
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold">
                        <span className="text-stone-300">Customer Delivery Fee:</span>
                        <span className="font-mono text-emerald-300">₹{testRiderDeliveryFare}</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="150"
                        step="5"
                        value={testRiderDeliveryFare}
                        onChange={(e) => setTestRiderDeliveryFare(Number(e.target.value))}
                        className="w-full accent-emerald-400 cursor-pointer"
                      />
                    </div>

                    {/* Calculation Output */}
                    {(() => {
                      const standardDpComm = platformSettings.delivery_partner_commission_percent;
                      let finalDpComm = standardDpComm;
                      let bonus = 0;

                      if (promotions.partner_discount_enabled) {
                        if (promotions.partner_discount_type === 'zero_fee') {
                          finalDpComm = 0;
                        } else if (promotions.partner_discount_type === 'percent_off_fee') {
                          finalDpComm = standardDpComm * ((100 - (promotions.partner_discount_value || 50)) / 100);
                        } else {
                          finalDpComm = promotions.partner_discount_value || 5;
                        }
                        bonus = promotions.partner_bonus_per_order || 0;
                      }

                      const standardPayout = Math.max(
                        platformSettings.min_delivery_fare,
                        Math.round(testRiderDeliveryFare * ((100 - standardDpComm) / 100))
                      );
                      const promoBasePayout = Math.max(
                        platformSettings.min_delivery_fare,
                        Math.round(testRiderDeliveryFare * ((100 - finalDpComm) / 100))
                      );
                      const totalPromoEarnings = promoBasePayout + bonus;
                      const extraEarnings = Math.max(0, totalPromoEarnings - standardPayout);

                      return (
                        <div className="space-y-2 text-xs pt-1">
                          <div className="bg-white/10 rounded-xl p-2.5 flex justify-between items-center">
                            <span className="text-stone-300">Standard Rider Payout ({100 - standardDpComm}%):</span>
                            <span className="font-mono line-through text-stone-400">₹{standardPayout}</span>
                          </div>

                          <div className="bg-emerald-900/50 rounded-xl p-2.5 flex justify-between items-center border border-emerald-700/50">
                            <span className="text-emerald-200 font-bold">
                              Promo Base Payout ({100 - finalDpComm}%):
                            </span>
                            <span className="font-mono text-emerald-300">₹{promoBasePayout}</span>
                          </div>

                          {bonus > 0 && (
                            <div className="bg-amber-900/40 rounded-xl p-2.5 flex justify-between items-center border border-amber-700/50">
                              <span className="text-amber-200 font-bold">+ Cash Incentive Bonus:</span>
                              <span className="font-mono font-black text-amber-300">+₹{bonus}</span>
                            </div>
                          )}

                          <div className="bg-emerald-950 rounded-xl p-3 flex justify-between items-center border border-emerald-500/60 shadow-xs">
                            <div>
                              <div className="text-[11px] text-emerald-300 font-bold">Total Rider Earnings:</div>
                              <div className="text-[10px] text-stone-400">প্রতি অর্ডারে রাইডার পাবে</div>
                            </div>
                            <span className="font-mono text-xl font-black text-emerald-300">₹{totalPromoEarnings}</span>
                          </div>

                          {extraEarnings > 0 && (
                            <div className="text-center text-[11px] font-bold text-emerald-300 bg-emerald-500/20 py-1.5 rounded-lg border border-emerald-400/30">
                              🚀 Rider earns +₹{extraEarnings} extra per delivery!
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* ======================================================== */}
            {/* OFFER SECTION 3: CUSTOMER ORDER VALUE DISCOUNT & PROMOCODES */}
            {/* ======================================================== */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shadow-2xs shrink-0">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-black text-stone-900">
                        3. Customer Order Value Percentage Discount & Promocodes (গ্রাহকের অর্ডার মূল্যে ডিসকাউন্ট ও কুপন)
                      </h4>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                        Exclusive for Customers Only
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Set percentage discounts on customer food order subtotal and issue promo codes specifically for customer orders.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-stone-700 cursor-pointer flex items-center gap-2 bg-stone-50 px-3.5 py-2 rounded-2xl border border-stone-200">
                    <input
                      type="checkbox"
                      checked={Boolean(promotions.customer_delivery_discount_enabled)}
                      onChange={(e) =>
                        setPromotions({
                          ...promotions,
                          customer_delivery_discount_enabled: e.target.checked ? 1 : 0
                        })
                      }
                      className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                    />
                    <span className="text-stone-900 font-extrabold">
                      {promotions.customer_delivery_discount_enabled ? 'Customer Offer Active (সক্রিয়)' : 'Offer Disabled (বন্ধ)'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Order Value Discount Percentage Controls */}
              <div className="bg-amber-50/50 p-5 rounded-3xl border border-amber-200 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h5 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                      <Percent className="w-4 h-4 text-amber-600" />
                      <span>Order Value Percentage Discount (অর্ডার মূল্যের উপর পার্সেন্টেজ অফার)</span>
                    </h5>
                    <p className="text-xs text-stone-500">
                      গ্রাহক যে টাকার খাবার অর্ডার করবেন তার উপর নির্ধারিত % হারে ডিসকাউন্ট পাবেন।
                    </p>
                  </div>

                  <span className="text-base font-black font-mono text-amber-900 bg-white px-3 py-1 rounded-xl border border-amber-300 shadow-2xs">
                    {promotions.customer_delivery_discount_value || 15}% OFF
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-amber-950">
                    <span>Discount Percentage Rate (% ছাড়ের পরিমাণ):</span>
                    <span>{promotions.customer_delivery_discount_value || 15}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={promotions.customer_delivery_discount_value || 15}
                    onChange={(e) =>
                      setPromotions({
                        ...promotions,
                        customer_delivery_discount_value: Number(e.target.value)
                      })
                    }
                    className="w-full accent-amber-600 cursor-pointer"
                  />

                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-stone-500 font-bold">Presets:</span>
                    {[10, 15, 20, 25, 30, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() =>
                          setPromotions({
                            ...promotions,
                            customer_delivery_discount_value: pct
                          })
                        }
                        className={`text-xs px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                          (promotions.customer_delivery_discount_value || 15) === pct
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                            : 'bg-white hover:bg-amber-50 text-stone-700 border-stone-200'
                        }`}
                      >
                        {pct}% OFF
                      </button>
                    ))}
                  </div>
                </div>

                {/* Min Subtotal & Max Cap */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">
                      Minimum Order Value for Discount (সর্বনিম্ন অর্ডার মূল্য):
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-400">₹</span>
                      <input
                        type="number"
                        value={promotions.customer_min_order_for_free_delivery || 149}
                        onChange={(e) =>
                          setPromotions({
                            ...promotions,
                            customer_min_order_for_free_delivery: Number(e.target.value)
                          })
                        }
                        className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 font-mono font-bold text-stone-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">
                      Max Discount Cap (সর্বোচ্চ কত টাকা পর্যন্ত ছাড়):
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-400">₹</span>
                      <input
                        type="number"
                        value={promotions.customer_flat_delivery_discount || 100}
                        onChange={(e) =>
                          setPromotions({
                            ...promotions,
                            customer_flat_delivery_discount: Number(e.target.value)
                          })
                        }
                        className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 font-mono font-bold text-stone-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CUSTOMER PROMOCODE CREATION & MANAGEMENT (কাস্টমারদের জন্য প্রোমোকোড) */}
              <div className="bg-stone-50 p-5 rounded-3xl border border-stone-200 space-y-4">
                <div className="border-b border-stone-200 pb-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h5 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-purple-600" />
                      <span>Customer Promocodes Management (শুধুমাত্র কাস্টমারদের প্রোমোকোড তৈরি)</span>
                    </h5>
                    <p className="text-xs text-stone-500 mt-0.5">
                      এখানে তৈরি করা প্রোমোকোড কাস্টমাররা কার্টে বসিয়ে বিশেষ পার্সেন্টেজ বা ফ্ল্যাট ক্যাশব্যাক ছাড় পাবে।
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-purple-100 text-purple-800">
                    {adminCoupons.length} Active Promocodes
                  </span>
                </div>

                {/* Create Promocode Form */}
                <form onSubmit={handleCreateCustomerPromo} className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3">
                  <div className="text-xs font-bold text-stone-800">
                    Create New Customer Promocode (নতুন কাস্টমার প্রোমোকোড দিন):
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Code (যেমন: WELCOME20)</label>
                      <input
                        type="text"
                        required
                        value={newPromoCode}
                        onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                        placeholder="e.g. WELCOME20"
                        className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 font-mono font-black text-stone-900 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Discount (% ছাড়)</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          required
                          value={newPromoValue}
                          onChange={(e) => setNewPromoValue(e.target.value)}
                          placeholder="20"
                          className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 font-mono font-bold text-stone-900"
                        />
                        <span className="font-bold text-stone-500">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Max Discount (সর্বোচ্চ ₹)</label>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-stone-400">₹</span>
                        <input
                          type="number"
                          required
                          value={newPromoMaxDisc}
                          onChange={(e) => setNewPromoMaxDisc(e.target.value)}
                          placeholder="100"
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
                          required
                          value={newPromoMinSubtotal}
                          onChange={(e) => setNewPromoMinSubtotal(e.target.value)}
                          placeholder="149"
                          className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 font-mono font-bold text-stone-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <input
                      type="text"
                      value={newPromoDesc}
                      onChange={(e) => setNewPromoDesc(e.target.value)}
                      placeholder="English Promo Description (e.g. 20% OFF on all food orders)"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5"
                    />
                    <input
                      type="text"
                      value={newPromoDescBn}
                      onChange={(e) => setNewPromoDescBn(e.target.value)}
                      placeholder="বাংলা বিবরণ (যেমন: ২০% ছাড় সমস্ত অর্ডারে)"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isCreatingPromo}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs px-5 py-2 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isCreatingPromo ? 'Creating...' : '+ Create Customer Promocode (প্রোমোকোড যুক্ত করুন)'}</span>
                    </button>
                  </div>
                </form>

                {/* Table of Active Customer Promocodes */}
                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-100 text-stone-600 font-bold uppercase text-[10px] border-b border-stone-200">
                        <th className="p-3">Code</th>
                        <th className="p-3">Discount Rate</th>
                        <th className="p-3">Max Cap</th>
                        <th className="p-3">Min Subtotal</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {adminCoupons.map((coupon) => (
                        <tr key={coupon.id || coupon.code} className="hover:bg-stone-50 transition-colors">
                          <td className="p-3 font-mono font-black text-purple-900">
                            {coupon.code}
                          </td>
                          <td className="p-3 font-mono font-bold text-stone-800">
                            {coupon.discount_type === 'percentage'
                              ? `${coupon.discount_value}% OFF`
                              : `Flat ₹${coupon.discount_value} OFF`}
                          </td>
                          <td className="p-3 font-mono text-stone-700">₹{coupon.max_discount || 100}</td>
                          <td className="p-3 font-mono text-stone-700">₹{coupon.min_order_amount || 0}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                coupon.is_active !== 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-stone-200 text-stone-600'
                              }`}
                            >
                              {coupon.is_active !== 0 ? 'Active ✓' : 'Disabled'}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleToggleCustomerPromo(coupon.id)}
                              className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer"
                            >
                              {coupon.is_active !== 0 ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomerPromo(coupon.id)}
                              className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Bottom Floating Save Action Bar */}
            <div className="bg-stone-900 text-white rounded-3xl p-5 border border-purple-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Save & Synchronize All Campaign Offers
                </h4>
                <p className="text-xs text-stone-400">
                  Updates restaurant platform fees, rider incentive payouts, and customer checkout delivery calculations instantly across the app.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSavePromotions}
                disabled={isSavingOffers}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-xs px-6 py-3 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                {isSavingOffers ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{isSavingOffers ? 'Applying Offers...' : 'Apply & Save Offers (অফার চালু করুন)'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: NEARBY RESTAURANT DISPLAY RANKING (রেস্তোরাঁ অবস্থান ও র‍্যাঙ্কিং) */}
        {activeTab === 'ranking' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Feedback Message */}
            {rankingSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5 text-xs font-bold">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{rankingSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRankingSuccessMsg('')}
                  className="text-stone-400 hover:text-stone-700 font-bold"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Header Hero */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-stone-900 p-5 sm:p-6 rounded-3xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider bg-amber-400 text-purple-950 px-3 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Location Display Control</span>
                  </span>
                  <span className="text-xs text-purple-200">
                    কাছাকাছি রেস্তোরাঁ সেকশনে ১ থেকে ৫ পজিশন নিয়ন্ত্রণ
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Nearby Restaurant Ranking & Display Order (রেস্তোরাঁ র‍্যাঙ্কিং ও অবস্থান)
                </h2>
                <p className="text-xs text-stone-300 max-w-2xl">
                  কাস্টমার অ্যাপের Nearby Restaurants সেকশনে কোন রেস্তোরাঁ ১, ২, ৩, ৪ ও ৫ নম্বরে দেখাবে তা কাস্টমারের লোকেশন রেডিয়াস বা এরিয়া অনুযায়ী সেট করুন। বাকি সব রেস্তোরাঁ এর পর ডিফল্ট অর্ডারে দেখাবে।
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveLocationRankings}
                  disabled={isSavingRankings}
                  className="bg-amber-500 hover:bg-amber-400 text-purple-950 font-black text-xs px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingRankings ? 'Saving Rankings...' : 'Save Rankings (সেভ করুন)'}</span>
                </button>
              </div>
            </div>

            {/* SPECIFIC LOCATION RADIUS RANKING RULES (পয়েন্ট ও রেডিয়াস ভিত্তিক র‍্যাঙ্কিং) */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-purple-100 text-purple-900 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                      Map Radius Ranking
                    </span>
                    <span className="text-xs text-stone-500 font-bold">
                      ({locationRadiusRules.length} Point Rules Registered)
                    </span>
                  </div>
                  <h3 className="font-extrabold text-stone-900 text-base mt-1 flex items-center gap-2">
                    <Crosshair className="w-5 h-5 text-purple-600" />
                    <span>Location Radius-wise Top 5 Restaurant Rankings (পয়েন্ট ও রেডিয়াস অনুযায়ী র‍্যাঙ্কিং)</span>
                  </h3>
                  <p className="text-xs text-stone-500 max-w-2xl mt-0.5 leading-relaxed">
                    ম্যাপে নির্দিষ্ট পয়েন্ট নির্বাচন করে তার নির্দিষ্ট কিমি (Radius KM) রেডিয়াসের ভেতরের কাস্টমারদের জন্য কাস্টম ১ম থেকে ৫ম র‍্যাঙ্কিং সেট করুন। নতুন রুল যোগ করতে বা মুছে ফেলতে নিচের বাটন ব্যবহার করুন।
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleStartCreateRadiusRule}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Create Location Radius Rule (নতুন পয়েন্ট ও রেডিয়াস র‍্যাঙ্কিং)</span>
                </button>
              </div>

              {/* Interactive Radar Overview Map showing ALL Pinned Location Rules */}
              {locationRadiusRules.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                    <span className="flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-purple-600" />
                      <span>Live Service Boundary Overview Map ({locationRadiusRules.length} Location Points Plotted):</span>
                    </span>
                    <span className="text-stone-500 font-normal">
                      (Click any purple pin on map to edit its Top 5 restaurant ranking)
                    </span>
                  </div>

                  <div className="h-64 md:h-72 w-full rounded-2xl overflow-hidden border border-stone-200 relative bg-stone-100 shadow-inner">
                    <Map
                      defaultCenter={{ lat: Number(locationRadiusRules[0]?.lat || 22.5400), lng: Number(locationRadiusRules[0]?.lng || 88.3600) }}
                      defaultZoom={11}
                      mapId="DEMO_MAP_ID"
                      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                      className="w-full h-full"
                    >
                      {/* Serviceable Geofence Polygons */}
                      {serviceAreas.map((sa) => (
                        <MapPolygonOverlay
                          key={`overview-sa-${sa.id}`}
                          paths={sa.polygon}
                          strokeColor="#059669"
                          fillColor="#10b981"
                        />
                      ))}

                      {/* Render Radius Circles for Active Rules */}
                      {locationRadiusRules.map((rule) => rule.is_active ? (
                        <MapCircleOverlay
                          key={`overview-circle-${rule.id}`}
                          center={{ lat: Number(rule.lat), lng: Number(rule.lng) }}
                          radiusMeters={Number(rule.radius_km || 3.0) * 1000}
                          strokeColor="#9333ea"
                          fillColor="#a855f7"
                        />
                      ) : null)}

                      {/* Render All Created Radius Ranking Pins */}
                      {locationRadiusRules.map((rule) => (
                        <AdvancedMarker
                          key={`overview-rule-${rule.id}`}
                          position={{ lat: Number(rule.lat), lng: Number(rule.lng) }}
                        >
                          <div
                            onClick={() => handleStartEditRadiusRule(rule)}
                            className={`p-2 rounded-2xl shadow-xl border-2 flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-110 ${
                              rule.is_active
                                ? 'bg-purple-900 text-amber-300 border-amber-400 ring-2 ring-purple-300'
                                : 'bg-stone-700 text-stone-300 border-stone-400 opacity-60'
                            }`}
                            title={`Click to edit "${rule.name}" ranking`}
                          >
                            <MapPin className="w-4 h-4 text-amber-300 shrink-0" />
                            <div className="text-[10px] font-black leading-tight max-w-[120px] truncate">
                              <div>{rule.name}</div>
                              <div className="text-[9px] text-purple-200 font-normal">{rule.radius_km} KM Radius</div>
                            </div>
                          </div>
                        </AdvancedMarker>
                      ))}
                    </Map>

                    <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-bold text-stone-700 border border-stone-200 shadow-sm flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                      <span>Purple pins show active Location Ranking Points. Tap any pin to edit its ranking!</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Grid of Location Radius Rules */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {locationRadiusRules.length === 0 ? (
                  <div className="col-span-full border-2 border-dashed border-purple-200 rounded-3xl p-8 text-center bg-purple-50/40 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto text-xl font-bold shadow-2xs">
                      📍
                    </div>
                    <div>
                      <h4 className="font-extrabold text-stone-900 text-sm">
                        No Location Radius Ranking Rules Active (কোনো রেডিয়াস রুল এখনো তৈরি করা হয়নি)
                      </h4>
                      <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
                        সার্ভিস এরিয়া ম্যাপে নির্দিষ্ট পয়েন্ট ও কিমি রেডিয়াস নির্বাচন করে সেই এলাকার কাস্টমারদের জন্য আলাদা Top 5 রেস্তোরাঁ র‍্যাঙ্কিং যুক্ত করতে নিচের বাটনে ক্লিক করুন।
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartCreateRadiusRule}
                      className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-2xl shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Create First Location Radius Rule (প্রথম রেডিয়াস রুল তৈরি করুন)</span>
                    </button>
                  </div>
                ) : (
                  locationRadiusRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`bg-stone-50/70 p-4 rounded-3xl border transition-all space-y-3.5 ${
                      rule.is_active ? 'border-purple-300 shadow-2xs' : 'border-stone-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-stone-900 text-sm">{rule.name}</span>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              rule.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                            }`}
                          >
                            {rule.is_active ? 'Active Rule ✓' : 'Disabled'}
                          </span>
                        </div>
                        {rule.name_bn && (
                          <div className="text-xs text-stone-500 font-bengali">{rule.name_bn}</div>
                        )}
                        <div className="text-[11px] font-mono text-purple-700 font-bold flex items-center gap-2 pt-1">
                          <span>📍 Lat: {Number(rule.lat)?.toFixed(4)}, Lng: {Number(rule.lng)?.toFixed(4)}</span>
                          <span>•</span>
                          <span className="bg-purple-100 text-purple-950 px-2 py-0.5 rounded-lg">
                            🎯 Radius: {rule.radius_km} KM
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleRadiusRuleStatus(rule.id)}
                          className="p-2 text-stone-500 hover:text-stone-900 rounded-xl hover:bg-stone-200 text-xs font-bold transition-all cursor-pointer"
                          title="Toggle Active/Disabled"
                        >
                          {rule.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEditRadiusRule(rule)}
                          className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="Edit Location Radius Rule"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteRadiusRule(rule.id, rule.name)}
                          className="p-2 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="Delete Location Radius Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Top 5 Preview Badges */}
                    <div className="bg-white p-3 rounded-2xl border border-stone-200/80 space-y-1.5 text-xs">
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
                        Assigned Top 5 Positions for this Radius:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[1, 2, 3, 4, 5].map((rNum) => {
                          const item = (rule.rankings || []).find((r: any) => Number(r.rank) === rNum);
                          const rest = item ? restaurants.find((r) => r.id === Number(item.restaurant_id)) : null;

                          return (
                            <span
                              key={rNum}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold flex items-center gap-1 shadow-2xs ${
                                rest
                                  ? 'bg-purple-50 text-purple-900 border border-purple-200'
                                  : 'bg-stone-100 text-stone-400 border border-stone-200'
                              }`}
                            >
                              <span>
                                {rNum === 1 ? '🥇 #1' : rNum === 2 ? '🥈 #2' : rNum === 3 ? '🥉 #3' : `#${rNum}`}
                              </span>
                              <span>{rest ? rest.name : 'Empty'}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              </div>
            </div>

            {/* Service Area / Location Selector */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                <div>
                  <h3 className="font-black text-stone-900 text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-600" />
                    <span>Select Service Area Location (এরিয়া/লোকেশন নির্বাচন করুন)</span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    নির্দিষ্ট লোকেশন বা সার্ভিস এরিয়া নির্বাচন করে তার ১-৫ র‍্যাঙ্কিং কনফিগার করুন।
                  </p>
                </div>

                <div className="w-full sm:w-80">
                  <select
                    value={selectedRankingAreaId}
                    onChange={(e) => setSelectedRankingAreaId(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-purple-300 rounded-2xl px-4 py-2.5 text-xs font-black text-stone-900 focus:outline-hidden focus:border-purple-600 shadow-2xs cursor-pointer"
                  >
                    <option value={0}>🌐 Global Default (সকল এরিয়ার জন্য সাধারণ র‍্যাঙ্কিং)</option>
                    {serviceAreas.map((sa: any) => (
                      <option key={sa.id} value={sa.id}>
                        📍 {sa.name} ({sa.name_bn || sa.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TOP 5 RANKING SLOTS (১ম থেকে ৫ম স্থান) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span>Top 5 Position Slots (কাছাকাছি সেকশনের সেরা ৫টি রেস্তোরাঁ স্লট):</span>
                  </h4>
                  <span className="text-[11px] font-bold text-stone-500">
                    নিচের স্লটগুলোতে ১ থেকে ৫ পজিশনের রেস্তোরাঁ বেছে নিন
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
                  {[1, 2, 3, 4, 5].map((rankNum) => {
                    const selectedRestId = topRanksMap[rankNum] || 0;
                    const selectedRest = restaurants.find((r) => r.id === selectedRestId);

                    return (
                      <div
                        key={rankNum}
                        className={`rounded-3xl p-4 border transition-all flex flex-col justify-between space-y-3 ${
                          selectedRestId > 0
                            ? 'bg-purple-50/60 border-purple-300 shadow-xs'
                            : 'bg-stone-50 border-dashed border-stone-300'
                        }`}
                      >
                        {/* Rank Slot Header */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-black px-2.5 py-1 rounded-xl shadow-2xs flex items-center gap-1 ${
                              rankNum === 1
                                ? 'bg-amber-400 text-amber-950'
                                : rankNum === 2
                                ? 'bg-stone-300 text-stone-900'
                                : rankNum === 3
                                ? 'bg-amber-700 text-white'
                                : 'bg-purple-200 text-purple-900'
                            }`}
                          >
                            {rankNum === 1 ? '🥇 Rank #1' : rankNum === 2 ? '🥈 Rank #2' : rankNum === 3 ? '🥉 Rank #3' : `4️⃣ Rank #${rankNum}`}
                          </span>

                          {selectedRestId > 0 && (
                            <button
                              type="button"
                              onClick={() => handleSelectRankSlot(rankNum, 0)}
                              className="text-[10px] text-stone-400 hover:text-rose-600 font-bold underline cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {/* Restaurant Select Dropdown */}
                        <div>
                          <label className="block text-[10px] font-bold text-stone-600 mb-1">
                            Choose Restaurant:
                          </label>
                          <select
                            value={selectedRestId}
                            onChange={(e) => handleSelectRankSlot(rankNum, Number(e.target.value))}
                            className="w-full bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-stone-900 focus:border-purple-600 focus:outline-hidden cursor-pointer"
                          >
                            <option value={0}>-- None (ফাঁকা রাখুন) --</option>
                            {restaurants
                              .filter((r) => {
                                if (r.status !== 'approved') return false;
                                // If this restaurant is the one currently chosen for this slot, show it
                                if (r.id === selectedRestId) return true;
                                // If this restaurant is already selected in another rank slot 1..5, exclude it
                                const isSelectedInOtherSlot = Object.entries(topRanksMap).some(
                                  ([slotRank, restId]) => Number(slotRank) !== rankNum && Number(restId) === r.id
                                );
                                return !isSelectedInOtherSlot;
                              })
                              .map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name} ({r.rating}★) {r.is_open === 1 ? '• Online' : ''}
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Selected Restaurant Preview Card */}
                        {selectedRest ? (
                          <div className="bg-white rounded-2xl p-2.5 border border-purple-200 space-y-1.5 shadow-2xs">
                            <div className="relative h-20 rounded-xl overflow-hidden bg-stone-100">
                              <img
                                src={selectedRest.photo_url}
                                alt={selectedRest.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                ⭐ {selectedRest.rating}
                              </div>
                            </div>
                            <div>
                              <div className="font-extrabold text-xs text-stone-900 truncate">
                                {selectedRest.name}
                              </div>
                              <div className="text-[10px] text-stone-500 truncate">
                                {selectedRest.address}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="border border-dashed border-stone-200 rounded-2xl p-4 text-center text-stone-400">
                            <Store className="w-6 h-6 mx-auto mb-1 text-stone-300" />
                            <span className="text-[10px] font-bold">No restaurant assigned for Rank #{rankNum}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LIST OF REMAINING RESTAURANTS (ডিফল্ট পজিশনে থাকা বাকি রেস্তোরাঁ) */}
              <div className="space-y-3 pt-4 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-stone-700">
                    Remaining Unranked Restaurants (#6+ Default Order):
                  </h4>
                  <span className="text-xs text-stone-500 font-bold">
                    এই রেস্তোরাঁগুলো Top 5 এর পর সাধারণ নিয়মে কাস্টমারকে দেখানো হবে
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {restaurants
                    .filter((r) => r.status === 'approved' && !Object.values(topRanksMap).includes(r.id))
                    .map((r) => (
                      <div
                        key={`unranked-${r.id}`}
                        className="bg-stone-50 p-3 rounded-2xl border border-stone-200 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={r.photo_url}
                            alt={r.name}
                            className="w-10 h-10 rounded-xl object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-stone-900 truncate">{r.name}</div>
                            <div className="text-[10px] text-stone-500 truncate">{r.address} • ⭐ {r.rating}</div>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold text-stone-500 bg-stone-200 px-2 py-0.5 rounded-md shrink-0">
                          Default (#6+)
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'overview' && metrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-2xs">
                <div className="flex items-center justify-between text-stone-400 mb-1">
                  <span className="text-xs font-bold uppercase">Total Revenue</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black font-mono text-stone-900">
                  ₹{metrics.totalRevenue}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">Gross Order Flow</div>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-2xs">
                <div className="flex items-center justify-between text-stone-400 mb-1">
                  <span className="text-xs font-bold uppercase">Platform Margin</span>
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-black font-mono text-purple-700">
                  ₹{metrics.platformCommission}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">Earned Commission</div>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-2xs">
                <div className="flex items-center justify-between text-stone-400 mb-1">
                  <span className="text-xs font-bold uppercase">Active Orders</span>
                  <ShoppingBag className="w-4 h-4 text-orange-600" />
                </div>
                <div className="text-2xl font-black font-mono text-orange-600">
                  {metrics.activeOrders}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">Live in pipeline</div>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-2xs">
                <div className="flex items-center justify-between text-stone-400 mb-1">
                  <span className="text-xs font-bold uppercase">Riders Online</span>
                  <Bike className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black font-mono text-emerald-600">
                  {metrics.onlinePartners} / {metrics.totalPartners}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">Available for dispatch</div>
              </div>
            </div>

            {/* Quick Pending Approvals Callout */}
            {(metrics.pendingRestaurants > 0 || metrics.pendingPartners > 0) && (
              <div className="bg-amber-50 border border-amber-300 rounded-3xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-xs text-amber-900">
                      Pending Approvals Queue
                    </h4>
                    <p className="text-xs text-amber-800">
                      {metrics.pendingRestaurants} Restaurant(s) and {metrics.pendingPartners} Delivery Partner(s) waiting for verification.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {metrics.pendingRestaurants > 0 && (
                    <button
                      onClick={() => setActiveTab('restaurants')}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs"
                    >
                      Review Stores
                    </button>
                  )}
                  {metrics.pendingPartners > 0 && (
                    <button
                      onClick={() => setActiveTab('partners')}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs"
                    >
                      Review Riders
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Platform Rates & Per-KM Fare Status Summary */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-stone-900 text-white rounded-3xl p-5 shadow-md border border-purple-500/30">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider bg-purple-500/30 text-purple-300 border border-purple-400/30 px-2.5 py-0.5 rounded-full">
                      Active Pricing Policy • লাইভ রেট
                    </span>
                    <span className="text-xs text-stone-300 font-medium">Automatic Live GPS Fare Calculation</span>
                  </div>
                  <h4 className="text-base font-extrabold text-white">
                    Platform Commissions & Delivery Partner Per-KM Fare
                  </h4>
                  <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
                    Customer orders dynamically calculate distance from live GPS coordinates to restaurant.
                    Fares and commissions are settled automatically to protect all stakeholders.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('rates')}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl shadow-md transition-all flex items-center gap-1.5 self-start md:self-center shrink-0 cursor-pointer"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Manage Rates & Commissions (কমিশন ও রেট পরিবর্তন)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10 text-xs">
                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-purple-200">Restaurant Commission</div>
                  <div className="text-lg font-black text-white font-mono mt-0.5">
                    {platformSettings.restaurant_commission_percent}%
                  </div>
                  <div className="text-[10px] text-purple-300/80">From Food Subtotal</div>
                </div>

                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-emerald-200">Delivery Partner Fee</div>
                  <div className="text-lg font-black text-white font-mono mt-0.5">
                    {platformSettings.delivery_partner_commission_percent}%
                  </div>
                  <div className="text-[10px] text-emerald-300/80">Rider gets {100 - platformSettings.delivery_partner_commission_percent}%</div>
                </div>

                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-amber-200">Per-Kilometer Fare</div>
                  <div className="text-lg font-black text-white font-mono mt-0.5">
                    ₹{platformSettings.delivery_per_km_rate} / km
                  </div>
                  <div className="text-[10px] text-amber-300/80">Extra km distance fee</div>
                </div>

                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-cyan-200">Base Fare & Distance</div>
                  <div className="text-lg font-black text-white font-mono mt-0.5">
                    ₹{platformSettings.delivery_base_fare} <span className="text-xs font-normal">({platformSettings.delivery_base_distance_km} km)</span>
                  </div>
                  <div className="text-[10px] text-cyan-300/80">Min Guarantee ₹{platformSettings.min_delivery_fare}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RESTAURANT MANAGEMENT */}
        {activeTab === 'restaurants' && (
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-stone-900">Registered Restaurants</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {restaurants.map((rest) => (
                <div
                  key={rest.id}
                  className="bg-white rounded-3xl p-4 border border-stone-200 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="relative shrink-0 cursor-pointer group"
                        onClick={() => handleOpenRestaurantDetails(rest)}
                        title="Click to view full restaurant details & photos (বিস্তারিত দেখুন)"
                      >
                        <img
                          src={rest.photo_url}
                          alt={rest.name}
                          className="w-13 h-13 rounded-2xl object-cover shrink-0 border border-stone-200 shadow-2xs group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center transition-opacity text-white">
                          <Eye className="w-4 h-4 text-amber-300" />
                        </span>
                      </div>
                      <div>
                        <h4
                          onClick={() => handleOpenRestaurantDetails(rest)}
                          className="font-extrabold text-stone-900 text-sm leading-tight hover:text-purple-700 cursor-pointer transition-colors"
                        >
                          {rest.name}
                        </h4>
                        <div className="text-xs text-stone-500">{rest.owner_name} • {rest.phone}</div>
                        <div className="text-[11px] text-stone-400 mt-0.5">{rest.address}</div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        rest.status === 'blocked' || rest.is_active === 0
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : rest.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rest.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {rest.status === 'blocked' || rest.is_active === 0 ? 'Blocked 🚫' : rest.status}
                    </span>
                  </div>

                  <div className="bg-stone-50 rounded-xl p-2.5 text-xs flex justify-between items-center text-stone-600">
                    <div className="flex items-center gap-1.5">
                      <span>Commission Rate: <strong className="text-stone-900">{rest.commission_rate}%</strong></span>
                      <button
                        onClick={() => setEditingRestCommission({ id: rest.id, name: rest.name, rate: rest.commission_rate })}
                        className="text-[10px] text-purple-700 bg-purple-100 hover:bg-purple-200 px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-colors"
                        title="Change commission % for this restaurant"
                      >
                        Edit %
                      </button>
                    </div>
                    <span>Min Order: <strong className="text-stone-900">₹{rest.min_order_amount}</strong></span>
                    <span>License: <strong className="text-stone-900">{rest.fssai_license || 'Verified'}</strong></span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenRestaurantDetails(rest)}
                        className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>View Details (বিস্তারিত)</span>
                      </button>

                      <button
                        onClick={() => setSelectedRestForMap(rest)}
                        className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Map Pin</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleOpenSendMessage('restaurant', rest.id, rest.name)}
                        className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-purple-200 transition-all flex items-center gap-1 shadow-2xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Message</span>
                      </button>

                      <button
                        onClick={() => handleToggleRestaurantBlock(rest.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1 shadow-2xs ${
                          rest.status === 'blocked' || rest.is_active === 0
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                            : 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>{rest.status === 'blocked' || rest.is_active === 0 ? 'Unblock Store' : 'Block Store'}</span>
                      </button>

                      {rest.status === 'pending' && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleUpdateRestStatus(rest.id, 'rejected')}
                            className="bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold px-3 py-1.5 rounded-xl border border-red-200"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleUpdateRestStatus(rest.id, 'approved')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs"
                          >
                            Approve Store ✓
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: DELIVERY PARTNERS */}
        {activeTab === 'partners' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-stone-200 shadow-2xs">
              <div>
                <h3 className="text-base font-extrabold text-stone-900">
                  Delivery Fleet & Approvals ({partners.length})
                </h3>
                <p className="text-xs text-stone-500">
                  Review applicant driving licenses, vehicle documents and grant platform delivery permissions
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search name, phone, license..."
                    value={partnerSearch}
                    onChange={(e) => setPartnerSearch(e.target.value)}
                    className="bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-3 py-1.5 text-xs w-48 focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <div className="flex items-center bg-stone-100 p-0.5 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setPartnerFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      partnerFilter === 'all' ? 'bg-white shadow-2xs text-purple-700' : 'text-stone-500'
                    }`}
                  >
                    All ({partners.length})
                  </button>
                  <button
                    onClick={() => setPartnerFilter('pending')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      partnerFilter === 'pending'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-amber-800 hover:text-amber-900'
                    }`}
                  >
                    Pending ({partners.filter((p) => p.status === 'pending').length})
                  </button>
                  <button
                    onClick={() => setPartnerFilter('approved')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      partnerFilter === 'approved' ? 'bg-white shadow-2xs text-emerald-700' : 'text-stone-500'
                    }`}
                  >
                    Approved ({partners.filter((p) => p.status === 'approved').length})
                  </button>
                  <button
                    onClick={() => setPartnerFilter('blocked')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      partnerFilter === 'blocked' ? 'bg-white shadow-2xs text-red-700' : 'text-stone-500'
                    }`}
                  >
                    Blocked ({partners.filter((p) => p.status === 'blocked').length})
                  </button>
                </div>
              </div>
            </div>

            {/* Rider Per-KM Fare & Commission Callout */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-stone-50 border border-emerald-200 rounded-3xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  🛵
                </div>
                <div>
                  <div className="font-extrabold text-stone-900 flex items-center gap-2 flex-wrap">
                    <span>Active Rider Distance Rate: <strong className="text-emerald-700">₹{platformSettings.delivery_per_km_rate} / km</strong></span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                      Base Fare: ₹{platformSettings.delivery_base_fare} (up to {platformSettings.delivery_base_distance_km} km)
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Platform Commission: <strong>{platformSettings.delivery_partner_commission_percent}%</strong> • Delivery partner retains <strong>{100 - platformSettings.delivery_partner_commission_percent}%</strong> of all delivery earnings
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('rates')}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 self-start sm:self-center shrink-0 cursor-pointer transition-all"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Manage Per-KM Rate & Commission (রেট পরিবর্তন)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {partners
                .filter((dp) => {
                  const matchesSearch =
                    !partnerSearch ||
                    dp.name.toLowerCase().includes(partnerSearch.toLowerCase()) ||
                    dp.phone.includes(partnerSearch) ||
                    dp.vehicle_number.toLowerCase().includes(partnerSearch.toLowerCase()) ||
                    dp.driving_license_number.toLowerCase().includes(partnerSearch.toLowerCase());
                  const matchesFilter =
                    partnerFilter === 'all'
                      ? true
                      : dp.status === partnerFilter;
                  return matchesSearch && matchesFilter;
                })
                .map((dp) => (
                  <div
                    key={dp.id}
                    className={`bg-white rounded-3xl p-4 border shadow-2xs space-y-3 transition-all ${
                      dp.status === 'pending'
                        ? 'border-amber-300 ring-2 ring-amber-100 bg-amber-50/20'
                        : 'border-stone-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="relative shrink-0 cursor-pointer group"
                          onClick={() => setSelectedDetailPartner(dp)}
                          title="Click to view full rider details & documents (বিস্তারিত দেখুন)"
                        >
                          <img
                            src={(dp as any).profile_photo || dp.passport_photo || (dp as any).photo_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150`}
                            alt={dp.name}
                            className="w-14 h-14 rounded-2xl object-cover border border-stone-200 shadow-2xs group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center transition-opacity text-white">
                            <Eye className="w-4 h-4 text-emerald-300" />
                          </span>
                          <span
                            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                              dp.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'
                            }`}
                            title={dp.is_online ? 'Rider Online' : 'Rider Offline'}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              onClick={() => setSelectedDetailPartner(dp)}
                              className="font-extrabold text-stone-900 text-sm hover:text-emerald-700 cursor-pointer transition-colors"
                            >
                              {dp.name}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                dp.is_online ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                              }`}
                            >
                              {dp.is_online ? 'ONLINE' : 'OFFLINE'}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {dp.phone} • {dp.vehicle_type.toUpperCase()} ({dp.vehicle_number})
                          </p>
                          <p className="text-[11px] text-stone-600 font-medium mt-0.5">
                            Driving License: <strong className="font-mono text-stone-900">{dp.driving_license_number}</strong>
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                          dp.status === 'blocked' || dp.is_active === 0
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : dp.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                        }`}
                      >
                        {dp.status === 'blocked' || dp.is_active === 0
                          ? 'Blocked 🚫'
                          : dp.status === 'pending'
                          ? 'Approval Needed ⏳'
                          : 'Approved ✓'}
                      </span>
                    </div>

                    {dp.status === 'pending' && (
                      <div className="bg-amber-100/70 border border-amber-300 rounded-2xl p-2.5 text-xs text-amber-900 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">📋</span>
                          <span>New delivery partner application requires admin verification.</span>
                        </div>
                      </div>
                    )}

                    <div className="bg-stone-50 rounded-xl p-2.5 text-xs flex justify-between text-stone-600">
                      <span>Deliveries: <strong className="text-stone-900">{dp.total_deliveries}</strong></span>
                      <span>Rating: <strong className="text-stone-900">{dp.rating}</strong></span>
                      <span>Wallet: <strong className="text-emerald-700">₹{dp.wallet_balance}</strong></span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone-100 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedDetailPartner(dp)}
                          className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>View Details (বিস্তারিত)</span>
                        </button>

                        <span className="text-[11px] text-stone-500 font-medium hidden sm:inline-block">
                          {dp.status === 'blocked' || dp.is_active === 0
                            ? '⚠️ Account Suspended'
                            : dp.status === 'pending'
                            ? '⏳ Pending Admin Approval'
                            : '✓ Verified Active Rider'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleOpenSendMessage('delivery', dp.id, dp.name)}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-purple-200 transition-all flex items-center gap-1 shadow-2xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Message</span>
                        </button>

                        {dp.status !== 'pending' && (
                          <button
                            onClick={() => handleTogglePartnerBlock(dp.id)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1 shadow-2xs ${
                              dp.status === 'blocked' || dp.is_active === 0
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                                : 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                            }`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>{dp.status === 'blocked' || dp.is_active === 0 ? 'Unblock Rider' : 'Block Rider'}</span>
                          </button>
                        )}


                        {dp.status === 'pending' && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleUpdatePartnerStatus(dp.id, 'rejected')}
                              className="bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold px-3 py-1.5 rounded-xl border border-red-200"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleUpdatePartnerStatus(dp.id, 'approved')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1"
                            >
                              <span>Approve Rider ✓ (অনুমোদন দিন)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}



        {/* TAB 4: ORDERS RADAR */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-stone-900">All Platform Orders</h3>
            <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3">Order #</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Restaurant</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Rider</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-stone-50/50">
                        <td className="p-3 font-mono font-bold text-stone-900">{ord.order_number}</td>
                        <td className="p-3">{ord.customer_name}</td>
                        <td className="p-3 font-bold">{ord.restaurant_name}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              ord.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="p-3 text-stone-600">{ord.delivery_partner_name || 'Unassigned'}</td>
                        <td className="p-3 font-mono font-bold text-stone-900">₹{ord.grand_total}</td>
                        <td className="p-3 uppercase text-stone-500 font-semibold">{ord.payment_method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CUSTOMER MANAGEMENT & COD PERMISSIONS */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            {/* Global COD Setting Card */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-stone-900">
                    Platform-wide Cash on Delivery (COD) Control
                  </h3>
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      globalCodEnabled
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {globalCodEnabled ? 'Globally Enabled' : 'Disabled (Prepaid First)'}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-1 max-w-xl">
                  {globalCodEnabled
                    ? 'All customers currently have access to Cash on Delivery.'
                    : 'Cash on Delivery is currently locked for standard customers. All regular orders are required to be prepaid (UPI/Cards). You can selectively whitelist trusted customers below.'}
                </p>
              </div>

              <button
                onClick={handleToggleGlobalCod}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all whitespace-nowrap ${
                  globalCodEnabled
                    ? 'bg-stone-200 text-stone-800 hover:bg-stone-300'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {globalCodEnabled ? 'Turn OFF Global COD' : 'Turn ON Global COD'}
              </button>
            </div>

            {/* Customers Whitelist List */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-stone-900">
                    Customer Directory & Whitelist Permissions
                  </h3>
                  <p className="text-xs text-stone-500">
                    Grant or revoke Cash on Delivery privileges for individual customer accounts
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search customer name, phone..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-3 py-1.5 text-xs w-52 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>
                  <div className="flex items-center bg-stone-100 p-0.5 rounded-xl text-xs font-bold">
                    <button
                      onClick={() => setCustomerFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        customerFilter === 'all' ? 'bg-white shadow-2xs text-purple-700' : 'text-stone-500'
                      }`}
                    >
                      All ({customers.length})
                    </button>
                    <button
                      onClick={() => setCustomerFilter('cod')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        customerFilter === 'cod' ? 'bg-white shadow-2xs text-emerald-700' : 'text-stone-500'
                      }`}
                    >
                      COD Allowed ({customers.filter((c) => Boolean(c.cod_enabled)).length})
                    </button>
                    <button
                      onClick={() => setCustomerFilter('prepaid')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        customerFilter === 'prepaid' ? 'bg-white shadow-2xs text-stone-800' : 'text-stone-500'
                      }`}
                    >
                      Prepaid Only ({customers.filter((c) => !Boolean(c.cod_enabled)).length})
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customers
                  .filter((c) => {
                    const matchesSearch =
                      !customerSearch ||
                      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                      c.phone.includes(customerSearch) ||
                      c.email.toLowerCase().includes(customerSearch.toLowerCase());
                    const matchesFilter =
                      customerFilter === 'all'
                        ? true
                        : customerFilter === 'cod'
                        ? Boolean(c.cod_enabled)
                        : !Boolean(c.cod_enabled);
                    return matchesSearch && matchesFilter;
                  })
                  .map((c) => {
                    const isCod = Boolean(c.cod_enabled);
                    return (
                      <div
                        key={c.id}
                        className="bg-white rounded-3xl p-4 border border-stone-200 shadow-2xs space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="relative shrink-0 cursor-pointer group"
                              onClick={() => setSelectedDetailCustomer(c)}
                              title="Click to view full customer details & order history (বিস্তারিত দেখুন)"
                            >
                              <img
                                src={c.profile_photo || c.passport_photo || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`}
                                alt={c.name}
                                className="w-14 h-14 rounded-2xl object-cover border border-stone-200 shadow-2xs group-hover:scale-105 transition-transform"
                              />
                              <span className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center transition-opacity text-white">
                                <Eye className="w-4 h-4 text-purple-300" />
                              </span>
                              <span
                                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                  c.is_active === 0 ? 'bg-rose-500' : 'bg-emerald-500'
                                }`}
                                title={c.is_active === 0 ? 'Blocked' : 'Active'}
                              />
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4
                                  onClick={() => setSelectedDetailCustomer(c)}
                                  className="font-extrabold text-stone-900 text-sm hover:text-purple-700 cursor-pointer transition-colors"
                                >
                                  {c.name}
                                </h4>
                                <span
                                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    isCod
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-stone-100 text-stone-600 border border-stone-200'
                                  }`}
                                >
                                  {isCod ? 'COD Allowed ✓' : 'Prepaid Only'}
                                </span>
                                <span
                                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    c.is_active === 0
                                      ? 'bg-red-100 text-red-800 border border-red-200'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}
                                >
                                  {c.is_active === 0 ? 'Blocked 🚫' : 'Active'}
                                </span>
                              </div>
                              <div className="text-xs text-stone-500 mt-0.5">
                                {c.phone} • {c.email}
                              </div>
                              <div className="text-[11px] text-stone-400 mt-0.5">
                                Completed Orders: <strong>{c.total_orders}</strong>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Customer ID</span>
                            <span className="text-xs font-mono font-black text-stone-800">#{c.id}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => setSelectedDetailCustomer(c)}
                              className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                            >
                              <Eye className="w-3.5 h-3.5 text-purple-400" />
                              <span>View Details (বিস্তারিত)</span>
                            </button>

                            <button
                              onClick={() => handleToggleCustomerCod(c.id, c.cod_enabled)}
                              className={`text-xs font-black px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shadow-2xs ${
                                isCod
                                  ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                              }`}
                            >
                              {isCod ? 'Revoke COD' : 'Enable COD ✓'}
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleOpenSendMessage('customer', c.id, c.name)}
                              className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-purple-200 transition-all flex items-center gap-1 shadow-2xs"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Message</span>
                            </button>

                            <button
                              onClick={() => handleToggleCustomerBlock(c.id)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1 shadow-2xs ${
                                c.is_active === 0
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                                  : 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                              }`}
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>{c.is_active === 0 ? 'Unblock Customer' : 'Block Customer'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

              </div>
            </div>
          </div>
        )}

        {/* TAB: PAYMENT SETTLEMENT & PLATFORM EARNINGS DASHBOARD */}
        {activeTab === 'escrow' && (() => {
          const totalRestaurantCommission = orders.reduce((sum, o) => {
            const rest = restaurants.find((r) => r.id === o.restaurant_id);
            const rate = rest ? Number(rest.commission_rate) : platformSettings.restaurant_commission_percent || 15;
            const comm = (o as any).platform_commission || Math.round(Number(o.subtotal || 0) * (rate / 100));
            return sum + Number(comm);
          }, 0);

          const totalRiderPlatformFee = orders.reduce((sum, o) => {
            if (o.is_self_delivery || o.delivery_mode === 'self_delivery') return sum;
            const feeRate = platformSettings.delivery_partner_commission_percent || 10;
            const riderFee = Math.round(Number(o.delivery_fee || 0) * (feeRate / 100));
            return sum + Number(riderFee);
          }, 0);

          const totalPlatformEarnings = totalRestaurantCommission + totalRiderPlatformFee;
          const avgProfitPerOrder = orders.length > 0 ? totalPlatformEarnings / orders.length : 0;

          return (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* SECTION 1: PLATFORM EARNINGS FROM RESTAURANT & DELIVERY PARTNER */}
              <div className="bg-gradient-to-br from-stone-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-6 shadow-xl border border-purple-500/30 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 px-2.5 py-0.5 rounded-full border border-purple-400/30">
                        💰 Revenue & Commission Engine
                      </span>
                      <span className="text-xs text-purple-200">
                        রেস্তোরাঁ ও ডেলিভারি পার্টনার থেকে প্ল্যাটফর্মের মোট আয়
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-emerald-400" />
                      <span>Platform Earnings & Commission Analytics (প্ল্যাটফর্ম আয় ও কমিশন)</span>
                    </h3>
                    <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
                      রেস্তোরাঁর খাদ্য বিক্রয়ের কমিশন ও ডেলিভারি পার্টনারের ডেলিভারি ফি প্ল্যাটফর্ম অংশ মিলিয়ে মোট অর্জিত রাজস্ব।
                    </p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-stone-300 tracking-wider block">
                      Total Net Platform Earnings (মোট প্ল্যাটফর্ম নেট আয়)
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 block mt-0.5">
                      ₹{totalPlatformEarnings.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-purple-200 font-semibold">
                      Calculated across {orders.length} total orders
                    </span>
                  </div>
                </div>

                {/* 3 Metric Cards Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* 1. Restaurant Commission */}
                  <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 space-y-2 hover:border-purple-400/50 transition-all">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-300">
                      <span className="flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-purple-400" />
                        <span>Restaurant Commission (রেস্তোরাঁ কমিশন)</span>
                      </span>
                      <span className="text-[10px] font-black text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-400/30">
                        ~{platformSettings.restaurant_commission_percent}% Avg
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono text-purple-200">
                      ₹{totalRestaurantCommission.toFixed(2)}
                    </div>
                    <p className="text-[11px] text-stone-400 leading-snug">
                      রেস্তোরাঁর মোট খাদ্য মূল্য (Subtotal) থেকে প্রাপ্ত প্ল্যাটফর্ম সার্ভিস কমিশন।
                    </p>
                  </div>

                  {/* 2. Delivery Partner Fee */}
                  <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 space-y-2 hover:border-emerald-400/50 transition-all">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-300">
                      <span className="flex items-center gap-1.5">
                        <Bike className="w-4 h-4 text-emerald-400" />
                        <span>Rider Platform Fee (ডেলিভারি পার্টনার ফি)</span>
                      </span>
                      <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                        ~{platformSettings.delivery_partner_commission_percent}% Fee
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono text-emerald-300">
                      ₹{totalRiderPlatformFee.toFixed(2)}
                    </div>
                    <p className="text-[11px] text-stone-400 leading-snug">
                      ডেলিভারি পার্টনারের অর্জিত ফেয়ার থেকে সংগৃহীত প্ল্যাটফর্ম সিস্টেম ফি।
                    </p>
                  </div>

                  {/* 3. Avg Margin Per Order */}
                  <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 space-y-2 hover:border-amber-400/50 transition-all">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-300">
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                        <span>Avg Profit Per Order (প্রতি অর্ডারে গড় মুনাফা)</span>
                      </span>
                      <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                        Average Margin
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono text-amber-300">
                      ₹{avgProfitPerOrder.toFixed(2)}
                    </div>
                    <p className="text-[11px] text-stone-400 leading-snug">
                      রেস্তোরাঁ ও রাইডার প্ল্যাটফর্ম ফি মিলিয়ে প্রতি অর্ডারে প্ল্যাটফর্মের নিট লাভ।
                    </p>
                  </div>
                </div>
              </div>

              {/* Bengali/English Escrow Policy Banner */}
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl p-6 shadow-md border border-purple-800/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-purple-400/30 text-purple-200 border border-purple-300/30">
                      পেমেন্ট সেটেলমেন্ট ও আর্নিং ট্র্যাকার
                    </span>
                    <span className="text-xs text-purple-200 font-mono">Payment Settlement & Platform Ledger</span>
                  </div>
                  <h3 className="text-lg font-black text-white">
                    পেমেন্ট সেটেলমেন্ট, প্ল্যাটফর্ম আর্নিং ও ২৪-ঘণ্টা এসক্রো রেজোলিউশন সেন্টার
                  </h3>
                  <p className="text-xs text-purple-100/90 leading-relaxed font-bengali">
                    গ্রাহক অনলাইনে প্রিপেইড পেমেন্ট করার পর অর্থ সরাসরি রেস্তোরাঁয় যায় না—তা প্ল্যাটফর্ম অ্যাডমিনের এসক্রোতে সংরক্ষিত থাকে। ডেলিভারি সম্পন্ন হওয়ার ২৪ ঘণ্টা পর টাকা রেস্তোরাঁর ওয়ালেটে জমা হয়। এই সময়ের মধ্যে অ্যাডমিন চাইলে ২৪ ঘণ্টার আগেই তাত্ক্ষণিক সেটেল করতে পারেন, অথবা খাবারের ত্রুটি বা অভিযোগের ভিত্তিতে গ্রাহককে ১০০% রিফান্ড দিতে পারেন।
                  </p>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={handleSettleAllMatured}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black px-4 py-2.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Settle All 24h Matured ({escrowOrders.filter((o) => o.escrow_status === 'matured' || (o.escrow_status === 'holding' && o.holding_until && Date.now() >= new Date(o.holding_until).getTime())).length})</span>
                  </button>
                  <button
                    onClick={fetchAdminData}
                    className="bg-purple-800/80 hover:bg-purple-800 text-purple-100 text-xs font-bold px-4 py-2 rounded-2xl border border-purple-700/60 flex items-center justify-center gap-2 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh Escrow State</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
              <div className="bg-white rounded-3xl p-4 border border-amber-200 shadow-2xs bg-amber-50/30">
                <div className="flex items-center justify-between text-amber-700 mb-1">
                  <span className="text-[11px] font-bold uppercase">In 24h Escrow</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-xl font-black font-mono text-amber-700">
                  ₹{escrowMetrics?.holdingFunds || 0}
                </div>
                <div className="text-[10px] text-stone-500 mt-1">
                  {escrowOrders.filter((o) => o.escrow_status === 'holding').length} orders awaiting 24h
                </div>
              </div>

              <div className="bg-white rounded-3xl p-4 border border-emerald-200 shadow-2xs bg-emerald-50/30">
                <div className="flex items-center justify-between text-emerald-700 mb-1">
                  <span className="text-[11px] font-bold uppercase">24h Matured</span>
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-black font-mono text-emerald-700">
                  ₹{escrowMetrics?.maturedFunds || 0}
                </div>
                <div className="text-[10px] text-emerald-700 font-medium mt-1">
                  Ready to transfer to store
                </div>
              </div>

              <div className="bg-white rounded-3xl p-4 border border-blue-200 shadow-2xs bg-blue-50/30">
                <div className="flex items-center justify-between text-blue-700 mb-1">
                  <span className="text-[11px] font-bold uppercase">Settled Payouts</span>
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-xl font-black font-mono text-blue-800">
                  ₹{escrowMetrics?.settledFunds || 0}
                </div>
                <div className="text-[10px] text-stone-500 mt-1">
                  {escrowOrders.filter((o) => o.escrow_status === 'settled').length} transferred to stores
                </div>
              </div>

              <div className="bg-white rounded-3xl p-4 border border-red-200 shadow-2xs bg-red-50/30">
                <div className="flex items-center justify-between text-red-700 mb-1">
                  <span className="text-[11px] font-bold uppercase">Total Refunded</span>
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div className="text-xl font-black font-mono text-red-700">
                  ₹{escrowMetrics?.refundedFunds || 0}
                </div>
                <div className="text-[10px] text-stone-500 mt-1">Returned to customers</div>
              </div>

              <div className="bg-white rounded-3xl p-4 border border-purple-200 shadow-2xs bg-purple-50/30 col-span-2 md:col-span-1">
                <div className="flex items-center justify-between text-purple-700 mb-1">
                  <span className="text-[11px] font-bold uppercase">Disputes</span>
                  <ShieldAlert className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-xl font-black font-mono text-purple-800">
                  {escrowMetrics?.disputedOrdersCount || 0}
                </div>
                <div className="text-[10px] text-purple-700 font-medium mt-1">
                  Under admin review
                </div>
              </div>
            </div>

            {/* Escrow Orders & Support Resolution Center */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-stone-900">
                    Escrow Transactions & Support Arbitration
                  </h3>
                  <p className="text-xs text-stone-500">
                    Manage 24h maturity timelines, approve early restaurant payouts, or execute instant customer refunds
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search order #, customer..."
                      value={escrowSearch}
                      onChange={(e) => setEscrowSearch(e.target.value)}
                      className="bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-3 py-1.5 text-xs w-52 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>

                  <div className="flex items-center bg-stone-100 p-0.5 rounded-xl text-xs font-bold overflow-x-auto">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'holding', label: 'In 24h Holding' },
                      { id: 'matured', label: 'Matured' },
                      { id: 'settled', label: 'Settled' },
                      { id: 'refunded', label: 'Refunded' },
                      { id: 'disputed', label: 'Disputes' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setEscrowFilter(f.id as any)}
                        className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                          escrowFilter === f.id
                            ? 'bg-white shadow-2xs text-purple-700 font-black'
                            : 'text-stone-500 hover:text-stone-800'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Escrow Orders Table / Cards */}
              <div className="space-y-3">
                {escrowOrders
                  .filter((ord) => {
                    const matchesSearch =
                      !escrowSearch ||
                      ord.order_number?.toLowerCase().includes(escrowSearch.toLowerCase()) ||
                      ord.customer_name?.toLowerCase().includes(escrowSearch.toLowerCase()) ||
                      ord.restaurant_name?.toLowerCase().includes(escrowSearch.toLowerCase());
                    const matchesFilter =
                      escrowFilter === 'all'
                        ? true
                        : escrowFilter === 'matured'
                        ? ord.escrow_status === 'matured' ||
                          (ord.escrow_status === 'holding' &&
                            ord.holding_until &&
                            Date.now() >= new Date(ord.holding_until).getTime())
                        : ord.escrow_status === escrowFilter;
                    return matchesSearch && matchesFilter;
                  })
                  .map((ord) => {
                    const isMatured =
                      ord.escrow_status === 'matured' ||
                      (ord.escrow_status === 'holding' &&
                        ord.holding_until &&
                        Date.now() >= new Date(ord.holding_until).getTime());

                    return (
                      <div
                        key={ord.id}
                        className="bg-stone-50/60 rounded-2xl p-4 border border-stone-200 hover:border-purple-300 transition-all space-y-3"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-mono font-black text-sm text-stone-900">
                                {ord.order_number}
                              </span>
                              <span
                                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                  ord.escrow_status === 'settled'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : ord.escrow_status === 'refunded'
                                    ? 'bg-red-100 text-red-800 border border-red-200'
                                    : ord.escrow_status === 'disputed'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200 animate-pulse'
                                    : isMatured
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {ord.escrow_status === 'settled'
                                  ? 'Directly Settled to Saved Payment Methods ✓'
                                  : ord.escrow_status === 'refunded'
                                  ? 'Refunded to Customer'
                                  : ord.escrow_status === 'disputed'
                                  ? '⚠️ Under Dispute Investigation'
                                  : isMatured
                                  ? '✓ 24h Matured (Ready for Direct Release)'
                                  : '⏳ In 24h Admin Holding'}
                              </span>

                              <span className="text-[10px] font-mono font-bold text-stone-600 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                                Method: {ord.payment_method?.toUpperCase()}
                              </span>
                            </div>

                            <div className="text-xs text-stone-600 flex items-center gap-2 flex-wrap">
                              <span>Customer: <strong className="text-stone-900">{ord.customer_name}</strong> ({ord.customer_phone})</span>
                              <span>•</span>
                              <span>Restaurant: <strong className="text-stone-900">{ord.restaurant_name}</strong></span>
                            </div>

                            <div className="text-[11px] text-stone-500 flex items-center gap-2 flex-wrap">
                              <span>Delivered: {new Date(ord.delivered_at || ord.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(ord.delivered_at || ord.placed_at).toLocaleDateString()}</span>
                              <span>•</span>
                              <span className="font-semibold text-purple-900">
                                {getRemainingTimeText(ord.holding_until, ord.escrow_status)}
                              </span>
                            </div>
                          </div>

                          {/* Financial Split: 4 Key Figures */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 rounded-2xl border border-stone-200 shrink-0 text-center">
                            <div className="px-2">
                              <div className="text-[10px] text-stone-500 font-bold uppercase">Customer Paid</div>
                              <div className="font-mono font-black text-sm text-stone-900">
                                ₹{ord.grand_total}
                              </div>
                            </div>

                            <div className="px-2 sm:border-l border-stone-200">
                              <div className="text-[10px] text-emerald-700 font-bold uppercase">Restaurant Net</div>
                              <div className="font-mono font-black text-sm text-emerald-700">
                                ₹{ord.net_restaurant_amount || Math.round(ord.subtotal * 0.85)}
                              </div>
                            </div>

                            <div className="px-2 border-l border-stone-200">
                              <div className="text-[10px] text-blue-700 font-bold uppercase">Rider Payout</div>
                              <div className="font-mono font-black text-sm text-blue-700">
                                ₹{ord.delivery_partner_earning || 0}
                              </div>
                            </div>

                            <div className="px-2 border-l border-stone-200">
                              <div className="text-[10px] text-purple-700 font-bold uppercase">Platform Fee</div>
                              <div className="font-mono font-black text-sm text-purple-700">
                                ₹{ord.platform_commission || Math.round(ord.subtotal * 0.15)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Dispute / Resolution Details if flagged */}
                        {ord.dispute_reason && (
                          <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-200 text-xs text-purple-900 space-y-1">
                            <div className="font-bold flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-purple-700" />
                              <span>Dispute / Complaint Details:</span>
                            </div>
                            <p className="text-purple-800">{ord.dispute_reason}</p>
                          </div>
                        )}

                        {ord.refund_reason && (
                          <div className="p-3 bg-red-50/80 rounded-xl border border-red-200 text-xs text-red-900 space-y-1">
                            <div className="font-bold flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-red-700" />
                              <span>Refund Confirmation:</span>
                            </div>
                            <p className="text-red-800">
                              ₹{ord.refund_amount || ord.grand_total} refunded to customer. Reason: {ord.refund_reason}
                            </p>
                          </div>
                        )}

                        {/* Action Buttons for Admin */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200/60 flex-wrap">
                          {ord.escrow_status !== 'settled' && ord.escrow_status !== 'refunded' && (
                            <>
                              <button
                                onClick={() => {
                                  setRefundModalOrder(ord);
                                  setRefundAmount(ord.grand_total);
                                  setRefundReason('Customer complaint resolved / Food quality issue');
                                }}
                                className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-3.5 py-1.5 rounded-xl border border-red-200 transition-all shadow-2xs"
                              >
                                Issue Customer Refund ↩
                              </button>

                              {ord.escrow_status !== 'disputed' && (
                                <button
                                  onClick={() => {
                                    setDisputeModalOrder(ord);
                                    setDisputeReason('Customer inquiry submitted / Quality investigation');
                                  }}
                                  className="bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold px-3.5 py-1.5 rounded-xl border border-amber-200 transition-all shadow-2xs"
                                >
                                  Hold / Freeze Payment ⚠️
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setSettleModalOrder(ord);
                                  setSettleNote('Approved by Admin via Support Dashboard');
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Settle to Restaurant Now ✓</span>
                              </button>
                            </>
                          )}

                          {ord.escrow_status === 'settled' && (
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
                              ✓ Paid to Restaurant Balance
                            </span>
                          )}

                          {ord.escrow_status === 'refunded' && (
                            <span className="text-xs font-bold text-red-700 bg-red-50 px-3 py-1 rounded-xl border border-red-200">
                              ✓ 100% Refunded to Customer
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
          );
        })()}

        {/* TAB 5: SERVICE AREAS & GEOFENCE BOUNDARIES */}
        {activeTab === 'geofence' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Success / Error Notification */}
            {serviceAreaMsg && (
              <div
                className={`p-4 rounded-2xl flex items-center justify-between border ${
                  serviceAreaMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  {serviceAreaMsg.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{serviceAreaMsg.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setServiceAreaMsg(null)}
                  className="text-stone-400 hover:text-stone-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Header & Quick Actions Bar */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-purple-700" />
                    Geofence Boundary Engine
                  </span>
                  <span className="text-xs text-stone-500 font-medium">
                    সার্ভিস এরিয়া ও ডেলিভারি বাউন্ডারি
                  </span>
                </div>
                <h3 className="text-lg font-black text-stone-900">
                  Service Area Boundaries & Geofence Zones
                </h3>
                <p className="text-xs text-stone-500 max-w-2xl leading-relaxed">
                  Manage active delivery coverage areas. Only customers and restaurants located within these polygon boundary coordinates can place and fulfill orders.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowLocationTester(!showLocationTester)}
                  className={`text-xs font-bold px-3.5 py-2 rounded-2xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                    showLocationTester
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                  }`}
                >
                  <Crosshair className="w-4 h-4 text-purple-600" />
                  <span>{showLocationTester ? 'Hide GPS Tester' : 'Test Location GPS (চেক করুন)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewAreaName('');
                    setNewAreaNameBn('');
                    setNewAreaMinCharge(25);
                    setNewAreaPerKmCharge(8);
                    setRadiusCenterLat(21.9212);
                    setRadiusCenterLng(88.4350);
                    setRadiusDistanceKm(5);
                    const pts = generateRadiusPolygon(21.9212, 88.4350, 5, 8);
                    setNewAreaPoints(pts);
                    setIsCreatingServiceArea(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add New Boundary (নতুন বাউন্ডারি যোগ করুন)</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                <div className="text-[10px] font-bold text-stone-400 uppercase">Total Service Areas</div>
                <div className="text-xl font-black font-mono text-stone-900 mt-0.5">
                  {serviceAreas.length} Zones
                </div>
                <div className="text-[10px] text-stone-500">Configured polygons</div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                <div className="text-[10px] font-bold text-emerald-600 uppercase">Active Coverage</div>
                <div className="text-xl font-black font-mono text-emerald-700 mt-0.5">
                  {serviceAreas.filter((s) => s.is_active).length} Active
                </div>
                <div className="text-[10px] text-stone-500">Accepting live orders</div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                <div className="text-[10px] font-bold text-purple-600 uppercase">Total Restaurants</div>
                <div className="text-xl font-black font-mono text-purple-700 mt-0.5">
                  {restaurants.length} Stores
                </div>
                <div className="text-[10px] text-stone-500">Assigned across zones</div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                <div className="text-[10px] font-bold text-amber-600 uppercase">Geofence Status</div>
                <div className="text-xl font-black font-mono text-amber-700 mt-0.5">
                  Enforced ✓
                </div>
                <div className="text-[10px] text-stone-500">Ray-casting algorithm</div>
              </div>
            </div>

            {/* LOCATION GPS BOUNDARY TESTER (Optional Drawer) */}
            {showLocationTester && (
              <div className="bg-stone-900 text-white rounded-3xl p-5 border border-purple-500/30 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-5 h-5 text-purple-400" />
                    <div>
                      <h4 className="text-sm font-extrabold text-white">
                        Live GPS Location Geofence Tester (জিপিএস বাউন্ডারি টেস্ট)
                      </h4>
                      <p className="text-xs text-stone-400">
                        Check if a specific coordinate or customer address falls inside an active delivery zone.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLocationTester(false)}
                    className="text-stone-400 hover:text-white font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Quick Presets for Testing */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-stone-300">Quick Test Locations (ক্লিক করে টেস্ট করুন):</span>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { label: 'Raidighi Bazaar (রায়দিঘি বাজার)', lat: '21.9212', lng: '88.4350' },
                      { label: 'Park Circus, Kolkata', lat: '22.5429', lng: '88.3653' },
                      { label: 'Salt Lake Sector V', lat: '22.5800', lng: '88.4300' },
                      { label: 'Ballygunge Kolkata', lat: '22.5292', lng: '88.3612' },
                      { label: 'Diamond Harbour', lat: '22.1890', lng: '88.1960' },
                      { label: 'Out-of-Boundary Test (দূরের এলাকা)', lat: '23.5000', lng: '89.0000' }
                    ].map((loc, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTestLocationLat(loc.lat);
                          setTestLocationLng(loc.lng);
                        }}
                        className="text-xs bg-white/10 hover:bg-white/20 text-stone-200 px-2.5 py-1 rounded-xl transition-all cursor-pointer border border-white/10"
                      >
                        📍 {loc.label}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleTestLocationSubmit} className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="w-full sm:w-1/3">
                    <label className="text-[11px] text-stone-400 font-bold block mb-1">Latitude (অক্ষাংশ):</label>
                    <input
                      type="text"
                      value={testLocationLat}
                      onChange={(e) => setTestLocationLat(e.target.value)}
                      placeholder="e.g. 21.9212"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-hidden focus:border-purple-400"
                      required
                    />
                  </div>
                  <div className="w-full sm:w-1/3">
                    <label className="text-[11px] text-stone-400 font-bold block mb-1">Longitude (দ্রাঘিমাংশ):</label>
                    <input
                      type="text"
                      value={testLocationLng}
                      onChange={(e) => setTestLocationLng(e.target.value)}
                      placeholder="e.g. 88.4350"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-hidden focus:border-purple-400"
                      required
                    />
                  </div>
                  <div className="w-full sm:w-1/3 self-end">
                    <button
                      type="submit"
                      disabled={isTestingLocation}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black text-xs py-2 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Crosshair className="w-4 h-4" />
                      <span>{isTestingLocation ? 'Verifying...' : 'Check Geofence (যাচাই করুন)'}</span>
                    </button>
                  </div>
                </form>

                {/* Test Result Display */}
                {testLocationResult && (
                  <div
                    className={`p-4 rounded-2xl border text-xs space-y-1.5 animate-in fade-in duration-200 ${
                      testLocationResult.isInside
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                        : 'bg-red-950/70 border-red-500 text-red-200'
                    }`}
                  >
                    <div className="font-extrabold flex items-center gap-2 text-sm">
                      {testLocationResult.isInside ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                          <span className="text-emerald-300">✓ Coordinates Inside Active Delivery Boundary! (সার্ভিস এরিয়ার অন্তর্ভুক্ত)</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-red-400" />
                          <span className="text-red-300">✗ Coordinates Outside All Active Boundaries (সার্ভিস এরিয়ার বাইরে)</span>
                        </>
                      )}
                    </div>
                    {testLocationResult.isInside && testLocationResult.matchedArea ? (
                      <div className="space-y-0.5 text-stone-300 pt-1 border-t border-emerald-500/30">
                        <div>
                          <strong>Matched Zone:</strong> {testLocationResult.matchedArea.name} ({testLocationResult.matchedArea.name_bn})
                        </div>
                        <div>
                          <strong>Base Delivery Charge:</strong> ₹{testLocationResult.matchedArea.min_delivery_charge} • <strong>Per-KM Rate:</strong> ₹{testLocationResult.matchedArea.per_km_charge}/km
                        </div>
                        <div>
                          <strong>Status:</strong> {testLocationResult.matchedArea.is_active ? 'Active & Open for Customers' : 'Currently Disabled'}
                        </div>
                      </div>
                    ) : (
                      <p className="text-stone-300 pt-1">
                        Any customer ordering from GPS location ({testLocationLat}, {testLocationLng}) will be informed that deliveries are not currently supported in this area.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SERVICE AREA BOUNDARY CARDS LIST */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {serviceAreas.map((sa) => {
                const restCount = (sa as any).restaurant_count ?? restaurants.filter((r) => r.service_area_id === sa.id).length;
                const orderCount = (sa as any).order_count ?? orders.filter((o) => o.service_area_id === sa.id).length;

                return (
                  <div
                    key={sa.id}
                    className={`bg-white rounded-3xl p-5 border transition-all shadow-2xs space-y-4 ${
                      sa.is_active ? 'border-stone-200 hover:border-purple-300' : 'border-stone-300 opacity-80 bg-stone-50/70'
                    }`}
                  >
                    {/* Card Top Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-stone-900 text-sm">{sa.name}</h4>
                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                              sa.is_active
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-stone-200 text-stone-700 border border-stone-300'
                            }`}
                          >
                            {sa.is_active ? 'Active Zone ✓' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">{sa.name_bn}</p>
                      </div>

                      {/* Quick Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleAreaActive(sa)}
                        title={sa.is_active ? 'Click to deactivate zone' : 'Click to activate zone'}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer shadow-2xs ${
                          sa.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-stone-200 text-stone-700 border-stone-300 hover:bg-stone-300'
                        }`}
                      >
                        {sa.is_active ? 'Active (সক্রিয়)' : 'Disabled (নিষ্ক্রিয়)'}
                      </button>
                    </div>

                    {/* Rates & Stats Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-stone-50 p-3 rounded-2xl border border-stone-200/80">
                      <div>
                        <div className="text-[10px] text-stone-400 font-bold uppercase">Base Charge</div>
                        <div className="font-mono font-black text-stone-900 mt-0.5">
                          ₹{sa.min_delivery_charge}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-stone-400 font-bold uppercase">Per KM</div>
                        <div className="font-mono font-black text-amber-700 mt-0.5">
                          ₹{sa.per_km_charge}/km
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-stone-400 font-bold uppercase">Stores</div>
                        <div className="font-mono font-black text-purple-700 mt-0.5">
                          {restCount} Rest.
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-stone-400 font-bold uppercase">Vertices</div>
                        <div className="font-mono font-black text-emerald-700 mt-0.5">
                          {sa.polygon?.length || 0} pts
                        </div>
                      </div>
                    </div>

                    {/* Visual Google Map showing Connected Polygon Boundary with subtle fill */}
                    <div className="h-48 w-full rounded-2xl overflow-hidden border border-stone-200 relative group">
                      <Map
                        defaultCenter={{
                          lat: sa.polygon[0]?.lat || 21.9212,
                          lng: sa.polygon[0]?.lng || 88.4350
                        }}
                        defaultZoom={11}
                        mapId="DEMO_MAP_ID"
                        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                        className="w-full h-full"
                      >
                        {/* Connected Polygon Shape with subtle background marking */}
                        {sa.polygon && sa.polygon.length >= 3 && (
                          <MapPolygonOverlay
                            paths={sa.polygon}
                            strokeColor={sa.is_active ? '#9333ea' : '#78716c'}
                            fillColor={sa.is_active ? '#a855f7' : '#a8a29e'}
                          />
                        )}

                        {sa.polygon.map((pt, idx) => (
                          <AdvancedMarker key={idx} position={pt}>
                            <div className="w-5 h-5 rounded-full bg-purple-600 text-white font-mono text-[9px] font-black flex items-center justify-center ring-2 ring-white shadow-md">
                              {idx + 1}
                            </div>
                          </AdvancedMarker>
                        ))}
                      </Map>

                      <div className="absolute bottom-2 left-2 bg-stone-900/85 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded-lg border border-white/20">
                        {sa.polygon?.length || 0} GPS Boundary Vertices
                      </div>
                    </div>

                    {/* Coordinates Chips Summary */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-stone-500">
                        <span>Boundary Coordinates (বাউন্ডারি কোঅর্ডিনেট):</span>
                        <span className="text-[10px] font-mono text-purple-600">Polygon Ring</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap max-h-16 overflow-y-auto pr-1">
                        {sa.polygon?.map((pt, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md text-stone-700"
                          >
                            <strong>P{idx + 1}:</strong> {Number(pt.lat).toFixed(4)}, {Number(pt.lng).toFixed(4)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                      <span className="text-[11px] text-stone-400">
                        Orders delivered: <strong>{orderCount}</strong>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDeletingArea(sa)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 hover:border-red-300 text-xs font-bold px-3 py-1.5 rounded-xl border border-red-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Delete this service area (সার্ভিস এরিয়া ডিলিট করুন)"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          <span>Delete (ডিলিট)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const clone = JSON.parse(JSON.stringify(sa));
                            setEditingServiceArea(clone);
                            setEditModalError(null);
                            const center = calculateCenterOfPolygon(clone.polygon || []);
                            setRadiusCenterLat(center.lat);
                            setRadiusCenterLng(center.lng);
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Boundary & Rates (এডিট)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 8: PLATFORM COMMISSIONS & DELIVERY PER-KM RATES */}
        {activeTab === 'rates' && (() => {
          const simDistance = Math.max(0.5, Number(testSimDistance) || 0);
          const simSubtotal = Math.max(10, Number(testSimOrderAmount) || 0);

          const simBaseFare = platformSettings.delivery_base_fare;
          const simBaseDist = platformSettings.delivery_base_distance_km;
          const simPerKm = platformSettings.delivery_per_km_rate;
          const simMinFare = platformSettings.min_delivery_fare;

          const simExtraKm = Math.max(0, parseFloat((simDistance - simBaseDist).toFixed(2)));
          const simDeliveryFare = simDistance <= simBaseDist
            ? Math.max(simMinFare, simBaseFare)
            : Math.max(simMinFare, Math.round(simBaseFare + simExtraKm * simPerKm));

          const simRestComm = platformSettings.restaurant_commission_percent;
          const simRestFee = Math.round((simSubtotal * (simRestComm / 100)) * 100) / 100;
          const simRestPayout = Math.max(0, Math.round((simSubtotal - simRestFee) * 100) / 100);

          const simDpComm = platformSettings.delivery_partner_commission_percent;
          const simDpFee = Math.round((simDeliveryFare * (simDpComm / 100)) * 100) / 100;
          const simDpPayout = Math.max(0, Math.round((simDeliveryFare - simDpFee) * 100) / 100);

          const simTotalPlatformProfit = Math.round((simRestFee + simDpFee) * 100) / 100;

          return (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Top Banner & Control Bar */}
              <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Sliders className="w-3 h-3" />
                      Dynamic Pricing Engine
                    </span>
                    <span className="text-xs text-stone-500 font-medium">
                      লাইভ জিপিএস দূরত্ব ও কমিশন পলিসি
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-stone-900 mt-1">
                    Platform Commissions & Delivery Partner Per-KM Pricing
                  </h3>
                  <p className="text-xs text-stone-500 max-w-2xl mt-0.5 leading-relaxed">
                    Set what percentage commission the platform takes from restaurants and delivery partners,
                    and set the per-kilometer delivery fare rate calculated automatically from customer live GPS location.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setPlatformSettings({
                        restaurant_commission_percent: 15.0,
                        delivery_partner_commission_percent: 10.0,
                        delivery_per_km_rate: 10.0,
                        delivery_base_fare: 25.0,
                        delivery_base_distance_km: 2.0,
                        min_delivery_fare: 20.0
                      });
                    }}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold px-3.5 py-2.5 rounded-2xl transition-all cursor-pointer"
                  >
                    Reset Defaults (ডিফল্ট রেট)
                  </button>

                  <button
                    type="button"
                    onClick={handleSavePlatformRates}
                    disabled={isSavingRates}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold text-xs px-5 py-2.5 rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isSavingRates ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>{isSavingRates ? 'Saving Rates...' : 'Save All Rates & Policy (সংরক্ষণ করুন)'}</span>
                  </button>
                </div>
              </div>

              {/* Success Notification */}
              {ratesSaveSuccess && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-center gap-3 text-xs text-emerald-900 font-bold animate-in fade-in shadow-2xs">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{ratesSaveSuccess}</span>
                </div>
              )}

              {/* Grid 1: Two Platform Commission Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. RESTAURANT COMMISSION CARD */}
                <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-2xs space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-2xs">
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-stone-900">
                          Restaurant Platform Commission (রেস্তোরাঁ কমিশন)
                        </h4>
                        <div className="text-[11px] text-stone-500">
                          Deducted from food subtotal on each order
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-black font-mono text-purple-700 bg-purple-50 px-3 py-1 rounded-xl border border-purple-200">
                        {platformSettings.restaurant_commission_percent}%
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-2xl border border-stone-200 leading-relaxed">
                    <strong>বাংলা ব্যাখ্যা:</strong> কাস্টমার যে খাবার অর্ডার করবে তার মোট মূল্যের (Food Subtotal) উপর এই শতাংশ কমিশন প্ল্যাটফর্ম ফি হিসেবে কর্তন করা হবে। বাকি {100 - platformSettings.restaurant_commission_percent}% অর্থ রেস্তোরাঁ মালিকের পে-আউটে যাবে।
                  </p>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-stone-700">
                      <span>Adjust Commission Percentage:</span>
                      <span className="font-mono text-purple-700">{platformSettings.restaurant_commission_percent}%</span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="0.5"
                      value={platformSettings.restaurant_commission_percent}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          restaurant_commission_percent: Number(e.target.value)
                        })
                      }
                      className="w-full accent-purple-600 cursor-pointer"
                    />

                    <div className="flex items-center justify-between gap-1 pt-1">
                      <span className="text-[10px] text-stone-400 font-semibold">Quick Presets:</span>
                      {[10, 12, 14, 15, 18, 20].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() =>
                            setPlatformSettings({
                              ...platformSettings,
                              restaurant_commission_percent: pct
                            })
                          }
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-all ${
                            platformSettings.restaurant_commission_percent === pct
                              ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                              : 'bg-white hover:bg-purple-50 text-stone-700 border-stone-200'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Real-time Order Sample Preview */}
                  <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 text-xs text-purple-950 space-y-1.5">
                    <div className="font-bold flex items-center justify-between text-purple-900 border-b border-purple-200/60 pb-1">
                      <span>Sample Order: ₹500 Food Subtotal</span>
                      <span className="text-[10px] uppercase font-mono bg-purple-200/80 px-1.5 py-0.2 rounded">Real-time Preview</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">Platform Retains ({platformSettings.restaurant_commission_percent}%):</span>
                      <strong className="font-mono text-purple-700">₹{Math.round(500 * (platformSettings.restaurant_commission_percent / 100))}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">Restaurant Receives ({100 - platformSettings.restaurant_commission_percent}%):</span>
                      <strong className="font-mono text-emerald-700">₹{500 - Math.round(500 * (platformSettings.restaurant_commission_percent / 100))}</strong>
                    </div>
                  </div>
                </div>

                {/* 2. DELIVERY PARTNER COMMISSION CARD */}
                <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-2xs space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-2xs">
                        <Bike className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-stone-900">
                          Delivery Partner Commission (ডেলিভারি পার্টনার কমিশন)
                        </h4>
                        <div className="text-[11px] text-stone-500">
                          Platform share from the customer delivery fare
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-black font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                        {platformSettings.delivery_partner_commission_percent}%
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-2xl border border-stone-200 leading-relaxed">
                    <strong>বাংলা ব্যাখ্যা:</strong> কাস্টমার দূরত্বের জন্য যে ডেলিভারি চার্জ দেয়, সেখান থেকে প্ল্যাটফর্ম কত % কমিশন রাখবে। বাকি {100 - platformSettings.delivery_partner_commission_percent}% অর্থ রাইডারের ওয়ালেটে সরাসরি যুক্ত হবে।
                  </p>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-stone-700">
                      <span>Adjust Partner Platform Fee:</span>
                      <span className="font-mono text-emerald-700">{platformSettings.delivery_partner_commission_percent}%</span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="0.5"
                      value={platformSettings.delivery_partner_commission_percent}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          delivery_partner_commission_percent: Number(e.target.value)
                        })
                      }
                      className="w-full accent-emerald-600 cursor-pointer"
                    />

                    <div className="flex items-center justify-between gap-1 pt-1">
                      <span className="text-[10px] text-stone-400 font-semibold">Quick Presets:</span>
                      {[5, 8, 10, 12, 15, 20].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() =>
                            setPlatformSettings({
                              ...platformSettings,
                              delivery_partner_commission_percent: pct
                            })
                          }
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-all ${
                            platformSettings.delivery_partner_commission_percent === pct
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white hover:bg-emerald-50 text-stone-700 border-stone-200'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Real-time Delivery Sample Preview */}
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 text-xs text-emerald-950 space-y-1.5">
                    <div className="font-bold flex items-center justify-between text-emerald-900 border-b border-emerald-200/60 pb-1">
                      <span>Sample Delivery Fee: ₹60 Customer Fare</span>
                      <span className="text-[10px] uppercase font-mono bg-emerald-200/80 px-1.5 py-0.2 rounded">Real-time Preview</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">Platform Retains ({platformSettings.delivery_partner_commission_percent}%):</span>
                      <strong className="font-mono text-purple-700">₹{Math.round(60 * (platformSettings.delivery_partner_commission_percent / 100))}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">Rider Net Earning ({100 - platformSettings.delivery_partner_commission_percent}%):</span>
                      <strong className="font-mono text-emerald-700">₹{60 - Math.round(60 * (platformSettings.delivery_partner_commission_percent / 100))}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 2: Distance & Per-Kilometer Pricing Controls */}
              <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-2xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shadow-2xs">
                      <Navigation className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-stone-900">
                        Delivery Partner Per-Kilometer Rate & Base Distance Pricing
                      </h4>
                      <p className="text-xs text-stone-500">
                        প্রতি কিলোমিটার ডেলিভারি রেট ও বেস ফেয়ার কনফিগারেশন
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-500">Active Rate:</span>
                    <span className="text-base font-black font-mono text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                      ₹{platformSettings.delivery_per_km_rate} / km
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  {/* 1. Per Km Rate */}
                  <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-extrabold text-amber-950">
                        Per-KM Rate (প্রতি কিমি রেট)
                      </label>
                      <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded">₹/কিমি</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="0.5"
                        value={platformSettings.delivery_per_km_rate}
                        onChange={(e) =>
                          setPlatformSettings({
                            ...platformSettings,
                            delivery_per_km_rate: Number(e.target.value)
                          })
                        }
                        className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 font-mono font-bold text-stone-900 focus:outline-hidden focus:border-amber-500"
                      />
                    </div>
                    <div className="flex gap-1 flex-wrap pt-1">
                      {[8, 10, 12, 14, 16].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() =>
                            setPlatformSettings({
                              ...platformSettings,
                              delivery_per_km_rate: rate
                            })
                          }
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                            platformSettings.delivery_per_km_rate === rate
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-stone-700 border-amber-200 hover:bg-amber-50'
                          }`}
                        >
                          ₹{rate}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-amber-900/80">অতিরিক্ত প্রতিটি দূরত্বের জন্য এই রেটে ভাড়া বাড়বে।</p>
                  </div>

                  {/* 2. Base Distance */}
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-extrabold text-stone-800">
                        Base Distance (বেস দূরত্ব)
                      </label>
                      <span className="text-[10px] text-stone-600 font-bold bg-stone-200 px-1.5 py-0.5 rounded">কিমি</span>
                    </div>
                    <input
                      type="number"
                      min="0.5"
                      max="10"
                      step="0.5"
                      value={platformSettings.delivery_base_distance_km}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          delivery_base_distance_km: Number(e.target.value)
                        })
                      }
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 font-mono font-bold text-stone-900 focus:outline-hidden focus:border-purple-500"
                    />
                    <div className="flex gap-1 flex-wrap pt-1">
                      {[1.5, 2.0, 2.5, 3.0].map((dist) => (
                        <button
                          key={dist}
                          type="button"
                          onClick={() =>
                            setPlatformSettings({
                              ...platformSettings,
                              delivery_base_distance_km: dist
                            })
                          }
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                            platformSettings.delivery_base_distance_km === dist
                              ? 'bg-stone-800 text-white border-stone-800'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {dist} km
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-stone-500">এই দূরত্ব পর্যন্ত কাস্টমারকে শুধু বেস ফেয়ার দিতে হয়।</p>
                  </div>

                  {/* 3. Base Delivery Fare */}
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-extrabold text-stone-800">
                        Base Fare (বেস ডেলিভারি চার্জ)
                      </label>
                      <span className="text-[10px] text-stone-600 font-bold bg-stone-200 px-1.5 py-0.5 rounded">₹ টাকা</span>
                    </div>
                    <input
                      type="number"
                      min="5"
                      max="100"
                      step="1"
                      value={platformSettings.delivery_base_fare}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          delivery_base_fare: Number(e.target.value)
                        })
                      }
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 font-mono font-bold text-stone-900 focus:outline-hidden focus:border-purple-500"
                    />
                    <div className="flex gap-1 flex-wrap pt-1">
                      {[20, 25, 30, 35].map((fare) => (
                        <button
                          key={fare}
                          type="button"
                          onClick={() =>
                            setPlatformSettings({
                              ...platformSettings,
                              delivery_base_fare: fare
                            })
                          }
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                            platformSettings.delivery_base_fare === fare
                              ? 'bg-stone-800 text-white border-stone-800'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          ₹{fare}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-stone-500">বেস দূরত্বের ভেতরের প্রতিটি অর্ডারের নির্দিষ্ট ডেলিভারি ফি।</p>
                  </div>

                  {/* 4. Minimum Fare Guarantee */}
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-extrabold text-stone-800">
                        Min Fare (সর্বনিম্ন গ্যারান্টি)
                      </label>
                      <span className="text-[10px] text-stone-600 font-bold bg-stone-200 px-1.5 py-0.5 rounded">₹ টাকা</span>
                    </div>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      step="1"
                      value={platformSettings.min_delivery_fare}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          min_delivery_fare: Number(e.target.value)
                        })
                      }
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 font-mono font-bold text-stone-900 focus:outline-hidden focus:border-purple-500"
                    />
                    <div className="flex gap-1 flex-wrap pt-1">
                      {[15, 20, 25].map((fare) => (
                        <button
                          key={fare}
                          type="button"
                          onClick={() =>
                            setPlatformSettings({
                              ...platformSettings,
                              min_delivery_fare: fare
                            })
                          }
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                            platformSettings.min_delivery_fare === fare
                              ? 'bg-stone-800 text-white border-stone-800'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          ₹{fare}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-stone-500">যেকোনো স্বল্প দূরত্বের ডেলিভারিতে রাইডারের সর্বনিম্ন পাওনা নিশ্চিত করে।</p>
                  </div>
                </div>

                {/* Calculation Formula Banner */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-stone-900">
                        স্বয়ংক্রিয় কার্ট ফেয়ার সূত্র (Automatic Customer Cart Formula):
                      </div>
                      <div className="font-mono text-stone-700 mt-0.5">
                        Distance ≤ {platformSettings.delivery_base_distance_km} km → <strong>₹{platformSettings.delivery_base_fare} (Base Fare)</strong>
                        <br />
                        Distance &gt; {platformSettings.delivery_base_distance_km} km → <strong>₹{platformSettings.delivery_base_fare} + (Distance - {platformSettings.delivery_base_distance_km} km) × ₹{platformSettings.delivery_per_km_rate}/km</strong>
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold bg-white text-stone-800 px-3 py-1.5 rounded-xl border border-amber-300 shadow-2xs self-start sm:self-center shrink-0">
                    Live GPS Tested ✓
                  </span>
                </div>
              </div>

              {/* Grid 3: Interactive Live Distance & Fare Simulator */}
              <div className="bg-gradient-to-br from-stone-900 via-stone-950 to-purple-950 text-white rounded-3xl p-6 shadow-md border border-purple-900/50 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md">
                      <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-white">
                        Live Distance & Order Fare Simulator (লাইভ দূরত্ব ও ফেয়ার টেস্ট সিমুলেটর)
                      </h4>
                      <p className="text-xs text-stone-400">
                        Test how distance and food subtotal calculate customer cart fare, restaurant payout & delivery partner earnings
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono bg-purple-500/20 text-purple-300 border border-purple-400/30 px-3 py-1 rounded-full self-start sm:self-center">
                    Instant Math Verification
                  </span>
                </div>

                {/* Simulator Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  {/* Slider 1: Distance */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-stone-300 flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-orange-400" />
                        <span>Simulated Customer GPS Distance:</span>
                      </span>
                      <span className="text-base font-black font-mono text-orange-400 bg-orange-500/20 px-2.5 py-0.5 rounded-lg border border-orange-400/30">
                        {simDistance} km
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="15.0"
                      step="0.1"
                      value={testSimDistance}
                      onChange={(e) => setTestSimDistance(Number(e.target.value))}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                      <span>0.5 km (Short doorstep)</span>
                      <span>5.0 km (Medium)</span>
                      <span>15.0 km (Long distance)</span>
                    </div>
                  </div>

                  {/* Slider 2: Food Subtotal */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-stone-300 flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Simulated Food Subtotal:</span>
                      </span>
                      <span className="text-base font-black font-mono text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-lg border border-emerald-400/30">
                        ₹{simSubtotal}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="25"
                      value={testSimOrderAmount}
                      onChange={(e) => setTestSimOrderAmount(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                      <span>₹100 (Single item)</span>
                      <span>₹1,000 (Family lunch)</span>
                      <span>₹2,000 (Party feast)</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Order Settlement Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  {/* Metric 1: Customer Cart Total */}
                  <div className="bg-white/10 rounded-2xl p-4 border border-white/10 space-y-1">
                    <div className="text-[10px] font-extrabold uppercase text-stone-400">
                      Customer Cart Delivery Fare
                    </div>
                    <div className="text-2xl font-black font-mono text-amber-400">
                      ₹{simDeliveryFare}
                    </div>
                    <div className="text-[10px] text-stone-300 leading-tight">
                      {simDistance <= simBaseDist
                        ? `Flat ₹${simBaseFare} base fare (<${simBaseDist} km)`
                        : `₹${simBaseFare} base + ${simExtraKm} km @ ₹${simPerKm}/km`}
                    </div>
                  </div>

                  {/* Metric 2: Restaurant Payout */}
                  <div className="bg-white/10 rounded-2xl p-4 border border-white/10 space-y-1">
                    <div className="text-[10px] font-extrabold uppercase text-purple-300">
                      Restaurant Net Payout ({100 - simRestComm}%)
                    </div>
                    <div className="text-2xl font-black font-mono text-purple-300">
                      ₹{simRestPayout}
                    </div>
                    <div className="text-[10px] text-stone-300 leading-tight">
                      Platform takes ₹{simRestFee} ({simRestComm}% food commission)
                    </div>
                  </div>

                  {/* Metric 3: Delivery Partner Net */}
                  <div className="bg-white/10 rounded-2xl p-4 border border-white/10 space-y-1">
                    <div className="text-[10px] font-extrabold uppercase text-emerald-300">
                      Rider Net Earnings ({100 - simDpComm}%)
                    </div>
                    <div className="text-2xl font-black font-mono text-emerald-300">
                      ₹{simDpPayout}
                    </div>
                    <div className="text-[10px] text-stone-300 leading-tight">
                      Platform takes ₹{simDpFee} ({simDpComm}% delivery fee)
                    </div>
                  </div>

                  {/* Metric 4: Platform Net Profit */}
                  <div className="bg-purple-600/30 rounded-2xl p-4 border border-purple-400/40 space-y-1">
                    <div className="text-[10px] font-extrabold uppercase text-white">
                      Total Platform Revenue
                    </div>
                    <div className="text-2xl font-black font-mono text-white">
                      ₹{simTotalPlatformProfit}
                    </div>
                    <div className="text-[10px] text-purple-200 leading-tight">
                      ₹{simRestFee} (Rest) + ₹{simDpFee} (Rider)
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 flex items-center justify-between text-xs text-stone-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      Customer Pays at Checkout: <strong>Food ₹{simSubtotal} + Delivery ₹{simDeliveryFare} + 5% GST = ₹{Math.round((simSubtotal + simDeliveryFare) * 1.05)}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-purple-300 hidden sm:inline">
                    Fair Pricing for Everyone (সবার জন্য ন্যায্য ফেয়ার)
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Selected Restaurant Location View Modal (Admin inspects coordinates on Google Map) */}
      {selectedRestForMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-stone-900 text-base">
                  {selectedRestForMap.name}
                </h4>
                <p className="text-xs text-stone-500">{selectedRestForMap.address}</p>
              </div>
              <button
                onClick={() => setSelectedRestForMap(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="h-[280px] w-full rounded-2xl overflow-hidden border border-stone-200">
              <Map
                defaultCenter={{
                  lat: Number(selectedRestForMap.latitude),
                  lng: Number(selectedRestForMap.longitude)
                }}
                defaultZoom={15}
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                className="w-full h-full"
              >
                <AdvancedMarker
                  position={{
                    lat: Number(selectedRestForMap.latitude),
                    lng: Number(selectedRestForMap.longitude)
                  }}
                >
                  <div className="bg-orange-600 text-white p-2 rounded-xl shadow-lg border-2 border-white flex items-center gap-1">
                    <Store className="w-4 h-4" />
                    <span className="text-[11px] font-bold">{selectedRestForMap.name}</span>
                  </div>
                </AdvancedMarker>
              </Map>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedRestForMap(null)}
                className="bg-stone-800 text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                Close Map View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Individual Restaurant Commission Modal */}
      {editingRestCommission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h4 className="font-extrabold text-stone-900 text-base flex items-center gap-2">
                  <Percent className="w-5 h-5 text-purple-600" />
                  <span>Custom Restaurant Commission</span>
                </h4>
                <p className="text-xs text-stone-500">{editingRestCommission.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRestCommission(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-purple-50 rounded-2xl p-3.5 border border-purple-200 text-xs text-purple-950 space-y-1">
              <p className="font-semibold leading-relaxed">
                এই নির্দিষ্ট রেস্তোরাঁর জন্য বিশেষ কমিশন শতকরা হার নির্ধারণ করুন। প্ল্যাটফর্ম ডিফল্ট রেটের বদলে এই হার কার্যকর হবে।
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-stone-700">
                <span>Commission Percentage (%):</span>
                <span className="text-base font-black font-mono text-purple-700">{editingRestCommission.rate}%</span>
              </div>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={editingRestCommission.rate}
                onChange={(e) => setEditingRestCommission({ ...editingRestCommission, rate: Number(e.target.value) })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold font-mono focus:outline-hidden focus:border-purple-600"
              />
              <div className="flex gap-1.5 flex-wrap pt-1">
                {[10, 12, 14, 15, 18, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setEditingRestCommission({ ...editingRestCommission, rate: pct })}
                    className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-all ${
                      editingRestCommission.rate === pct
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setEditingRestCommission(null)}
                className="px-4 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingRestComm}
                onClick={handleUpdateSingleRestaurantCommission}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingRestComm ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Save Commission (সংরক্ষণ করুন)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Escrow Payout Modal */}
      {settleModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h4 className="font-extrabold text-stone-900 text-base flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span>Settle Restaurant Payout</span>
                </h4>
                <p className="text-xs text-stone-500">Order #{settleModalOrder.order_number}</p>
              </div>
              <button
                onClick={() => setSettleModalOrder(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
              <div className="flex justify-between">
                <span>Restaurant:</span>
                <strong className="text-stone-900">{settleModalOrder.restaurant_name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Net Transfer Amount:</span>
                <strong className="text-emerald-700 font-mono text-sm">
                  ₹{settleModalOrder.net_restaurant_amount || Math.round(settleModalOrder.subtotal * 0.85)}
                </strong>
              </div>
              <div className="text-[11px] text-emerald-700 pt-1 border-t border-emerald-200">
                Funds will be deposited immediately into the restaurant's payable wallet.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Settlement Note (অডিট নোট)
              </label>
              <input
                type="text"
                value={settleNote}
                onChange={(e) => setSettleNote(e.target.value)}
                placeholder="e.g. 24h maturity reached / Early manual release approved"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-emerald-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSettleModalOrder(null)}
                className="px-4 py-2 text-xs font-bold text-stone-500 hover:text-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSettleEscrow(settleModalOrder.id, settleNote)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirm & Release Money</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Refund Modal */}
      {refundModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleRefundEscrow}
            className="bg-white w-full max-w-lg rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h4 className="font-extrabold text-stone-900 text-base flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span>Issue Customer Refund (টাকা ফেরত প্রদান)</span>
                </h4>
                <p className="text-xs text-stone-500">
                  Order #{refundModalOrder.order_number} • Customer: {refundModalOrder.customer_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRefundModalOrder(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-red-50 rounded-2xl p-3.5 border border-red-200 text-xs text-red-900 space-y-1">
              <div className="flex justify-between">
                <span>Customer Paid Total:</span>
                <strong className="font-mono text-stone-900">₹{refundModalOrder.grand_total}</strong>
              </div>
              <div className="flex justify-between">
                <span>Escrow Status:</span>
                <span className="font-bold uppercase text-red-700">{refundModalOrder.escrow_status}</span>
              </div>
              <p className="text-[11px] text-red-700 pt-1 border-t border-red-200 leading-tight">
                টাকা রিফান্ড হলে তা সরাসরি গ্রাহকের ব্যাঙ্ক/ইউপিআই-এ ফেরত যাবে এবং রেস্তোরাঁকে নোটিফিকেশন পাঠানো হবে।
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Refund Amount (₹ ফেরত দেওয়ার পরিমাণ)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  required
                  min="1"
                  max={refundModalOrder.grand_total}
                  value={refundAmount || refundModalOrder.grand_total}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-hidden focus:border-red-500"
                />
                <button
                  type="button"
                  onClick={() => setRefundAmount(refundModalOrder.grand_total)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs px-3 py-2 rounded-xl whitespace-nowrap"
                >
                  Full 100%
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Quick Reason Selection (দ্রুত কারণ নির্বাচন)
              </label>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {[
                  'খাবারের মান খারাপ / নষ্ট ছিল (Food Spoilage)',
                  'প্যাকেটের সিল কাটা ছিল (Packaging Issue)',
                  'অতিরিক্ত দেরিতে ডেলিভারি হয়েছে (Delivery Delay)',
                  'ভুল খাবার ডেলিভারি হয়েছে (Wrong Items)',
                  'রেস্তোরাঁ খাবার দিতে অসমর্থ হয়েছে',
                  'গ্রাহকের জেনুইন অভিযোগ সমাধান'
                ].map((reasonText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRefundReason(reasonText)}
                    className="p-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-red-50 hover:border-red-300 text-[10px] text-left text-stone-700 font-medium truncate"
                  >
                    {reasonText}
                  </button>
                ))}
              </div>

              <label className="block text-xs font-bold text-stone-700 mb-1">
                Refund Explanation / Dispute Resolution Note
              </label>
              <textarea
                required
                rows={2}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs focus:outline-hidden focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setRefundModalOrder(null)}
                className="px-4 py-2 text-xs font-bold text-stone-500 hover:text-stone-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Execute Refund to Customer</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Freeze / Dispute Modal */}
      {disputeModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleDisputeEscrow}
            className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h4 className="font-extrabold text-stone-900 text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>Freeze Payment for Dispute</span>
                </h4>
                <p className="text-xs text-stone-500">Order #{disputeModalOrder.order_number}</p>
              </div>
              <button
                type="button"
                onClick={() => setDisputeModalOrder(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 text-xs text-amber-900">
              This will lock the escrow payout, preventing automated 24h release to the restaurant while support investigates the complaint.
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Dispute Investigation Reason (স্থগিতের কারণ)
              </label>
              <textarea
                required
                rows={3}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Explain the complaint or issue reported by customer..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDisputeModalOrder(null)}
                className="px-4 py-2 text-xs font-bold text-stone-500 hover:text-stone-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Freeze Escrow Payment</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Universal Direct Message Modal (For Restaurant, Rider, Customer) */}
      {messageModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSendMessageSubmit}
            className="bg-white w-full max-w-lg rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h4 className="font-extrabold text-stone-900 text-base flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  <span>Send Direct Message (বার্তা ও নোটিফিকেশন পাঠান)</span>
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-stone-500 font-medium">Recipient:</span>
                  <strong className="text-xs text-stone-900">{messageModalData.name}</strong>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      messageModalData.role === 'restaurant'
                        ? 'bg-orange-100 text-orange-800'
                        : messageModalData.role === 'delivery'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {messageModalData.role}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMessageModalData(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Template Chips */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Quick Preset Templates (দ্রুত টেমপ্লেট নির্বাচন):
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {messageModalData.role === 'restaurant' && [
                  {
                    t: 'Operating Hours Reminder',
                    tBn: 'খোলার সময় আপডেট সংক্রান্ত নোটিশ',
                    b: 'Please keep your kitchen open status updated on time so customers can place orders.',
                    bBn: 'দয়া করে রেস্তোরাঁ খোলার সঠিক সময় আপডেট রাখুন যাতে গ্রাহকরা সহজে খাবার অর্ডার করতে পারেন।'
                  },
                  {
                    t: 'Food Quality & Packaging Alert',
                    tBn: 'খাবারের মান ও প্যাকেজিং সতর্কতা',
                    b: 'Please ensure food containers are securely sealed and food is delivered fresh.',
                    bBn: 'খাবারের প্যাকেটের মুখ ভালোভাবে সিল করুন এবং টাটকা খাবার পরিবেশন নিশ্চিত করুন।'
                  },
                  {
                    t: 'Order Preparation Delay Notice',
                    tBn: 'খাবার প্রস্তুতের সময় সংক্রান্ত নোটিশ',
                    b: 'Please ensure food is prepared within the estimated preparation time to avoid rider wait.',
                    bBn: 'রাইডার পৌঁছানোর আগেই খাবার প্রস্তুত রাখুন যাতে অতিরিক্ত বিলম্ব না ঘটে।'
                  },
                  {
                    t: 'Congratulations on Top Ratings!',
                    tBn: 'সেরা পারফরম্যান্স ও রেটিংয়ের জন্য অভিনন্দন',
                    b: 'Your restaurant has received outstanding reviews from customers this week! Keep it up.',
                    bBn: 'আপনার রেস্তোরাঁ গ্রাহকদের থেকে চমৎকার রেটিং পেয়েছে। অভিনন্দন!'
                  }
                ].map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setMsgTitle(tpl.t);
                      setMsgTitleBn(tpl.tBn);
                      setMsgBody(tpl.b);
                      setMsgBodyBn(tpl.bBn);
                    }}
                    className="p-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-purple-50 hover:border-purple-300 text-[10px] text-left text-stone-700 font-medium truncate"
                  >
                    {tpl.t}
                  </button>
                ))}

                {messageModalData.role === 'delivery' && [
                  {
                    t: 'Helmet & Safe Driving Advisory',
                    tBn: 'সাবধানে ড্রাইভ করুন ও হেলমেট পরুন',
                    b: 'Always wear a helmet and follow traffic rules while on active food delivery runs.',
                    bBn: 'ডেলিভারির সময় সবসময় হেলমেট পরুন এবং ট্রাফিক নিয়ম মেনে চলুন।'
                  },
                  {
                    t: 'Peak Hour Incentive Alert',
                    tBn: 'পিক আওয়ার এক্সট্রা বোনাস অফার',
                    b: 'High order volume active right now! Complete 5 deliveries today to earn extra bonus.',
                    bBn: 'এখন প্রচুর অর্ডার আসছে! আজ ৫টি ডেলিভারি সম্পন্ন করে বাড়তি বোনাস জিতে নিন।'
                  },
                  {
                    t: 'Prompt Doorstep Delivery Reminder',
                    tBn: 'যথাসময়ে গ্রাহকের ঠিকানায় পৌঁছানোর তাগিদ',
                    b: 'Please ring the doorbell and hand over food with polite customer greeting.',
                    bBn: 'গ্রাহকের দরজায় সময়মতো খাবার পৌঁছে দিন এবং সৌজন্যমূলক আচরণ বজায় রাখুন।'
                  },
                  {
                    t: 'Fast Pickup from Kitchen',
                    tBn: 'রেস্তোরাঁ থেকে দ্রুত পিকআপ সংক্রান্ত নোটিশ',
                    b: 'Food is prepared quickly by restaurants. Please reach the restaurant on time.',
                    bBn: 'খাবার প্রস্তুত হওয়ার সাথে সাথে রেস্তোরাঁ থেকে দ্রুত পার্সেল সংগ্রহ করুন।'
                  }
                ].map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setMsgTitle(tpl.t);
                      setMsgTitleBn(tpl.tBn);
                      setMsgBody(tpl.b);
                      setMsgBodyBn(tpl.bBn);
                    }}
                    className="p-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-blue-50 hover:border-blue-300 text-[10px] text-left text-stone-700 font-medium truncate"
                  >
                    {tpl.t}
                  </button>
                ))}

                {messageModalData.role === 'customer' && [
                  {
                    t: 'Exclusive Promo Offer for You',
                    tBn: 'আপনার জন্য বিশেষ ডিসকাউন্ট অফার!',
                    b: 'Use coupon PROTHOM50 or AHARLOCAL for exclusive savings on your favorite food today!',
                    bBn: 'আজই আপনার পছন্দের খাবার অর্ডারে আকর্ষণীয় ছাড় পেতে কুপন ব্যবহার করুন!'
                  },
                  {
                    t: 'Order Delivery Follow-up',
                    tBn: 'আপনার অর্ডারের ডেলিভারি সম্পর্কিত খোঁজ',
                    b: 'We hope your meal was delicious! Please rate the food and rider on your app.',
                    bBn: 'আশা করি খাবারটি সুস্বাদু হয়েছে! দয়া করে আপনার মতামত ও রেটিং জানান।'
                  },
                  {
                    t: 'Customer Support Assistance',
                    tBn: 'আহারলোকাল সাপোর্ট সহযোগিতা',
                    b: 'If you have any questions or faced issues with your delivery, our support team is here to help.',
                    bBn: 'অর্ডার নিয়ে কোনো সমস্যা হলে আমাদের সাপোর্ট ড্যাশবোর্ডে জানাতে দ্বিধা করবেন না।'
                  },
                  {
                    t: 'Account Information Notice',
                    tBn: 'অ্যাকাউন্ট ভেরিফিকেশন তথ্য',
                    b: 'Please keep your delivery address and landmark updated for fast and accurate deliveries.',
                    bBn: 'দ্রুত ডেলিভারির সুবিধার্থে আপনার ডেলিভারি ঠিকানা সবসময় সঠিক রাখুন।'
                  }
                ].map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setMsgTitle(tpl.t);
                      setMsgTitleBn(tpl.tBn);
                      setMsgBody(tpl.b);
                      setMsgBodyBn(tpl.bBn);
                    }}
                    className="p-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-purple-50 hover:border-purple-300 text-[10px] text-left text-stone-700 font-medium truncate"
                  >
                    {tpl.t}
                  </button>
                ))}
              </div>
            </div>

            {/* Title Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Message Title (English)
                </label>
                <input
                  type="text"
                  required
                  value={msgTitle}
                  onChange={(e) => setMsgTitle(e.target.value)}
                  placeholder="e.g. Important Service Notice"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Title (বাংলা বাংলা)
                </label>
                <input
                  type="text"
                  value={msgTitleBn}
                  onChange={(e) => setMsgTitleBn(e.target.value)}
                  placeholder="যেমন: জরুরি বিজ্ঞপ্তি"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bengali focus:outline-hidden focus:border-purple-600"
                />
              </div>
            </div>

            {/* Message Body Inputs */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Message Content (বার্তা বিবরণ)
              </label>
              <textarea
                required
                rows={3}
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
                placeholder="Write the message that will be sent as an alert and in-app notification..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs focus:outline-hidden focus:border-purple-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Priority Level (গুরুত্ব):
              </label>
              <div className="flex items-center gap-2">
                {[
                  { id: 'normal', label: 'Normal (সাধারণ)' },
                  { id: 'important', label: 'Important (গুরুত্বপূর্ণ)' },
                  { id: 'urgent', label: 'Urgent Alert (জরুরি)' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setMsgPriority(p.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      msgPriority === p.id
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setMessageModalData(null)}
                className="px-4 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSendingMsg}
                className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isSendingMsg ? 'Sending...' : 'Send Message Now (বার্তা পাঠান)'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: RESTAURANT FULL DETAILS MODAL (রেস্তোরাঁর বিস্তারিত প্রোফাইল)   */}
      {/* ========================================================================= */}
      {selectedDetailRestaurant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-200">
            {/* Banner & Header Image */}
            <div className="relative h-44 sm:h-56 w-full bg-stone-900 shrink-0 overflow-hidden group">
              <img
                src={selectedDetailRestaurant.banner_url || selectedDetailRestaurant.photo_url}
                alt={selectedDetailRestaurant.name}
                onClick={() =>
                  setPhotoPreview({
                    url: selectedDetailRestaurant.banner_url || selectedDetailRestaurant.photo_url,
                    title: selectedDetailRestaurant.name,
                    subtitle: 'Restaurant Front & Banner Photo (ক্লিক করে বড় ছবি দেখুন)'
                  })
                }
                className="w-full h-full object-cover opacity-75 cursor-pointer hover:scale-102 transition-transform duration-300"
                title="Click to view enlarged banner photo"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

              <button
                onClick={() => setSelectedDetailRestaurant(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all cursor-pointer shadow-md"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-4 right-4 text-white flex items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className="relative shrink-0 cursor-pointer group/logo"
                    onClick={() =>
                      setPhotoPreview({
                        url: selectedDetailRestaurant.photo_url,
                        title: selectedDetailRestaurant.name,
                        subtitle: 'Restaurant Logo Photo (বড় ছবি)'
                      })
                    }
                    title="Click to view enlarged photo"
                  >
                    <img
                      src={selectedDetailRestaurant.photo_url}
                      alt={selectedDetailRestaurant.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white shadow-lg bg-white group-hover/logo:scale-105 transition-transform"
                    />
                    <span className="absolute inset-0 bg-black/30 opacity-0 group-hover/logo:opacity-100 rounded-2xl flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                      <Eye className="w-4 h-4 text-amber-300" />
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          selectedDetailRestaurant.status === 'blocked' || selectedDetailRestaurant.is_active === 0
                            ? 'bg-red-500 text-white'
                            : selectedDetailRestaurant.status === 'approved'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-amber-400 text-stone-900'
                        }`}
                      >
                        {selectedDetailRestaurant.status === 'blocked' || selectedDetailRestaurant.is_active === 0
                          ? 'Blocked 🚫'
                          : selectedDetailRestaurant.status}
                      </span>

                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          selectedDetailRestaurant.is_open === 1
                            ? 'bg-emerald-600/90 text-white'
                            : 'bg-stone-700 text-stone-300'
                        }`}
                      >
                        {selectedDetailRestaurant.is_open === 1 ? '🟢 Store Open (চালু)' : '🔴 Store Closed (বন্ধ)'}
                      </span>

                      {selectedDetailRestaurant.is_pure_veg === 1 && (
                        <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          🌱 100% Pure Veg
                        </span>
                      )}

                      {selectedDetailRestaurant.self_delivery_enabled ? (
                        <span className="bg-orange-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          🛵 Self Delivery ({selectedDetailRestaurant.self_delivery_radius_km || 3} KM)
                        </span>
                      ) : null}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                      {selectedDetailRestaurant.name}
                    </h2>
                    {selectedDetailRestaurant.name_bn && (
                      <p className="text-sm font-bold text-amber-200 font-bengali">
                        {selectedDetailRestaurant.name_bn}
                      </p>
                    )}
                    <p className="text-xs text-stone-300 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>Owner: <strong className="text-white">{selectedDetailRestaurant.owner_name}</strong></span>
                      <span>•</span>
                      <span>{selectedDetailRestaurant.phone}</span>
                      <span>•</span>
                      <span>{selectedDetailRestaurant.email}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body Content (Scrollable) */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200">
                  <div className="text-[10px] uppercase font-bold text-stone-500">Customer Rating</div>
                  <div className="text-lg font-black text-stone-900 flex items-center gap-1 mt-0.5">
                    <span className="text-amber-500">★</span>
                    <span>{selectedDetailRestaurant.rating}</span>
                    <span className="text-xs font-normal text-stone-500">({selectedDetailRestaurant.rating_count}+)</span>
                  </div>
                </div>

                <div className="bg-purple-50/60 rounded-2xl p-3 border border-purple-200">
                  <div className="text-[10px] uppercase font-bold text-purple-700">Commission Rate</div>
                  <div className="text-lg font-black text-purple-900 mt-0.5 flex items-center justify-between">
                    <span>{selectedDetailRestaurant.commission_rate}%</span>
                    <button
                      type="button"
                      onClick={() => setEditingRestCommission({
                        id: selectedDetailRestaurant.id,
                        name: selectedDetailRestaurant.name,
                        rate: selectedDetailRestaurant.commission_rate
                      })}
                      className="text-[10px] bg-purple-200 hover:bg-purple-300 text-purple-800 font-bold px-2 py-0.5 rounded-lg cursor-pointer transition-colors"
                    >
                      Edit %
                    </button>
                  </div>
                </div>

                <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200">
                  <div className="text-[10px] uppercase font-bold text-stone-500">Total Orders</div>
                  <div className="text-lg font-black text-stone-900 mt-0.5">
                    {orders.filter((o) => o.restaurant_id === selectedDetailRestaurant.id).length} Orders
                  </div>
                </div>

                <div className="bg-emerald-50/60 rounded-2xl p-3 border border-emerald-200">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">Gross Sales Value</div>
                  <div className="text-lg font-black text-emerald-900 mt-0.5">
                    ₹{orders
                      .filter((o) => o.restaurant_id === selectedDetailRestaurant.id)
                      .reduce((sum, o) => sum + Number(o.subtotal || 0), 0)
                      .toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Owner & Legal Credentials */}
              <div className="bg-stone-50 rounded-3xl p-4 sm:p-5 border border-stone-200 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="relative shrink-0 cursor-pointer group"
                      onClick={() =>
                        setPhotoPreview({
                          url: (selectedDetailRestaurant as any).owner_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
                          title: selectedDetailRestaurant.owner_name,
                          subtitle: `Owner of ${selectedDetailRestaurant.name}`
                        })
                      }
                      title="Click to view owner photo"
                    >
                      <img
                        src={(selectedDetailRestaurant as any).owner_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                        alt={selectedDetailRestaurant.owner_name}
                        className="w-12 h-12 rounded-2xl object-cover border border-stone-300 shadow-2xs group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center transition-opacity text-white text-[10px]">
                        <Eye className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-stone-400">Store Owner Profile</div>
                      <h4 className="font-extrabold text-stone-900 text-sm">{selectedDetailRestaurant.owner_name}</h4>
                      <p className="text-xs text-stone-500">{selectedDetailRestaurant.phone} • {selectedDetailRestaurant.email}</p>
                    </div>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-200">
                    Verified Merchant ✓
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-stone-400 block text-[11px] font-semibold">Registered Address</span>
                    <span className="font-bold text-stone-800 flex items-start gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                      <span>{selectedDetailRestaurant.address}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[11px] font-semibold">GPS Coordinates</span>
                    <span className="font-mono font-bold text-stone-800 mt-0.5 block">
                      Lat: {selectedDetailRestaurant.latitude}, Lng: {selectedDetailRestaurant.longitude}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[11px] font-semibold">FSSAI Food License</span>
                    <span className="font-mono font-extrabold text-stone-900 bg-white px-2 py-0.5 rounded-md border border-stone-200 inline-block mt-0.5">
                      {selectedDetailRestaurant.fssai_license || 'FSSAI-12821019000123'}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[11px] font-semibold">Trade License & GST</span>
                    <span className="font-mono font-bold text-stone-800 mt-0.5 block">
                      {(selectedDetailRestaurant as any).trade_license || 'TL-WB-2024-8891'} • {(selectedDetailRestaurant as any).gst_number || '19AAAAA0000A1Z5'}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[11px] font-semibold">Settlement Bank Account</span>
                    <span className="font-mono font-bold text-stone-800 mt-0.5 block">
                      A/C: {(selectedDetailRestaurant as any).bank_account_number || '919800001234'} (IFSC: {(selectedDetailRestaurant as any).bank_ifsc || 'HDFC0000123'})
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[11px] font-semibold">Delivery & Ordering Rules</span>
                    <span className="font-bold text-stone-800 mt-0.5 block">
                      Min Order ₹{selectedDetailRestaurant.min_order_amount} • {selectedDetailRestaurant.avg_delivery_minutes} mins prep
                      {selectedDetailRestaurant.self_delivery_enabled ? ` • Self Rider (${selectedDetailRestaurant.self_delivery_radius_km || 3}km)` : ''}
                    </span>
                  </div>
                </div>

                {selectedDetailRestaurant.cuisine_types && selectedDetailRestaurant.cuisine_types.length > 0 && (
                  <div className="pt-2 border-t border-stone-200/80">
                    <span className="text-stone-400 text-[11px] font-semibold block mb-1">Cuisines Served:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {selectedDetailRestaurant.cuisine_types.map((c, idx) => (
                        <span key={idx} className="bg-white border border-stone-200 text-stone-700 text-[11px] font-bold px-2.5 py-0.5 rounded-lg shadow-2xs">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3 Photos Auto-Slide Showcase Gallery */}
              <div className="bg-stone-50 rounded-3xl p-4 sm:p-5 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-orange-600" />
                    <span>Restaurant 3-Photo Showcase Gallery (গ্রাহক অ্যাপের স্লাইডার ছবি)</span>
                  </h4>
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                    Auto-Slides Left to Right for Customers
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {((selectedDetailRestaurant.photos && selectedDetailRestaurant.photos.length > 0)
                    ? selectedDetailRestaurant.photos
                    : [
                        selectedDetailRestaurant.photo_url || selectedDetailRestaurant.banner_url || 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600',
                        'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600',
                        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600'
                      ]
                  ).slice(0, 3).map((photoUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => setPhotoPreview({
                        url: photoUrl,
                        title: `${selectedDetailRestaurant.name} - Photo #${idx + 1}`,
                        subtitle: idx === 0 ? 'Main Banner Photo' : `Showcase Slide #${idx + 1}`
                      })}
                      className="h-32 rounded-2xl overflow-hidden bg-stone-200 border border-stone-300 relative group cursor-pointer shadow-2xs hover:border-orange-400 transition-all"
                    >
                      <img src={photoUrl} alt="Store" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <span className="absolute bottom-2 left-2 text-[10px] font-bold bg-black/60 text-white px-2 py-0.5 rounded-md">
                        Photo #{idx + 1}
                      </span>
                      <span className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center transition-opacity text-white">
                        <Eye className="w-5 h-5 text-amber-300" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payout & Banking Settlement Details */}
              <div className="bg-emerald-50/50 rounded-3xl p-4 sm:p-5 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-700" />
                    <span>Restaurant Payment Settlement Method (পেমেন্ট সেটেলমেন্ট তথ্য)</span>
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                    Method: {((selectedDetailRestaurant as any).payment_method || 'upi').toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {((selectedDetailRestaurant as any).payment_method === 'bank') ? (
                    <>
                      <div>
                        <span className="text-stone-400 block text-[11px] font-semibold">Bank Name & Holder</span>
                        <span className="font-bold text-stone-900 block mt-0.5">
                          {(selectedDetailRestaurant as any).bank_name || 'State Bank of India'} ({(selectedDetailRestaurant as any).bank_account_holder || selectedDetailRestaurant.owner_name})
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[11px] font-semibold">Account Number & IFSC</span>
                        <span className="font-mono font-extrabold text-stone-900 block mt-0.5">
                          {(selectedDetailRestaurant as any).bank_account_no || (selectedDetailRestaurant as any).bank_account_number || '38472910482'} • IFSC: {(selectedDetailRestaurant as any).bank_ifsc || 'SBIN0001420'}
                        </span>
                      </div>
                      {(selectedDetailRestaurant as any).bank_passbook_photo && (
                        <div className="sm:col-span-2 flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-emerald-200">
                          <div
                            onClick={() => setPhotoPreview({
                              url: (selectedDetailRestaurant as any).bank_passbook_photo,
                              title: `${selectedDetailRestaurant.name} - Bank Passbook`,
                              subtitle: `Account: ${(selectedDetailRestaurant as any).bank_account_no || 'Registered'}`
                            })}
                            className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 cursor-pointer relative group"
                          >
                            <img src={(selectedDetailRestaurant as any).bank_passbook_photo} alt="Passbook" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <span className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity text-white text-[9px]">
                              <Eye className="w-3.5 h-3.5 text-amber-300" />
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-stone-900 block">Bank Passbook Photo Verified ✓</span>
                            <span className="text-[11px] text-stone-500">Click preview thumbnail to inspect document</span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-stone-400 block text-[11px] font-semibold">Registered UPI ID</span>
                        <span className="font-mono font-extrabold text-emerald-900 text-sm block mt-0.5">
                          {(selectedDetailRestaurant as any).upi_id || '9800000002@upi'}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[11px] font-semibold">UPI Payment Status</span>
                        <span className="text-emerald-700 font-bold block mt-0.5">Ready for instant settlement ✓</span>
                      </div>
                      {(selectedDetailRestaurant as any).upi_qr_photo && (
                        <div className="sm:col-span-2 flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-emerald-200">
                          <div
                            onClick={() => setPhotoPreview({
                              url: (selectedDetailRestaurant as any).upi_qr_photo,
                              title: `${selectedDetailRestaurant.name} - UPI Scanner QR Code`,
                              subtitle: `UPI ID: ${(selectedDetailRestaurant as any).upi_id || 'Registered'}`
                            })}
                            className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 cursor-pointer relative group"
                          >
                            <img src={(selectedDetailRestaurant as any).upi_qr_photo} alt="UPI QR" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <span className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity text-white text-[9px]">
                              <Eye className="w-3.5 h-3.5 text-amber-300" />
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-stone-900 block">UPI Scanner QR Code Available</span>
                            <span className="text-[11px] text-stone-500">Scan QR directly from Admin panel to transfer funds</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Menu Items Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-600" />
                    <span>Restaurant Menu Items ({selectedDetailRestaurant.menu?.length || 0})</span>
                  </h4>
                  {isLoadingFullRest && (
                    <span className="text-xs text-purple-600 font-bold flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Loading full menu...</span>
                    </span>
                  )}
                </div>

                {selectedDetailRestaurant.menu && selectedDetailRestaurant.menu.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedDetailRestaurant.menu.map((food) => (
                      <div
                        key={food.id}
                        className="bg-white rounded-2xl p-3 border border-stone-200 shadow-2xs flex items-center gap-3 hover:border-purple-300 transition-colors"
                      >
                        <div
                          className="relative shrink-0 cursor-pointer group/food"
                          onClick={() =>
                            setPhotoPreview({
                              url: food.photo_url,
                              title: food.name,
                              subtitle: `${selectedDetailRestaurant.name} • ${food.category} • ₹${food.discount_price || food.price}`
                            })
                          }
                          title="Click to view food photo"
                        >
                          <img
                            src={food.photo_url}
                            alt={food.name}
                            className="w-14 h-14 rounded-xl object-cover shrink-0 border border-stone-100 group-hover/food:scale-105 transition-transform"
                          />
                          <span className="absolute inset-0 bg-black/25 opacity-0 group-hover/food:opacity-100 rounded-xl flex items-center justify-center transition-opacity text-white text-[10px]">
                            <Eye className="w-3.5 h-3.5 text-amber-300" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${food.is_veg ? 'bg-emerald-600' : 'bg-red-600'}`}
                              title={food.is_veg ? 'Veg' : 'Non-Veg'}
                            />
                            <h5 className="font-extrabold text-stone-900 text-xs truncate">
                              {food.name}
                            </h5>
                          </div>
                          <div className="text-[10px] text-stone-500 truncate mt-0.5">{food.category}</div>
                          <div className="text-xs font-black text-orange-600 font-mono mt-0.5">
                            ₹{food.discount_price || food.price}
                            {food.discount_price && (
                              <span className="text-[10px] text-stone-400 line-through font-normal ml-1">
                                ₹{food.price}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-stone-50 rounded-2xl p-6 text-center text-xs text-stone-500 border border-stone-200">
                    No menu items listed yet or loading.
                  </div>
                )}
              </div>

              {/* Recent Orders Table */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-purple-600" />
                  <span>Recent Orders from this Store</span>
                </h4>

                {orders.filter((o) => o.restaurant_id === selectedDetailRestaurant.id).length > 0 ? (
                  <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase font-bold text-[10px]">
                          <tr>
                            <th className="p-2.5">Order #</th>
                            <th className="p-2.5">Customer</th>
                            <th className="p-2.5">Status</th>
                            <th className="p-2.5">Amount</th>
                            <th className="p-2.5">Payment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {orders
                            .filter((o) => o.restaurant_id === selectedDetailRestaurant.id)
                            .slice(0, 5)
                            .map((ord) => (
                              <tr key={ord.id} className="hover:bg-stone-50/60">
                                <td className="p-2.5 font-mono font-bold text-stone-900">{ord.order_number}</td>
                                <td className="p-2.5">{ord.customer_name}</td>
                                <td className="p-2.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                      ord.status === 'delivered'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : ord.status === 'cancelled'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-orange-100 text-orange-800'
                                    }`}
                                  >
                                    {ord.status}
                                  </span>
                                </td>
                                <td className="p-2.5 font-mono font-bold text-stone-900">₹{ord.grand_total}</td>
                                <td className="p-2.5 uppercase text-stone-500 text-[10px] font-bold">{ord.payment_method}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-stone-50 rounded-2xl p-4 text-center text-xs text-stone-500 border border-stone-200">
                    No orders recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const r = selectedDetailRestaurant;
                    setSelectedDetailRestaurant(null);
                    setSelectedRestForMap(r);
                  }}
                  className="bg-white hover:bg-stone-100 text-stone-800 font-bold text-xs px-3.5 py-2 rounded-xl border border-stone-200 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-purple-600" />
                  <span>View Map Pin</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const r = selectedDetailRestaurant;
                    setSelectedDetailRestaurant(null);
                    handleOpenSendMessage('restaurant', r.id, r.name);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send Message (বার্তা পাঠান)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const r = selectedDetailRestaurant;
                    setSelectedDetailRestaurant(null);
                    setSettleRestaurantModal(r);
                    setSettleAmount('');
                    setSettleReference('');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Settle Payment (পেমেন্ট সেটেল করুন)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleRestaurantBlock(selectedDetailRestaurant.id);
                    setSelectedDetailRestaurant(null);
                  }}
                  className={`text-xs font-bold px-3.5 py-2 rounded-xl border shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all ${
                    selectedDetailRestaurant.status === 'blocked' || selectedDetailRestaurant.is_active === 0
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                      : 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{selectedDetailRestaurant.status === 'blocked' || selectedDetailRestaurant.is_active === 0 ? 'Unblock Store' : 'Block Store'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDetailRestaurant(null)}
                  className="bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DELIVERY RIDER FULL DETAILS MODAL (রাইডারের বিস্তারিত প্রোফাইল) */}
      {/* ========================================================================= */}
      {selectedDetailPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-200">
            {/* Header Hero */}
            <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-stone-900 p-5 sm:p-6 text-white relative shrink-0">
              <button
                onClick={() => setSelectedDetailPartner(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all cursor-pointer shadow-md"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 sm:gap-5">
                <div
                  className="relative shrink-0 cursor-pointer group/rider"
                  onClick={() =>
                    setPhotoPreview({
                      url: (selectedDetailPartner as any).profile_photo || selectedDetailPartner.passport_photo || (selectedDetailPartner as any).photo_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200`,
                      title: selectedDetailPartner.name,
                      subtitle: `Delivery Rider ID #${selectedDetailPartner.id} • ${selectedDetailPartner.phone}`
                    })
                  }
                  title="Click to view enlarged rider photo (বড় ছবি দেখুন)"
                >
                  <img
                    src={(selectedDetailPartner as any).profile_photo || selectedDetailPartner.passport_photo || (selectedDetailPartner as any).photo_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200`}
                    alt={selectedDetailPartner.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-4 border-white/90 shadow-xl bg-stone-800 group-hover/rider:scale-105 transition-transform"
                  />
                  <span className="absolute inset-0 bg-black/25 opacity-0 group-hover/rider:opacity-100 rounded-3xl flex items-center justify-center transition-opacity text-white">
                    <Eye className="w-5 h-5 text-emerald-300" />
                  </span>
                  <span
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      selectedDetailPartner.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-stone-400'
                    }`}
                    title={selectedDetailPartner.is_online ? 'Online' : 'Offline'}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        selectedDetailPartner.status === 'blocked' || selectedDetailPartner.is_active === 0
                          ? 'bg-red-500 text-white'
                          : selectedDetailPartner.status === 'approved'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-amber-400 text-stone-900'
                      }`}
                    >
                      {selectedDetailPartner.status === 'blocked' || selectedDetailPartner.is_active === 0
                        ? 'Blocked 🚫'
                        : selectedDetailPartner.status}
                    </span>

                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        selectedDetailPartner.is_online ? 'bg-emerald-400 text-emerald-950' : 'bg-white/20 text-stone-300'
                      }`}
                    >
                      {selectedDetailPartner.is_online ? '🟢 Live Online' : '⚪ Offline'}
                    </span>

                    <span className="text-[10px] font-bold bg-white/20 text-emerald-200 px-2 py-0.5 rounded-full uppercase">
                      ID #{selectedDetailPartner.id}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {selectedDetailPartner.name}
                  </h2>
                  <p className="text-xs text-emerald-100 flex items-center gap-2 flex-wrap">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{selectedDetailPartner.phone}</span>
                    <span>•</span>
                    <Mail className="w-3.5 h-3.5" />
                    <span>{(selectedDetailPartner as any).email || 'rider@aharlocal.com'}</span>
                    {selectedDetailPartner.gender && <span>• {selectedDetailPartner.gender}</span>}
                    {selectedDetailPartner.age && <span>• {selectedDetailPartner.age} years</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body Content (Scrollable) */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200">
                  <div className="text-[10px] uppercase font-bold text-stone-500">Total Deliveries</div>
                  <div className="text-xl font-black text-stone-900 mt-0.5 font-mono">
                    {selectedDetailPartner.total_deliveries}
                  </div>
                  <div className="text-[10px] text-stone-400">Completed jobs</div>
                </div>

                <div className="bg-amber-50/60 rounded-2xl p-3.5 border border-amber-200">
                  <div className="text-[10px] uppercase font-bold text-amber-700">Rider Rating</div>
                  <div className="text-xl font-black text-amber-900 mt-0.5 flex items-center gap-1">
                    <span className="text-amber-500">★</span>
                    <span>{selectedDetailPartner.rating}</span>
                  </div>
                  <div className="text-[10px] text-amber-600">Based on customer feedback</div>
                </div>

                <div className="bg-emerald-50/60 rounded-2xl p-3.5 border border-emerald-200">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">Wallet Balance</div>
                  <div className="text-xl font-black text-emerald-900 mt-0.5 font-mono">
                    ₹{selectedDetailPartner.wallet_balance}
                  </div>
                  <div className="text-[10px] text-emerald-600">Available earnings</div>
                </div>

                <div className="bg-teal-50/60 rounded-2xl p-3.5 border border-teal-200">
                  <div className="text-[10px] uppercase font-bold text-teal-700">Rider Payout Share</div>
                  <div className="text-xl font-black text-teal-900 mt-0.5">
                    {100 - platformSettings.delivery_partner_commission_percent}%
                  </div>
                  <div className="text-[10px] text-teal-600">Platform fee {platformSettings.delivery_partner_commission_percent}%</div>
                </div>
              </div>

              {/* Driving License & Vehicle Details */}
              <div className="bg-stone-50 rounded-3xl p-5 border border-stone-200 space-y-3">
                <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                  <Bike className="w-4 h-4 text-emerald-700" />
                  <span>Vehicle & Driver License Verification</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-stone-400 block text-[11px] font-semibold">Vehicle Type & Reg. Number</span>
                    <span className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5 mt-0.5">
                      <span>🛵 {selectedDetailPartner.vehicle_type?.toUpperCase()}</span>
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-stone-200">
                        {selectedDetailPartner.vehicle_number}
                      </span>
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[11px] font-semibold">Driving License Number</span>
                    <span className="font-mono font-extrabold text-stone-900 text-sm bg-white px-2.5 py-1 rounded border border-stone-200 inline-block mt-0.5">
                      {selectedDetailPartner.driving_license_number}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[11px] font-semibold">Aadhaar Identification</span>
                    <span className="font-mono font-bold text-stone-800 mt-0.5 block">
                      {selectedDetailPartner.aadhaar_number || (selectedDetailPartner as any).aadhaar_number || '8921-4412-9021'}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[11px] font-semibold">Residential Address</span>
                    <span className="font-bold text-stone-800 flex items-start gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                      <span>{selectedDetailPartner.address || (selectedDetailPartner as any).address || '12/C Hazra Road, South Kolkata, West Bengal 700026'}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[11px] font-semibold">Live GPS Dispatch Coordinates</span>
                    <span className="font-mono text-stone-800 mt-0.5 block">
                      {selectedDetailPartner.current_lat && selectedDetailPartner.current_lng
                        ? `Lat: ${selectedDetailPartner.current_lat}, Lng: ${selectedDetailPartner.current_lng}`
                        : 'Lat: 22.5220, Lng: 88.3490 (Stationary)'}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      Last update: {selectedDetailPartner.last_location_updated_at ? new Date(selectedDetailPartner.last_location_updated_at).toLocaleTimeString() : 'Recent'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payout & Banking Verification */}
              <div className="bg-emerald-50/50 rounded-3xl p-5 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-700" />
                    <span>Rider Payout & Settlement Methods (পেমেন্ট সেটেলমেন্ট তথ্য)</span>
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                    Method: {((selectedDetailPartner as any).payment_method || 'upi').toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  {((selectedDetailPartner as any).payment_method === 'bank') ? (
                    <>
                      <div>
                        <span className="text-stone-400 block text-[11px] font-semibold">Bank Name & Holder</span>
                        <span className="font-bold text-stone-900 block mt-0.5">
                          {(selectedDetailPartner as any).bank_name || 'State Bank of India'} ({(selectedDetailPartner as any).bank_account_holder || selectedDetailPartner.name})
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[11px] font-semibold">Account Number & IFSC</span>
                        <span className="font-mono font-extrabold text-stone-900 bg-white px-2.5 py-1 rounded border border-stone-200 inline-block mt-0.5">
                          {(selectedDetailPartner as any).bank_account_no || (selectedDetailPartner as any).bank_account_number || '919800004589'} • IFSC: {(selectedDetailPartner as any).bank_ifsc || 'SBIN0001458'}
                        </span>
                      </div>
                      {(selectedDetailPartner as any).bank_passbook_photo && (
                        <div className="sm:col-span-3 flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-emerald-200">
                          <div
                            onClick={() => setPhotoPreview({
                              url: (selectedDetailPartner as any).bank_passbook_photo,
                              title: `${selectedDetailPartner.name} - Bank Passbook`,
                              subtitle: `Account: ${(selectedDetailPartner as any).bank_account_no || 'Registered'}`
                            })}
                            className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 cursor-pointer relative group"
                          >
                            <img src={(selectedDetailPartner as any).bank_passbook_photo} alt="Passbook" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <span className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity text-white text-[9px]">
                              <Eye className="w-3.5 h-3.5 text-amber-300" />
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-stone-900 block">Bank Passbook Photo Verified ✓</span>
                            <span className="text-[11px] text-stone-500">Click preview thumbnail to inspect document</span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-stone-400 block text-[11px] font-semibold">Registered UPI ID</span>
                        <span className="font-mono font-extrabold text-emerald-900 text-sm block mt-0.5">
                          {(selectedDetailPartner as any).upi_id || `${selectedDetailPartner.phone}@upi`}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[11px] font-semibold">UPI Status</span>
                        <span className="text-emerald-700 font-bold block mt-0.5">Ready for instant settlement ✓</span>
                      </div>
                      {(selectedDetailPartner as any).upi_qr_photo && (
                        <div className="sm:col-span-3 flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-emerald-200">
                          <div
                            onClick={() => setPhotoPreview({
                              url: (selectedDetailPartner as any).upi_qr_photo,
                              title: `${selectedDetailPartner.name} - UPI Scanner QR Code`,
                              subtitle: `UPI ID: ${(selectedDetailPartner as any).upi_id || selectedDetailPartner.phone}`
                            })}
                            className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 cursor-pointer relative group"
                          >
                            <img src={(selectedDetailPartner as any).upi_qr_photo} alt="UPI QR" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <span className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity text-white text-[9px]">
                              <Eye className="w-3.5 h-3.5 text-amber-300" />
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-stone-900 block">UPI Scanner QR Code Available</span>
                            <span className="text-[11px] text-stone-500">Scan QR directly from Admin panel to transfer funds</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Recent Deliveries Completed */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-700" />
                  <span>Recent Deliveries Handled</span>
                </h4>

                {orders.filter((o) => o.delivery_partner_id === selectedDetailPartner.id).length > 0 ? (
                  <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase font-bold text-[10px]">
                          <tr>
                            <th className="p-2.5">Order #</th>
                            <th className="p-2.5">Restaurant</th>
                            <th className="p-2.5">Customer</th>
                            <th className="p-2.5">Status</th>
                            <th className="p-2.5">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {orders
                            .filter((o) => o.delivery_partner_id === selectedDetailPartner.id)
                            .slice(0, 5)
                            .map((ord) => (
                              <tr key={ord.id} className="hover:bg-stone-50/60">
                                <td className="p-2.5 font-mono font-bold text-stone-900">{ord.order_number}</td>
                                <td className="p-2.5 font-semibold text-stone-800">{ord.restaurant_name}</td>
                                <td className="p-2.5 text-stone-600">{ord.customer_name}</td>
                                <td className="p-2.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                      ord.status === 'delivered'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-orange-100 text-orange-800'
                                    }`}
                                  >
                                    {ord.status}
                                  </span>
                                </td>
                                <td className="p-2.5 font-mono font-bold text-stone-900">₹{ord.grand_total}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-stone-50 rounded-2xl p-4 text-center text-xs text-stone-500 border border-stone-200">
                    No active deliveries in record.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const dp = selectedDetailPartner;
                    setSelectedDetailPartner(null);
                    handleOpenSendMessage('delivery', dp.id, dp.name);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send Direct Message (বার্তা পাঠান)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const dp = selectedDetailPartner;
                    setSelectedDetailPartner(null);
                    setSettlePartnerModal(dp);
                    setSettleAmount('');
                    setSettleReference('');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Settle Payment (পেমেন্ট সেটেল করুন)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedDetailPartner.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdatePartnerStatus(selectedDetailPartner.id, 'rejected');
                        setSelectedDetailPartner(null);
                      }}
                      className="bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold px-3 py-2 rounded-xl border border-red-200 cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdatePartnerStatus(selectedDetailPartner.id, 'approved');
                        setSelectedDetailPartner(null);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs cursor-pointer"
                    >
                      Approve Rider ✓
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleTogglePartnerBlock(selectedDetailPartner.id);
                      setSelectedDetailPartner(null);
                    }}
                    className={`text-xs font-bold px-3.5 py-2 rounded-xl border shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all ${
                      selectedDetailPartner.status === 'blocked' || selectedDetailPartner.is_active === 0
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                        : 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{selectedDetailPartner.status === 'blocked' || selectedDetailPartner.is_active === 0 ? 'Unblock Rider' : 'Block Rider'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedDetailPartner(null)}
                  className="bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CUSTOMER FULL DETAILS MODAL (কাস্টমারের বিস্তারিত প্রোফাইল)     */}
      {/* ========================================================================= */}
      {selectedDetailCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-200">
            {/* Header Hero */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-stone-900 p-5 sm:p-6 text-white relative shrink-0">
              <button
                onClick={() => setSelectedDetailCustomer(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all cursor-pointer shadow-md"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 sm:gap-5">
                <div
                  className="relative shrink-0 cursor-pointer group/cust"
                  onClick={() =>
                    setPhotoPreview({
                      url: selectedDetailCustomer.profile_photo || selectedDetailCustomer.passport_photo || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200`,
                      title: selectedDetailCustomer.name,
                      subtitle: `Customer ID #${selectedDetailCustomer.id} • ${selectedDetailCustomer.phone}`
                    })
                  }
                  title="Click to view enlarged customer photo (বড় ছবি দেখুন)"
                >
                  <img
                    src={selectedDetailCustomer.profile_photo || selectedDetailCustomer.passport_photo || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200`}
                    alt={selectedDetailCustomer.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-4 border-white/90 shadow-xl bg-stone-800 group-hover/cust:scale-105 transition-transform"
                  />
                  <span className="absolute inset-0 bg-black/25 opacity-0 group-hover/cust:opacity-100 rounded-3xl flex items-center justify-center transition-opacity text-white">
                    <Eye className="w-5 h-5 text-purple-300" />
                  </span>
                  <span
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      selectedDetailCustomer.is_active === 0 ? 'bg-red-500' : 'bg-emerald-400'
                    }`}
                    title={selectedDetailCustomer.is_active === 0 ? 'Blocked' : 'Active'}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        selectedDetailCustomer.is_active === 0
                          ? 'bg-red-500 text-white'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {selectedDetailCustomer.is_active === 0 ? 'Account Blocked 🚫' : 'Active Account ✓'}
                    </span>

                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        selectedDetailCustomer.cod_enabled
                          ? 'bg-emerald-400 text-emerald-950'
                          : 'bg-stone-700 text-stone-200'
                      }`}
                    >
                      {selectedDetailCustomer.cod_enabled ? 'COD Whitelisted ✓' : 'Prepaid Only'}
                    </span>

                    <span className="text-[10px] font-bold bg-white/20 text-purple-200 px-2 py-0.5 rounded-full uppercase">
                      Cust ID #{selectedDetailCustomer.id}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {selectedDetailCustomer.name}
                  </h2>
                  <p className="text-xs text-purple-200 flex items-center gap-2 flex-wrap">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{selectedDetailCustomer.phone}</span>
                    <span>•</span>
                    <Mail className="w-3.5 h-3.5" />
                    <span>{selectedDetailCustomer.email}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body Content (Scrollable) */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200">
                  <div className="text-[10px] uppercase font-bold text-stone-500">Orders Placed</div>
                  <div className="text-xl font-black text-stone-900 mt-0.5 font-mono">
                    {orders.filter((o) => o.customer_id === selectedDetailCustomer.id).length || selectedDetailCustomer.total_orders}
                  </div>
                  <div className="text-[10px] text-stone-400">Lifetime orders</div>
                </div>

                <div className="bg-purple-50/60 rounded-2xl p-3.5 border border-purple-200">
                  <div className="text-[10px] uppercase font-bold text-purple-700">Total Spent</div>
                  <div className="text-xl font-black text-purple-900 mt-0.5 font-mono">
                    ₹{orders
                      .filter((o) => o.customer_id === selectedDetailCustomer.id)
                      .reduce((sum, o) => sum + Number(o.grand_total || 0), 0)
                      .toLocaleString()}
                  </div>
                  <div className="text-[10px] text-purple-600">Gross order value</div>
                </div>

                <div className="bg-emerald-50/60 rounded-2xl p-3.5 border border-emerald-200">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">COD Permission</div>
                  <div className="text-base font-extrabold text-emerald-900 mt-0.5">
                    {selectedDetailCustomer.cod_enabled ? 'Allowed (চালু)' : 'Prepaid Only (বন্ধ)'}
                  </div>
                  <div className="text-[10px] text-emerald-600">Cash on delivery access</div>
                </div>

                <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200">
                  <div className="text-[10px] uppercase font-bold text-stone-500">Member Since</div>
                  <div className="text-sm font-black text-stone-800 mt-1">
                    {selectedDetailCustomer.created_at ? new Date(selectedDetailCustomer.created_at).toLocaleDateString() : 'Active Member'}
                  </div>
                  <div className="text-[10px] text-stone-400">Account status active</div>
                </div>
              </div>

              {/* Personal Profile & Address Details */}
              <div className="bg-stone-50 rounded-3xl p-5 border border-stone-200 space-y-3">
                <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-700" />
                  <span>Customer Profile & Address</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-stone-400 block text-[11px] font-semibold">Primary Address</span>
                    <span className="font-bold text-stone-800 flex items-start gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                      <span>{selectedDetailCustomer.address || 'Flat 3B, Sunshine Heights, 14 Ballygunge Circular Road, Kolkata 700019'}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[11px] font-semibold">Personal Details</span>
                    <span className="font-medium text-stone-800 mt-0.5 block">
                      Gender: <strong>{selectedDetailCustomer.gender || 'Not specified'}</strong>
                      {selectedDetailCustomer.dob ? ` • DOB: ${selectedDetailCustomer.dob}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Refund & Payment Details */}
              <div className="bg-emerald-50/50 rounded-3xl p-5 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-700" />
                    <span>Customer Refund & Payment Method (রিফান্ড পাওয়ার তথ্য)</span>
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                    Method: {((selectedDetailCustomer as any).payment_method || 'upi').toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {((selectedDetailCustomer as any).payment_method === 'bank') ? (
                    <>
                      <div>
                        <span className="text-stone-400 block text-[11px] font-semibold">Bank Name & Holder</span>
                        <span className="font-bold text-stone-900 block mt-0.5">
                          {(selectedDetailCustomer as any).bank_name || 'State Bank of India'} ({(selectedDetailCustomer as any).bank_account_holder || selectedDetailCustomer.name})
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[11px] font-semibold">Account Number & IFSC</span>
                        <span className="font-mono font-extrabold text-stone-900 block mt-0.5">
                          {(selectedDetailCustomer as any).bank_account_no || '919800001420'} • IFSC: {(selectedDetailCustomer as any).bank_ifsc || 'SBIN0001420'}
                        </span>
                      </div>
                      {(selectedDetailCustomer as any).bank_passbook_photo && (
                        <div className="sm:col-span-2 flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-emerald-200">
                          <div
                            onClick={() => setPhotoPreview({
                              url: (selectedDetailCustomer as any).bank_passbook_photo,
                              title: `${selectedDetailCustomer.name} - Bank Passbook`,
                              subtitle: `Account: ${(selectedDetailCustomer as any).bank_account_no || 'Registered'}`
                            })}
                            className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 cursor-pointer relative group"
                          >
                            <img src={(selectedDetailCustomer as any).bank_passbook_photo} alt="Passbook" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <span className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity text-white text-[9px]">
                              <Eye className="w-3.5 h-3.5 text-amber-300" />
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-stone-900 block">Bank Passbook Photo Available</span>
                            <span className="text-[11px] text-stone-500">Click preview thumbnail to inspect document</span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-stone-400 block text-[11px] font-semibold">Registered UPI ID</span>
                        <span className="font-mono font-extrabold text-emerald-900 text-sm block mt-0.5">
                          {(selectedDetailCustomer as any).upi_id || `${selectedDetailCustomer.phone}@upi`}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[11px] font-semibold">UPI Status</span>
                        <span className="text-emerald-700 font-bold block mt-0.5">Ready for instant refund transfer ✓</span>
                      </div>
                      {(selectedDetailCustomer as any).upi_qr_photo && (
                        <div className="sm:col-span-2 flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-emerald-200">
                          <div
                            onClick={() => setPhotoPreview({
                              url: (selectedDetailCustomer as any).upi_qr_photo,
                              title: `${selectedDetailCustomer.name} - UPI Scanner QR Code`,
                              subtitle: `UPI ID: ${(selectedDetailCustomer as any).upi_id || selectedDetailCustomer.phone}`
                            })}
                            className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 cursor-pointer relative group"
                          >
                            <img src={(selectedDetailCustomer as any).upi_qr_photo} alt="UPI QR" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <span className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity text-white text-[9px]">
                              <Eye className="w-3.5 h-3.5 text-amber-300" />
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-stone-900 block">UPI Scanner QR Code Available</span>
                            <span className="text-[11px] text-stone-500">Scan QR directly from Admin panel to refund funds</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Full Orders History */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-700" />
                  <span>Customer Orders History</span>
                </h4>

                {orders.filter((o) => o.customer_id === selectedDetailCustomer.id).length > 0 ? (
                  <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase font-bold text-[10px]">
                          <tr>
                            <th className="p-2.5">Order #</th>
                            <th className="p-2.5">Restaurant</th>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Status</th>
                            <th className="p-2.5">Total</th>
                            <th className="p-2.5">Payment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {orders
                            .filter((o) => o.customer_id === selectedDetailCustomer.id)
                            .map((ord) => (
                              <tr key={ord.id} className="hover:bg-stone-50/60">
                                <td className="p-2.5 font-mono font-bold text-stone-900">{ord.order_number}</td>
                                <td className="p-2.5 font-semibold text-stone-800">{ord.restaurant_name}</td>
                                <td className="p-2.5 text-stone-500 text-[11px]">
                                  {new Date(ord.created_at || ord.placed_at || Date.now()).toLocaleDateString()}
                                </td>
                                <td className="p-2.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                      ord.status === 'delivered'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : ord.status === 'cancelled'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-orange-100 text-orange-800'
                                    }`}
                                  >
                                    {ord.status}
                                  </span>
                                </td>
                                <td className="p-2.5 font-mono font-bold text-stone-900">₹{ord.grand_total}</td>
                                <td className="p-2.5 uppercase text-stone-500 text-[10px] font-bold">{ord.payment_method}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-stone-50 rounded-2xl p-4 text-center text-xs text-stone-500 border border-stone-200">
                    No orders placed yet.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleCustomerCod(selectedDetailCustomer.id, selectedDetailCustomer.cod_enabled);
                    setSelectedDetailCustomer((prev: any) => prev ? { ...prev, cod_enabled: !prev.cod_enabled } : null);
                  }}
                  className={`text-xs font-black px-4 py-2 rounded-xl transition-all whitespace-nowrap shadow-2xs cursor-pointer ${
                    selectedDetailCustomer.cod_enabled
                      ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {selectedDetailCustomer.cod_enabled ? 'Revoke COD Access' : 'Enable COD Access (অনুমোদন দিন) ✓'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const c = selectedDetailCustomer;
                    setSelectedDetailCustomer(null);
                    handleOpenSendMessage('customer', c.id, c.name);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send Message (বার্তা পাঠান)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const c = selectedDetailCustomer;
                    setSelectedDetailCustomer(null);
                    setRefundCustomerModal(c);
                    setSettleAmount('');
                    setSettleReference('');
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Issue Refund (রিফান্ড পাঠান)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleCustomerBlock(selectedDetailCustomer.id);
                    setSelectedDetailCustomer(null);
                  }}
                  className={`text-xs font-bold px-3.5 py-2 rounded-xl border shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all ${
                    selectedDetailCustomer.is_active === 0
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                      : 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{selectedDetailCustomer.is_active === 0 ? 'Unblock Customer' : 'Block Customer'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDetailCustomer(null)}
                  className="bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE NEW SERVICE AREA BOUNDARY MODAL (নতুন সার্ভিস এরিয়া বাউন্ডারি)       */}
      {/* ========================================================================= */}
      {isCreatingServiceArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 overflow-y-auto space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Plus className="w-4 h-4" />
                  </span>
                  <h3 className="font-extrabold text-stone-900 text-base sm:text-lg">
                    Add New Service Area Boundary (নতুন সার্ভিস এরিয়া বাউন্ডারি)
                  </h3>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  লোকেশন টাইপ করুন বা ম্যাপের পিন টেনে ও ব্যাসার্ধ (Radius) সিলেক্ট করে বাউন্ডারি তৈরি করুন।
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreatingServiceArea(false)}
                className="text-stone-400 hover:text-stone-700 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateServiceAreaSubmit} className="space-y-4">
              {/* Error Alert */}
              {createModalError && (
                <div className="bg-red-50 border border-red-300 text-red-800 px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{createModalError}</span>
                  </div>
                  <button type="button" onClick={() => setCreateModalError(null)} className="text-red-500 hover:text-red-700">✕</button>
                </div>
              )}

              {/* Name & Pricing Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Service Area Name (English) *
                  </label>
                  <input
                    type="text"
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    placeholder="e.g. Raidighi Bazaar & Town Zone"
                    required
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Service Area Name (বাংলা নাম)
                  </label>
                  <input
                    type="text"
                    value={newAreaNameBn}
                    onChange={(e) => setNewAreaNameBn(e.target.value)}
                    placeholder="e.g. রায়দিঘি বাজার ও শহর সার্ভিস এরিয়া"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Base Delivery Charge (বেস ডেলিভারি চার্জ ₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={newAreaMinCharge}
                    onChange={(e) => setNewAreaMinCharge(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Per-KM Delivery Charge (প্রতি কিমি রেট ₹/কিমি)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newAreaPerKmCharge}
                    onChange={(e) => setNewAreaPerKmCharge(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Manual Center Location & Radius Selection Tool */}
              <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-purple-200/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                      <Compass className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="font-extrabold text-xs text-purple-950">
                        Manual Location Coordinates & Radius (লোকেশন টাইপ ও পিন মুভ টুল)
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        অক্ষাংশ ও দ্রাঘিমাংশ টাইপ করুন অথবা নিচে ম্যাপে পিনটি টেনে নির্দিষ্ট স্থানে বসান।
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-purple-700 font-mono font-bold bg-purple-100 px-2.5 py-1 rounded-lg self-start sm:self-auto border border-purple-200">
                    Live Radius Generator
                  </span>
                </div>

                {/* Info Tip Banner */}
                <div className="bg-white/80 p-2.5 rounded-xl border border-purple-200/70 text-[11px] text-stone-700 flex items-start gap-2">
                  <span className="text-purple-600 text-xs">💡</span>
                  <div>
                    <strong>টিপস:</strong> আপনি নিচে অক্ষাংশ ও দ্রাঘিমাংশ সরাসরি টাইপ করতে পারেন, অথবা ম্যাপের যেকোনো জায়গায় ক্লিক করুন কিংবা লাল সেন্টার পিনটি (📍) ড্র্যাগ করে নির্দিষ্ট বাজার বা এলাকায় সেট করুন।
                  </div>
                </div>

                {/* Inputs for Lat, Lng & Radius */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-stone-700 font-bold block mb-1">
                      Center Latitude (কেন্দ্রবিন্দু অক্ষাংশ) *
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={radiusCenterLat}
                      onChange={(e) => {
                        const newLat = Number(e.target.value);
                        handleUpdateNewAreaCenter(newLat, radiusCenterLng, radiusDistanceKm, polygonVertexCount);
                      }}
                      placeholder="e.g. 21.9212"
                      required
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 font-mono text-xs font-bold text-stone-900 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-700 font-bold block mb-1">
                      Center Longitude (কেন্দ্রবিন্দু দ্রাঘিমাংশ) *
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={radiusCenterLng}
                      onChange={(e) => {
                        const newLng = Number(e.target.value);
                        handleUpdateNewAreaCenter(radiusCenterLat, newLng, radiusDistanceKm, polygonVertexCount);
                      }}
                      placeholder="e.g. 88.4350"
                      required
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 font-mono text-xs font-bold text-stone-900 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] text-stone-700 font-bold">
                        Coverage Radius (কভারেজ ব্যাসার্ধ)
                      </label>
                      <span className="font-mono font-black text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                        {radiusDistanceKm} km
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0.5"
                      max="50"
                      step="0.5"
                      value={radiusDistanceKm}
                      onChange={(e) => {
                        const newRad = Number(e.target.value);
                        handleUpdateNewAreaCenter(radiusCenterLat, radiusCenterLng, newRad, polygonVertexCount);
                      }}
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 font-mono text-xs font-bold text-stone-900 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>
                </div>

                {/* Radius Slider & Quick Distance Chips & Vertex selector */}
                <div className="space-y-2.5 bg-white/80 p-3 rounded-xl border border-purple-100">
                  <div className="flex justify-between items-center text-[11px] font-bold text-stone-600">
                    <span>Adjust Coverage Radius Slider (ব্যাসার্ধ স্লাইডার):</span>
                    <span className="font-mono text-purple-700 font-black">
                      {radiusDistanceKm} km radius (~{Math.round(Math.PI * radiusDistanceKm * radiusDistanceKm)} sq km coverage)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="0.5"
                    value={radiusDistanceKm}
                    onChange={(e) => {
                      const newRad = Number(e.target.value);
                      handleUpdateNewAreaCenter(radiusCenterLat, radiusCenterLng, newRad, polygonVertexCount);
                    }}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-stone-500 font-bold">Quick Radius:</span>
                    {[2, 3, 4, 5, 8, 10, 15, 20].map((km) => (
                      <button
                        key={km}
                        type="button"
                        onClick={() => {
                          handleUpdateNewAreaCenter(radiusCenterLat, radiusCenterLng, km, polygonVertexCount);
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                          radiusDistanceKm === km
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : 'bg-white hover:bg-purple-50 text-stone-700 border-stone-200'
                        }`}
                      >
                        {km} km
                      </button>
                    ))}

                    <div className="ml-auto flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-stone-500 font-bold">Polygon Points:</span>
                      {[4, 5, 8, 12, 16].map((ptsCount) => (
                        <button
                          key={ptsCount}
                          type="button"
                          onClick={() => {
                            setPolygonVertexCount(ptsCount);
                            handleUpdateNewAreaCenter(radiusCenterLat, radiusCenterLng, radiusDistanceKm, ptsCount);
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                            newAreaPoints.length === ptsCount
                              ? 'bg-purple-700 text-white border-purple-700 shadow-2xs font-extrabold'
                              : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                          }`}
                        >
                          {ptsCount} pts
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Live Map Preview with Draggable Pin, Draggable Vertices & Connected Polygon Shape */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-stone-800 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-purple-600" />
                      <span>Service Boundary Shape & Geofence (বাউন্ডারি শেপ ডিজাইন):</span>
                    </span>
                    <span className="text-[10px] text-purple-800 font-black bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-300">
                      {newAreaPoints.length} Points Connected
                    </span>
                  </div>

                  {/* Draw / Drag Mode Selector */}
                  <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
                    <button
                      type="button"
                      onClick={() => setCreateInteractionMode('drag')}
                      className={`text-[11px] font-extrabold px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        createInteractionMode === 'drag'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <span>✋ Drag & Move (পয়েন্ট ড্র্যাগ)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateInteractionMode('click_add')}
                      className={`text-[11px] font-extrabold px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        createInteractionMode === 'click_add'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <span>➕ Click Map to Add (ক্লিক করে নতুন পয়েন্ট)</span>
                    </button>
                  </div>
                </div>

                <div className="bg-purple-50/70 border border-purple-200 rounded-xl px-3 py-2 text-[11px] text-purple-950 font-medium flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-purple-700">🎨 Custom Polygon Shape:</span>
                    <span>
                      {createInteractionMode === 'click_add'
                        ? 'ম্যাপে যেখানেই ক্লিক করবেন সাথে সাথে নতুন পয়েন্ট যুক্ত হয়ে শেপ তৈরি হবে।'
                        : 'পয়েন্টগুলো ড্র্যাগ করে আপনার পছন্দের যে কোনো আঁকাবাঁকা সার্ভিস এরিয়া বাউন্ডারি বানিয়ে নিন।'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setNewAreaPoints([])}
                      className="text-[10px] bg-white text-red-600 hover:bg-red-50 border border-red-200 px-2 py-0.5 rounded-md font-bold cursor-pointer"
                    >
                      Clear All (সব মুছুন)
                    </button>
                  </div>
                </div>

                <div className="h-72 sm:h-80 w-full rounded-2xl overflow-hidden border-2 border-purple-500 relative shadow-inner">
                  <Map
                    defaultCenter={{
                      lat: radiusCenterLat,
                      lng: radiusCenterLng
                    }}
                    center={{
                      lat: radiusCenterLat,
                      lng: radiusCenterLng
                    }}
                    defaultZoom={12}
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    className="w-full h-full"
                    onClick={(e: any) => {
                      const coords = e.detail?.latLng || e.latLng;
                      if (coords) {
                        const lat = typeof coords.lat === 'function' ? coords.lat() : coords.lat;
                        const lng = typeof coords.lng === 'function' ? coords.lng() : coords.lng;
                        if (typeof lat === 'number' && typeof lng === 'number') {
                          if (createInteractionMode === 'click_add') {
                            const newPt = { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) };
                            setNewAreaPoints([...newAreaPoints, newPt]);
                          } else {
                            handleUpdateNewAreaCenter(lat, lng, radiusDistanceKm, newAreaPoints.length || polygonVertexCount);
                          }
                        }
                      }
                    }}
                  >
                    {/* Connected Translucent Geofence Polygon Overlay */}
                    {newAreaPoints && newAreaPoints.length >= 3 && (
                      <MapPolygonOverlay
                        paths={newAreaPoints}
                        strokeColor="#7c3aed"
                        fillColor="#a855f7"
                      />
                    )}

                    {/* Draggable Center Pin */}
                    <AdvancedMarker
                      position={{ lat: radiusCenterLat, lng: radiusCenterLng }}
                      draggable={true}
                      onDragEnd={(e: any) => {
                        const coords = e.latLng || e.detail?.latLng;
                        if (coords) {
                          const lat = typeof coords.lat === 'function' ? coords.lat() : coords.lat;
                          const lng = typeof coords.lng === 'function' ? coords.lng() : coords.lng;
                          if (typeof lat === 'number' && typeof lng === 'number') {
                            handleUpdateNewAreaCenter(lat, lng, radiusDistanceKm, newAreaPoints.length || polygonVertexCount);
                          }
                        }
                      }}
                    >
                      <div className="flex flex-col items-center cursor-grab active:cursor-grabbing">
                        <div className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-white whitespace-nowrap mb-0.5">
                          📍 Center Pin (সেন্টার)
                        </div>
                        <div className="w-5 h-5 rounded-full bg-red-600 border-2 border-white shadow-xl flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        </div>
                      </div>
                    </AdvancedMarker>

                    {/* DRAGGABLE Polygon Boundary Vertex Markers */}
                    {newAreaPoints.map((pt, idx) => (
                      <AdvancedMarker
                        key={`new-pt-${idx}`}
                        position={pt}
                        draggable={true}
                        onDragEnd={(e: any) => {
                          const coords = e.latLng || e.detail?.latLng;
                          if (coords) {
                            const lat = typeof coords.lat === 'function' ? coords.lat() : coords.lat;
                            const lng = typeof coords.lng === 'function' ? coords.lng() : coords.lng;
                            if (typeof lat === 'number' && typeof lng === 'number') {
                              const updated = [...newAreaPoints];
                              updated[idx] = { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) };
                              setNewAreaPoints(updated);
                            }
                          }
                        }}
                      >
                        <div className="flex flex-col items-center cursor-grab active:cursor-grabbing group hover:scale-125 transition-transform">
                          <div className="bg-purple-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-md border border-white whitespace-nowrap mb-0.5">
                            P{idx + 1}
                          </div>
                          <div className="w-6 h-6 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-mono text-[10px] font-black flex items-center justify-center ring-2 ring-white shadow-md">
                            {idx + 1}
                          </div>
                        </div>
                      </AdvancedMarker>
                    ))}
                  </Map>
                </div>
              </div>

              {/* Editable Coordinates List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-stone-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-600" />
                    <span>Boundary Polygon Vertices ({newAreaPoints.length} Points)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const last = newAreaPoints[newAreaPoints.length - 1] || { lat: 21.9212, lng: 88.4350 };
                      setNewAreaPoints([...newAreaPoints, { lat: last.lat + 0.005, lng: last.lng + 0.005 }]);
                    }}
                    className="text-xs text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Coordinate Point</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {newAreaPoints.map((pt, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-stone-50 p-2 rounded-xl border border-stone-200">
                      <span className="w-6 h-6 rounded-md bg-purple-600 text-white font-mono text-[10px] font-black flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="number"
                        step="0.0001"
                        value={pt.lat}
                        onChange={(e) => {
                          const updated = [...newAreaPoints];
                          updated[idx].lat = Number(e.target.value);
                          setNewAreaPoints(updated);
                        }}
                        placeholder="Lat"
                        className="w-full bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                      />
                      <input
                        type="number"
                        step="0.0001"
                        value={pt.lng}
                        onChange={(e) => {
                          const updated = [...newAreaPoints];
                          updated[idx].lng = Number(e.target.value);
                          setNewAreaPoints(updated);
                        }}
                        placeholder="Lng"
                        className="w-full bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                      />
                      {newAreaPoints.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setNewAreaPoints(newAreaPoints.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove Point"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCreatingServiceArea(false)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingArea}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingArea ? 'Saving Boundary...' : 'Save Service Area (বাউন্ডারি তৈরি করুন)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT EXISTING SERVICE AREA BOUNDARY MODAL (বাউন্ডারি এডিট করুন)           */}
      {/* ========================================================================= */}
      {editingServiceArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 overflow-y-auto space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Edit3 className="w-4 h-4" />
                  </span>
                  <h3 className="font-extrabold text-stone-900 text-base sm:text-lg">
                    Edit Boundary: {editingServiceArea.name}
                  </h3>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Update coverage boundaries, delivery charges, or polygon coordinates.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingServiceArea(null)}
                className="text-stone-400 hover:text-stone-700 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateServiceAreaSubmit} className="space-y-4">
              {/* Error Alert */}
              {editModalError && (
                <div className="bg-red-50 border border-red-300 text-red-800 px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{editModalError}</span>
                  </div>
                  <button type="button" onClick={() => setEditModalError(null)} className="text-red-500 hover:text-red-700">✕</button>
                </div>
              )}

              {/* Name & Pricing Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Service Area Name (English) *
                  </label>
                  <input
                    type="text"
                    value={editingServiceArea.name}
                    onChange={(e) => setEditingServiceArea({ ...editingServiceArea, name: e.target.value })}
                    required
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Service Area Name (বাংলা নাম)
                  </label>
                  <input
                    type="text"
                    value={editingServiceArea.name_bn || ''}
                    onChange={(e) => setEditingServiceArea({ ...editingServiceArea, name_bn: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Base Delivery Charge (বেস চার্জ ₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={editingServiceArea.min_delivery_charge}
                    onChange={(e) =>
                      setEditingServiceArea({
                        ...editingServiceArea,
                        min_delivery_charge: Number(e.target.value)
                      })
                    }
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Per-KM Delivery Charge (প্রতি কিমি রেট ₹/কিমি)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingServiceArea.per_km_charge}
                    onChange={(e) =>
                      setEditingServiceArea({
                        ...editingServiceArea,
                        per_km_charge: Number(e.target.value)
                      })
                    }
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Status Checkbox */}
              <div className="flex items-center gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <input
                  type="checkbox"
                  id="editAreaActive"
                  checked={Boolean(editingServiceArea.is_active)}
                  onChange={(e) =>
                    setEditingServiceArea({
                      ...editingServiceArea,
                      is_active: e.target.checked ? 1 : 0
                    })
                  }
                  className="w-4 h-4 accent-purple-600 cursor-pointer"
                />
                <label htmlFor="editAreaActive" className="text-xs font-bold text-stone-800 cursor-pointer">
                  Service Area Active (সক্রিয় সার্ভিস এরিয়া - গ্রাহক এখান থেকে অর্ডার করতে পারবেন)
                </label>
              </div>

              {/* Center & Radius Generator Tool */}
              <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-stone-800 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-purple-600" />
                    <span>Recalculate Circular Radius (নতুন কেন্দ্র ও ব্যাসার্ধ থেকে বাউন্ডারি)</span>
                  </h4>
                  <span className="text-[10px] text-stone-500 font-mono">12 Vertices</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <label className="text-[11px] text-stone-600 font-bold block mb-1">Center Latitude:</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={radiusCenterLat}
                      onChange={(e) => setRadiusCenterLat(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-600 font-bold block mb-1">Center Longitude:</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={radiusCenterLng}
                      onChange={(e) => setRadiusCenterLng(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-600 font-bold block mb-1">Coverage Radius (কিমি):</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      step="0.5"
                      value={radiusDistanceKm}
                      onChange={(e) => setRadiusDistanceKm(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 font-mono text-xs font-bold"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const generated = generateRadiusPolygon(radiusCenterLat, radiusCenterLng, radiusDistanceKm, 12);
                    setEditingServiceArea({
                      ...editingServiceArea,
                      polygon: generated
                    });
                  }}
                  className="bg-stone-900 hover:bg-black text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Generate Boundary Polygon ({radiusDistanceKm} km Radius from Center)</span>
                </button>
              </div>

              {/* Editable Coordinates List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-stone-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-600" />
                    <span>Boundary Polygon Vertices ({editingServiceArea.polygon.length} Points)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const last = editingServiceArea.polygon[editingServiceArea.polygon.length - 1] || { lat: 21.9212, lng: 88.4350 };
                      setEditingServiceArea({
                        ...editingServiceArea,
                        polygon: [...editingServiceArea.polygon, { lat: last.lat + 0.005, lng: last.lng + 0.005 }]
                      });
                    }}
                    className="text-xs text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Coordinate Point</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {editingServiceArea.polygon.map((pt, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-stone-50 p-2 rounded-xl border border-stone-200">
                      <span className="w-6 h-6 rounded-md bg-purple-600 text-white font-mono text-[10px] font-black flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="number"
                        step="0.0001"
                        value={pt.lat}
                        onChange={(e) => {
                          const updated = [...editingServiceArea.polygon];
                          updated[idx].lat = Number(e.target.value);
                          setEditingServiceArea({ ...editingServiceArea, polygon: updated });
                        }}
                        placeholder="Lat"
                        className="w-full bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                      />
                      <input
                        type="number"
                        step="0.0001"
                        value={pt.lng}
                        onChange={(e) => {
                          const updated = [...editingServiceArea.polygon];
                          updated[idx].lng = Number(e.target.value);
                          setEditingServiceArea({ ...editingServiceArea, polygon: updated });
                        }}
                        placeholder="Lng"
                        className="w-full bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                      />
                      {editingServiceArea.polygon.length > 3 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editingServiceArea.polygon.filter((_, i) => i !== idx);
                            setEditingServiceArea({ ...editingServiceArea, polygon: updated });
                          }}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          title="Remove Point"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Map Preview of Polygon with Connected Overlay & Drawing Tools */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-stone-800 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-purple-600" />
                      <span>Live Boundary Shape & Geofence (বাউন্ডারি পরিবর্তন করুন):</span>
                    </span>
                    <span className="text-[10px] text-purple-800 font-black bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-300">
                      {editingServiceArea.polygon.length} Points Connected
                    </span>
                  </div>

                  {/* Edit Draw / Drag Mode Selector */}
                  <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
                    <button
                      type="button"
                      onClick={() => setEditInteractionMode('drag')}
                      className={`text-[11px] font-extrabold px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        editInteractionMode === 'drag'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <span>✋ Drag & Move (পয়েন্ট ড্র্যাগ)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditInteractionMode('click_add')}
                      className={`text-[11px] font-extrabold px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        editInteractionMode === 'click_add'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <span>➕ Click Map to Add (ম্যাপে ক্লিক করে নতুন পয়েন্ট)</span>
                    </button>
                  </div>
                </div>

                <div className="bg-purple-50/70 border border-purple-200 rounded-xl px-3 py-2 text-[11px] text-purple-950 font-medium flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-purple-700">🎨 Connected Geofence:</span>
                    <span>
                      {editInteractionMode === 'click_add'
                        ? 'ম্যাপে যেখানেই ক্লিক করবেন সাথে সাথে নতুন পয়েন্ট যুক্ত হয়ে বাউন্ডারি বর্ধিত হবে।'
                        : 'পয়েন্টগুলো চেপে ধরে যে কোনো স্থানে নিয়ে গিয়ে বাউন্ডারিকে বড়/ছোট বা কাস্টমাইজ করুন।'}
                    </span>
                  </div>
                </div>

                <div className="h-72 sm:h-80 w-full rounded-2xl overflow-hidden border-2 border-purple-500 relative shadow-inner">
                  <Map
                    defaultCenter={{
                      lat: editingServiceArea.polygon[0]?.lat || 21.9212,
                      lng: editingServiceArea.polygon[0]?.lng || 88.4350
                    }}
                    defaultZoom={12}
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    className="w-full h-full"
                    onClick={(e: any) => {
                      if (editInteractionMode === 'click_add') {
                        const coords = e.detail?.latLng || e.latLng;
                        if (coords) {
                          const lat = typeof coords.lat === 'function' ? coords.lat() : coords.lat;
                          const lng = typeof coords.lng === 'function' ? coords.lng() : coords.lng;
                          if (typeof lat === 'number' && typeof lng === 'number') {
                            const newPt = { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) };
                            setEditingServiceArea({
                              ...editingServiceArea,
                              polygon: [...editingServiceArea.polygon, newPt]
                            });
                          }
                        }
                      }
                    }}
                  >
                    {/* Connected Translucent Geofence Polygon Overlay */}
                    {editingServiceArea.polygon && editingServiceArea.polygon.length >= 3 && (
                      <MapPolygonOverlay
                        paths={editingServiceArea.polygon}
                        strokeColor="#7c3aed"
                        fillColor="#a855f7"
                      />
                    )}

                    {editingServiceArea.polygon.map((pt, idx) => (
                      <AdvancedMarker
                        key={`edit-pt-${idx}`}
                        position={pt}
                        draggable={true}
                        onDragEnd={(e: any) => {
                          const coords = e.latLng || e.detail?.latLng;
                          if (coords) {
                            const lat = typeof coords.lat === 'function' ? coords.lat() : coords.lat;
                            const lng = typeof coords.lng === 'function' ? coords.lng() : coords.lng;
                            if (typeof lat === 'number' && typeof lng === 'number') {
                              const updated = [...editingServiceArea.polygon];
                              updated[idx] = { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) };
                              setEditingServiceArea({ ...editingServiceArea, polygon: updated });
                            }
                          }
                        }}
                      >
                        <div className="flex flex-col items-center cursor-grab active:cursor-grabbing group hover:scale-125 transition-transform">
                          <div className="bg-purple-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-md border border-white whitespace-nowrap mb-0.5">
                            P{idx + 1}
                          </div>
                          <div className="w-6 h-6 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-mono text-[10px] font-black flex items-center justify-center ring-2 ring-white shadow-md">
                            {idx + 1}
                          </div>
                        </div>
                      </AdvancedMarker>
                    ))}
                  </Map>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-stone-100 flex-wrap">
                <button
                  type="button"
                  onClick={() => setDeletingArea(editingServiceArea)}
                  className="bg-red-50 hover:bg-red-100 text-red-700 hover:border-red-300 text-xs font-bold px-4 py-2.5 rounded-xl border border-red-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span>Delete This Service Area (ডিলিট করুন)</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingServiceArea(null)}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingArea}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSavingArea ? 'Updating...' : 'Update Service Area Boundary (আপডেট করুন)'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE SERVICE AREA CONFIRMATION MODAL (সার্ভিস এরিয়া ডিলিট নিশ্চিতকরণ)     */}
      {/* ========================================================================= */}
      {deletingArea && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5 border-b border-stone-100 pb-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">
                  Delete Service Area (সার্ভিস এরিয়া মুছে ফেলবেন?)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  This action will permanently delete this boundary zone.
                </p>
              </div>
            </div>

            <div className="bg-red-50/70 border border-red-200 rounded-2xl p-4 space-y-2 text-xs text-red-950">
              <div className="font-bold flex items-center gap-1.5 text-red-800">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>আপনি কি নিশ্চিতভাবে এই সার্ভিস এরিয়াটি মুছে ফেলতে চান?</span>
              </div>
              <div className="bg-white/90 p-3 rounded-xl border border-red-100 space-y-1 font-sans">
                <div className="font-extrabold text-stone-900 text-sm">{deletingArea.name}</div>
                {deletingArea.name_bn && (
                  <div className="text-xs text-stone-600">{deletingArea.name_bn}</div>
                )}
                <div className="text-[11px] text-stone-500 pt-1 border-t border-stone-200/60 flex items-center justify-between">
                  <span>Base Charge: <strong>₹{deletingArea.min_delivery_charge}</strong></span>
                  <span>Vertices: <strong>{deletingArea.polygon?.length || 0} pts</strong></span>
                </div>
              </div>
              <p className="text-[11px] text-red-800/90 leading-relaxed">
                এই সার্ভিস এরিয়াটি মুছে ফেললে এর ভেতরে থাকা রেস্টুরেন্ট ও গ্রাহকদের ডেলিভারি বাউন্ডারি কার্যকর থাকবে না।
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingArea(null)}
                disabled={isDeletingArea}
                className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-all"
              >
                Cancel (বাতিল)
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteArea}
                disabled={isDeletingArea}
                className="bg-red-600 hover:bg-red-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingArea ? 'Deleting...' : 'Yes, Delete (হ্যাঁ, ডিলিট করুন)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LIGHTBOX PHOTO PREVIEW MODAL (পূর্ণ আকারের ছবি প্রিভিউ)                   */}
      {/* ========================================================================= */}
      {photoPreview && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full max-h-[92vh] flex flex-col items-center animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setPhotoPreview(null)}
              className="absolute -top-12 right-0 sm:right-2 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all cursor-pointer shadow-lg"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="bg-stone-900 rounded-3xl overflow-hidden border border-white/20 shadow-2xl flex flex-col w-full">
              <div className="p-4 bg-stone-950 border-b border-white/10 flex items-center justify-between text-white">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">{photoPreview.title}</h3>
                  {photoPreview.subtitle && (
                    <p className="text-xs text-stone-400 mt-0.5">{photoPreview.subtitle}</p>
                  )}
                </div>
                <button
                  onClick={() => setPhotoPreview(null)}
                  className="text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition-all text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="p-2 sm:p-4 flex items-center justify-center max-h-[75vh] overflow-hidden bg-black/60">
                <img
                  src={photoPreview.url}
                  alt={photoPreview.title}
                  className="max-h-[70vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SETTLE PAYMENT TO RESTAURANT (রেস্তোরাঁকে পেমেন্ট সেটেলমেন্ট)        */}
      {/* ========================================================================= */}
      {settleRestaurantModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    Settle Restaurant Payout
                  </h3>
                  <p className="text-xs text-stone-500">
                    {settleRestaurantModal.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSettleRestaurantModal(null)}
                className="text-stone-400 hover:text-stone-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Recipient Account Details Summary */}
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-xs space-y-2">
              <div className="flex justify-between items-center text-stone-500 font-semibold">
                <span>Payment Mode:</span>
                <span className="font-bold text-stone-900 uppercase">
                  {((settleRestaurantModal as any).payment_method || 'upi')}
                </span>
              </div>
              {((settleRestaurantModal as any).payment_method === 'bank') ? (
                <div className="space-y-1 pt-1 border-t border-stone-200">
                  <div className="font-bold text-stone-900">{(settleRestaurantModal as any).bank_name || 'State Bank of India'}</div>
                  <div className="font-mono text-stone-700">A/C: {(settleRestaurantModal as any).bank_account_no || (settleRestaurantModal as any).bank_account_number || '38472910482'}</div>
                  <div className="font-mono text-stone-700">IFSC: {(settleRestaurantModal as any).bank_ifsc || 'SBIN0001420'}</div>
                  <div className="text-stone-600">Holder: {(settleRestaurantModal as any).bank_account_holder || settleRestaurantModal.owner_name}</div>
                </div>
              ) : (
                <div className="space-y-1 pt-1 border-t border-stone-200">
                  <div className="text-stone-500">UPI ID (VPA):</div>
                  <div className="font-mono font-bold text-emerald-800 text-sm">
                    {(settleRestaurantModal as any).upi_id || '9800000002@upi'}
                  </div>
                  {(settleRestaurantModal as any).upi_qr_photo && (
                    <div className="text-[11px] text-emerald-700 font-medium">
                      ✓ Scanner QR Code is attached & verified
                    </div>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handleSettleRestaurantSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Settlement Amount (টাকার পরিমাণ) <span className="text-orange-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-stone-400">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-3 py-2 text-sm font-bold text-stone-900 focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  UTR / Transaction Reference No.
                </label>
                <input
                  type="text"
                  value={settleReference}
                  onChange={(e) => setSettleReference(e.target.value)}
                  placeholder="e.g. UTR-98214481024"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Settlement Note
                </label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="e.g. Weekly restaurant sales settlement payout"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setSettleRestaurantModal(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingSettlement}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isProcessingSettlement ? 'Processing...' : 'Confirm Settlement (সেটেলমেন্ট সম্পন্ন)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SETTLE PAYMENT TO DELIVERY PARTNER (রাইডারকে পেমেন্ট সেটেলমেন্ট)     */}
      {/* ========================================================================= */}
      {settlePartnerModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    Settle Rider Commission Payout
                  </h3>
                  <p className="text-xs text-stone-500">
                    {settlePartnerModal.name} (Wallet: ₹{settlePartnerModal.wallet_balance})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSettlePartnerModal(null)}
                className="text-stone-400 hover:text-stone-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Recipient Account Details Summary */}
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-xs space-y-2">
              <div className="flex justify-between items-center text-stone-500 font-semibold">
                <span>Payment Mode:</span>
                <span className="font-bold text-stone-900 uppercase">
                  {((settlePartnerModal as any).payment_method || 'upi')}
                </span>
              </div>
              {((settlePartnerModal as any).payment_method === 'bank') ? (
                <div className="space-y-1 pt-1 border-t border-stone-200">
                  <div className="font-bold text-stone-900">{(settlePartnerModal as any).bank_name || 'State Bank of India'}</div>
                  <div className="font-mono text-stone-700">A/C: {(settlePartnerModal as any).bank_account_no || (settlePartnerModal as any).bank_account_number || '919800004589'}</div>
                  <div className="font-mono text-stone-700">IFSC: {(settlePartnerModal as any).bank_ifsc || 'SBIN0001458'}</div>
                  <div className="text-stone-600">Holder: {(settlePartnerModal as any).bank_account_holder || settlePartnerModal.name}</div>
                </div>
              ) : (
                <div className="space-y-1 pt-1 border-t border-stone-200">
                  <div className="text-stone-500">UPI ID (VPA):</div>
                  <div className="font-mono font-bold text-emerald-800 text-sm">
                    {(settlePartnerModal as any).upi_id || `${settlePartnerModal.phone}@upi`}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSettlePartnerSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Settlement Amount (টাকার পরিমাণ) <span className="text-orange-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-stone-400">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder={String(settlePartnerModal.wallet_balance || 500)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-3 py-2 text-sm font-bold text-stone-900 focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  UTR / Reference Number
                </label>
                <input
                  type="text"
                  value={settleReference}
                  onChange={(e) => setSettleReference(e.target.value)}
                  placeholder="e.g. UTR-88192039120"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Note / Comments
                </label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="e.g. Rider delivery payout transfer"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setSettlePartnerModal(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingSettlement}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isProcessingSettlement ? 'Processing...' : 'Confirm Rider Payout (পেমেন্ট সম্পন্ন)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ORDER IMMEDIATE SETTLEMENT MODAL (অর্ডার ইনস্ট্যান্ট সেটেলমেন্ট)       */}
      {/* ========================================================================= */}
      {settleModalOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    Settle Order Payment Now
                  </h3>
                  <p className="text-xs text-stone-500 font-mono">
                    Order #{settleModalOrder.order_number}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettleModalOrder(null)}
                className="text-stone-400 hover:text-stone-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-xs space-y-2.5">
              <div className="font-extrabold text-emerald-950 flex items-center justify-between border-b border-emerald-200 pb-1.5">
                <span>Customer Paid:</span>
                <span className="font-mono text-sm text-stone-900">₹{settleModalOrder.grand_total}</span>
              </div>

              <div className="flex justify-between items-center text-stone-700 font-bold">
                <span>Restaurant Payout (Wallet):</span>
                <span className="font-mono font-black text-emerald-800 text-sm">
                  ₹{settleModalOrder.net_restaurant_amount || Math.round((settleModalOrder.subtotal || 0) * 0.85)}
                </span>
              </div>

              <div className="flex justify-between items-center text-stone-700 font-bold">
                <span>Delivery Rider Fee (Wallet):</span>
                <span className="font-mono font-black text-blue-800 text-sm">
                  ₹{settleModalOrder.delivery_partner_earning || 0}
                </span>
              </div>

              <div className="flex justify-between items-center text-purple-900 font-bold pt-1 border-t border-emerald-200">
                <span>Platform Commission (Admin):</span>
                <span className="font-mono font-black text-purple-900 text-sm">
                  ₹{settleModalOrder.platform_commission || Math.round((settleModalOrder.subtotal || 0) * 0.15)}
                </span>
              </div>
            </div>

            <form onSubmit={handleExecuteOrderSettle} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Settlement Release Note
                </label>
                <input
                  type="text"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="e.g. Manual admin release approved for restaurant & rider"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setSettleModalOrder(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingSettlement}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isProcessingSettlement ? 'Processing...' : 'Settle Payments to Wallets (সেটেল করুন)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ORDER REFUND DECISION & PARTIAL WITHHOLDING (আংশিক রিফান্ড ও এডজাস্ট) */}
      {/* ========================================================================= */}
      {refundModalOrder && (() => {
        const orderTotal = Number(refundModalOrder.grand_total || 0);
        const origRest = Number(refundModalOrder.net_restaurant_amount || Math.round((refundModalOrder.subtotal || 0) * 0.85));
        const origDp = Number(refundModalOrder.delivery_partner_earning || 0);
        const platformComm = Number(refundModalOrder.platform_commission || Math.round((refundModalOrder.subtotal || 0) * 0.15));

        const simRefundAmt = Math.round(orderTotal * (refundPercentage / 100));
        const simRestPayout = Math.max(0, Math.round(origRest * ((100 - withholdRestPct) / 100)));
        const simDpPayout = Math.max(0, Math.round(origDp * ((100 - withholdDpPct) / 100)));

        return (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4 my-8 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                    <DollarSign className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-stone-900">
                      Customer Refund & Partner Withholding Decision
                    </h3>
                    <p className="text-xs text-stone-500 font-mono">
                      Order #{refundModalOrder.order_number} • Customer: {refundModalOrder.customer_name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRefundModalOrder(null)}
                  className="text-stone-400 hover:text-stone-700 font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Refund Percentage Presets */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-stone-800">
                  Select Refund Percentage to Customer (রিফান্ডের শতাংশ বেছে নিন):
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setRefundPercentage(pct);
                        setRefundAmount(Math.round(orderTotal * (pct / 100)));
                        setWithholdRestPct(pct);
                        setWithholdDpPct(pct);
                      }}
                      className={`p-2.5 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                        refundPercentage === pct
                          ? 'bg-rose-600 text-white border-rose-600 shadow-md scale-102'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {pct}% Refund ({pct === 50 ? '৫০% রিফান্ড' : `${pct}%`})
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider for custom % */}
              <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-rose-950">Refund Amount / Percentage:</span>
                  <span className="font-mono font-black text-rose-700 bg-white px-3 py-1 rounded-xl border border-rose-300 shadow-2xs text-sm">
                    ₹{simRefundAmt} ({refundPercentage}%)
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={refundPercentage}
                  onChange={(e) => {
                    const pct = Number(e.target.value);
                    setRefundPercentage(pct);
                    setRefundAmount(Math.round(orderTotal * (pct / 100)));
                    setWithholdRestPct(pct);
                    setWithholdDpPct(pct);
                  }}
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>

              {/* Withholding Toggles for Restaurant & Rider */}
              <div className="space-y-2 pt-1 border-t border-stone-100">
                <label className="block text-xs font-extrabold text-stone-800">
                  Partner Payout Deductions (রেস্তোরাঁ ও রাইডার পেমেন্ট কাটছাঁট):
                </label>

                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-stone-900 block">Restaurant Deduction:</span>
                      <span className="text-[11px] text-stone-500">Withhold {withholdRestPct}% from restaurant payout</span>
                    </div>
                    <span className="font-mono font-black text-rose-700 bg-white px-2.5 py-1 rounded-lg border border-stone-200">
                      -{withholdRestPct}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-stone-200/60 pt-2">
                    <div>
                      <span className="font-bold text-stone-900 block">Delivery Rider Deduction:</span>
                      <span className="text-[11px] text-stone-500">Withhold {withholdDpPct}% from delivery fee</span>
                    </div>
                    <span className="font-mono font-black text-rose-700 bg-white px-2.5 py-1 rounded-lg border border-stone-200">
                      -{withholdDpPct}%
                    </span>
                  </div>
                </div>
              </div>

              {/* LIVE SIMULATOR SUMMARY BOX */}
              <div className="bg-gradient-to-br from-stone-900 to-indigo-950 text-white p-4 rounded-2xl space-y-2 shadow-md">
                <div className="text-[11px] font-black uppercase text-rose-300 tracking-wider flex items-center justify-between border-b border-white/10 pb-1.5">
                  <span>⚡ Settlement Breakdown Preview (লাইভ সমীকরণ)</span>
                  <span className="text-amber-300 bg-white/10 px-2 py-0.5 rounded font-mono text-[10px]">
                    {refundPercentage}% Refund
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 font-mono">
                  <div className="bg-white/10 p-2 rounded-xl">
                    <span className="text-[10px] text-stone-300 block">Customer Refund:</span>
                    <span className="text-base font-black text-rose-400">₹{simRefundAmt}</span>
                  </div>

                  <div className="bg-white/10 p-2 rounded-xl">
                    <span className="text-[10px] text-purple-300 block">Platform Fee (100% Intact):</span>
                    <span className="text-base font-black text-purple-300">₹{platformComm}</span>
                  </div>

                  <div className="bg-white/10 p-2 rounded-xl">
                    <span className="text-[10px] text-emerald-300 block">Settled to Restaurant:</span>
                    <span className="text-base font-black text-emerald-400">₹{simRestPayout}</span>
                  </div>

                  <div className="bg-white/10 p-2 rounded-xl">
                    <span className="text-[10px] text-blue-300 block">Settled to Rider:</span>
                    <span className="text-base font-black text-blue-300">₹{simDpPayout}</span>
                  </div>
                </div>

                <p className="text-[10px] text-amber-200/90 leading-tight pt-1">
                  ✓ ৫০% রিফান্ড হলে গ্রাহক ৫০% ফেরত পাবেন, রেস্তোরাঁ ও রাইডার ৫০% টাকা পাবেন এবং প্ল্যাটফর্মের ফি ১০০% অপরিবর্তিত থাকবে।
                </p>
              </div>

              {/* Reason Input Form */}
              <form onSubmit={handleExecuteOrderRefund} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Refund Reason / Audit Note <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="e.g. 50% partial refund issued due to quality complaint"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:border-rose-600 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setRefundModalOrder(null)}
                    className="px-4 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingRefund}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isProcessingRefund ? 'Processing Refund...' : 'Confirm & Execute Settlement (রিফান্ড ও সেটেল করুন)'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL: REFUND PAYMENT TO CUSTOMER (কাস্টমারকে পেমেন্ট রিফান্ড)             */}
      {/* ========================================================================= */}
      {refundCustomerModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    Process Customer Refund
                  </h3>
                  <p className="text-xs text-stone-500">
                    {refundCustomerModal.name} ({refundCustomerModal.phone})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRefundCustomerModal(null)}
                className="text-stone-400 hover:text-stone-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Customer Refund Destination Summary */}
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-xs space-y-2">
              <div className="flex justify-between items-center text-stone-500 font-semibold">
                <span>Refund Method:</span>
                <span className="font-bold text-stone-900 uppercase">
                  {((refundCustomerModal as any).payment_method || 'upi')}
                </span>
              </div>
              {((refundCustomerModal as any).payment_method === 'bank') ? (
                <div className="space-y-1 pt-1 border-t border-stone-200">
                  <div className="font-bold text-stone-900">{(refundCustomerModal as any).bank_name || 'State Bank of India'}</div>
                  <div className="font-mono text-stone-700">A/C: {(refundCustomerModal as any).bank_account_no || '919800001420'}</div>
                  <div className="font-mono text-stone-700">IFSC: {(refundCustomerModal as any).bank_ifsc || 'SBIN0001420'}</div>
                  <div className="text-stone-600">Holder: {(refundCustomerModal as any).bank_account_holder || refundCustomerModal.name}</div>
                </div>
              ) : (
                <div className="space-y-1 pt-1 border-t border-stone-200">
                  <div className="text-stone-500">UPI ID (VPA):</div>
                  <div className="font-mono font-bold text-purple-900 text-sm">
                    {(refundCustomerModal as any).upi_id || `${refundCustomerModal.phone}@upi`}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleRefundCustomerSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Refund Amount (টাকার পরিমাণ) <span className="text-orange-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-stone-400">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder="e.g. 299"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-3 py-2 text-sm font-bold text-stone-900 focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Refund Reference / Transaction ID
                </label>
                <input
                  type="text"
                  value={settleReference}
                  onChange={(e) => setSettleReference(e.target.value)}
                  placeholder="e.g. REF-20240981"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Refund Reason / Note
                </label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="e.g. Order cancellation refund to customer"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setRefundCustomerModal(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingSettlement}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isProcessingSettlement ? 'Processing...' : 'Issue Customer Refund (রিফান্ড পাঠান)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW CATEGORY MODAL (নতুন ক্যাটাগরি তৈরি) */}
      {/* ========================================================================= */}
      {isCreatingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base">
                  🍔
                </div>
                <div>
                  <h3 className="font-black text-stone-900 text-base">
                    Add New Food Category (নতুন ক্যাটাগরি যোগ করুন)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    রেস্তোরাঁ ও কাস্টমাররা এই ক্যাটাগরি দেখতে পাবেন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingCategory(false)}
                className="text-stone-400 hover:text-stone-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {catFormError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs font-bold">
                ⚠️ {catFormError}
              </div>
            )}

            <form onSubmit={handleCreateCategorySubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Category Name (English) <span className="text-purple-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="e.g. Chinese & Noodles"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:border-purple-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Category Name (Bengali বাংলা)
                  </label>
                  <input
                    type="text"
                    value={catNameBn}
                    onChange={(e) => setCatNameBn(e.target.value)}
                    placeholder="যেমন: চাইনিজ ও নুডুলস"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 font-bengali focus:border-purple-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Category Emoji Icon (ইমোজি আইকন বেছে নিন)
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {['🍰', '🥤', '🫓', '🍟', '🍚', '🍲', '🍕', '🍦', '☕', '🥗', '🍱', '🍛', '🍗', '🥟', '🥪', '🥞'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setCatIcon(emoji)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer border ${
                        catIcon === emoji
                          ? 'bg-purple-600 text-white border-purple-600 scale-110 shadow-sm'
                          : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image URL & File Upload & Presets */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-700">
                  Category Banner Image (ক্যাটাগরির ছবি আপলোড / লিংক)
                </label>
                <div className="flex items-center gap-2.5">
                  <div className="w-14 h-14 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 shadow-2xs">
                    <img src={catImageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="cursor-pointer bg-stone-900 hover:bg-stone-800 text-white border border-stone-800 rounded-xl px-3 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95">
                      <Upload className="w-3.5 h-3.5 text-purple-400" />
                      <span>Upload Device Image (ডিভাইস থেকে ছবি আপলোড)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCatImageFileUpload}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={catImageUrl}
                      onChange={(e) => setCatImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1 text-[11px] text-stone-900"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <span className="text-[10px] text-stone-400 font-bold block mb-1">Quick Sample Photo Presets:</span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {[
                      { label: 'Sweets', url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=400' },
                      { label: 'Drinks', url: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=400' },
                      { label: 'Bread', url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400' },
                      { label: 'Biryani', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400' },
                      { label: 'Chinese', url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400' },
                      { label: 'Snacks', url: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=400' }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCatImageUrl(preset.url)}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-stone-100 hover:bg-purple-100 text-stone-700 hover:text-purple-900 border border-stone-200 whitespace-nowrap cursor-pointer transition-all"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Description / Subtitle (বিবরণ)
                </label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="e.g. Delicious hot & spicy noodles, momos and fried rice"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSavingCategory ? 'Saving...' : 'Create Category (ক্যাটাগরি যুক্ত করুন)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT CATEGORY MODAL (ক্যাটাগরি এডিট) */}
      {/* ========================================================================= */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base">
                  ✏️
                </div>
                <div>
                  <h3 className="font-black text-stone-900 text-base">
                    Edit Category (ক্যাটাগরি এডিট করুন)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    ID #{editingCategory.id} • {editingCategory.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="text-stone-400 hover:text-stone-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {catFormError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs font-bold">
                ⚠️ {catFormError}
              </div>
            )}

            <form onSubmit={handleUpdateCategorySubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Category Name (English) <span className="text-purple-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:border-purple-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Category Name (Bengali বাংলা)
                  </label>
                  <input
                    type="text"
                    value={catNameBn}
                    onChange={(e) => setCatNameBn(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 font-bengali focus:border-purple-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Category Emoji Icon (ইমোজি আইকন)
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {['🍰', '🥤', '🫓', '🍟', '🍚', '🍲', '🍕', '🍦', '☕', '🥗', '🍱', '🍛', '🍗', '🥟', '🥪', '🥞'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setCatIcon(emoji)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer border ${
                        catIcon === emoji
                          ? 'bg-purple-600 text-white border-purple-600 scale-110 shadow-sm'
                          : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image URL & Upload */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Category Banner Image (ক্যাটাগরির ব্যানার ছবি আপডেট করুন)
                </label>
                <div className="flex items-center gap-2.5">
                  <div className="w-14 h-14 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                    <img src={catImageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="cursor-pointer bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold text-xs px-3.5 py-1.5 rounded-xl border border-purple-200 inline-flex items-center gap-1.5 transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload New Image (ছবি আপলোড করুন)</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCatImageFileUpload}
                      />
                    </label>
                    <input
                      type="text"
                      value={catImageUrl}
                      onChange={(e) => setCatImageUrl(e.target.value)}
                      placeholder="Or enter image URL (https://...)"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-900"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[10px] text-stone-500 font-bold block mb-1">
                    Quick Sample Presets (স্যাম্পল ছবি বেছে নিন):
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {[
                      { label: 'Biryani', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400' },
                      { label: 'Sweets', url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=400' },
                      { label: 'Drinks', url: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=400' },
                      { label: 'Chinese', url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400' },
                      { label: 'Snacks', url: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=400' },
                      { label: 'Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400' },
                      { label: 'Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCatImageUrl(preset.url)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-stone-100 hover:bg-purple-100 text-stone-700 hover:text-purple-900 border border-stone-200 whitespace-nowrap cursor-pointer transition-all"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Description / Subtitle
                </label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <div>
                  <span className="text-xs font-bold text-stone-900 block">Category Active Status</span>
                  <span className="text-[10px] text-stone-500">অনলাইন ও কাস্টমার অ্যাপে দেখাবে</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={catIsActive}
                    onChange={(e) => setCatIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingCategory ? 'Updating...' : 'Save Changes (আপডেট করুন)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE CATEGORY CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl">
              🗑️
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-stone-900">
                Delete Category: "{deletingCategory.name}"?
              </h3>
              <p className="text-xs text-stone-500">
                আপনি কি নিশ্চিতভাবে এই ক্যাটাগরিটি ডিলিট করতে চান?
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Cancel (বাতিল)
              </button>
              <button
                type="button"
                onClick={handleDeleteCategorySubmit}
                disabled={isSavingCategory}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black text-xs py-2.5 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingCategory ? 'Deleting...' : 'Yes, Delete (ডিলিট করুন)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LOCATION RADIUS RANKING RULE MODAL (পয়েন্ট ও রেডিয়াস অনুযায়ী র‍্যাঙ্কিং) */}
      {/* ========================================================================= */}
      {isRadiusRuleModalOpen && editingRadiusRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[94vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-stone-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center font-bold text-stone-950 shadow-md">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white">
                    {editingRadiusRule.id
                      ? `Edit Location Radius Ranking: ${editingRadiusRule.name}`
                      : 'Create New Location Radius Ranking Rule (নতুন রেডিয়াস র‍্যাঙ্কিং)'}
                  </h3>
                  <p className="text-xs text-stone-400">
                    Set center GPS point, coverage radius KM, and assign Top 5 restaurants for customers in this radius
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRadiusRuleModalOpen(false)}
                className="p-2 text-stone-400 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Form Inputs: Rule Name, Bengali Name, Radius Slider */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Location Rule Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Park Circus Crossing Point"
                    value={editingRadiusRule.name || ''}
                    onChange={(e) =>
                      setEditingRadiusRule({ ...editingRadiusRule, name: e.target.value })
                    }
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Rule Name (Bengali / বাংলা)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. পার্ক সার্কাস ক্রসিং পয়েন্ট"
                    value={editingRadiusRule.name_bn || ''}
                    onChange={(e) =>
                      setEditingRadiusRule({ ...editingRadiusRule, name_bn: e.target.value })
                    }
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 font-bengali focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Coverage Radius (কিমি রেডিয়াস): {editingRadiusRule.radius_km || 3.5} KM
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.5"
                      max="20"
                      step="0.5"
                      value={editingRadiusRule.radius_km || 3.5}
                      onChange={(e) =>
                        setEditingRadiusRule({
                          ...editingRadiusRule,
                          radius_km: parseFloat(e.target.value)
                        })
                      }
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                    <span className="font-mono font-bold text-purple-700 shrink-0 w-12 text-right">
                      {editingRadiusRule.radius_km || 3.5} km
                    </span>
                  </div>
                </div>
              </div>

              {/* Service Boundary Status Warning / Notification */}
              {(() => {
                const isInside = !!(
                  editingRadiusRule &&
                  findServiceAreaForPoint(
                    { lat: Number(editingRadiusRule.lat), lng: Number(editingRadiusRule.lng) },
                    serviceAreas
                  )
                );
                const matchedSa = editingRadiusRule
                  ? findServiceAreaForPoint(
                      { lat: Number(editingRadiusRule.lat), lng: Number(editingRadiusRule.lng) },
                      serviceAreas
                    )
                  : null;

                if (!isInside) {
                  return (
                    <div className="p-3.5 bg-rose-600 text-white rounded-2xl text-xs font-black shadow-lg flex items-center justify-between gap-3 animate-pulse border-2 border-rose-400">
                      <div className="flex items-center gap-2.5">
                        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-300" />
                        <div>
                          <div className="font-extrabold text-sm flex items-center gap-1.5">
                            <span>⚠️ Out of Service Area (সার্ভিস সীমানার বাইরে)</span>
                          </div>
                          <div className="text-[11px] text-rose-100 font-medium mt-0.5">
                            নির্বাচিত অবস্থানটি সার্ভিস সীমানার বাইরে! কাস্টমারদের জন্য র‍্যাঙ্কিং সক্রিয় করতে ম্যাপের সবুজ চিহ্নিত সার্ভিস এরিয়ার ভেতরে পিন নিয়ে যান।
                          </div>
                        </div>
                      </div>
                      <span className="bg-rose-950/90 text-amber-300 px-3 py-1 rounded-xl text-[10px] font-mono uppercase tracking-wider shrink-0 border border-amber-300/40">
                        Out of Service
                      </span>
                    </div>
                  );
                }

                return (
                  <div className="p-3 bg-emerald-50 text-emerald-950 border border-emerald-300 rounded-2xl text-xs font-bold shadow-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        ✓ Valid Location inside <strong>{matchedSa?.name} ({matchedSa?.name_bn || matchedSa?.name})</strong> Service Boundary ({editingRadiusRule.radius_km || 3.5} KM Radius Active)
                      </span>
                    </div>
                    <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shadow-xs">
                      Inside Service Area ✓
                    </span>
                  </div>
                );
              })()}

              {/* Map Center Selector */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="font-extrabold text-stone-900 flex items-center gap-1.5">
                    <Crosshair className="w-4 h-4 text-purple-600" />
                    <span>Pin Location on Serviceable Area Map (ম্যাপে ক্লিক করে বা পিন ড্র্যাগ করে স্থান নির্বাচন করুন):</span>
                  </span>

                  {/* Quick Jump & GPS Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      onChange={(e) => {
                        const saId = Number(e.target.value);
                        if (!saId) return;
                        const sa = serviceAreas.find((s) => s.id === saId);
                        if (sa && sa.polygon && sa.polygon.length > 0) {
                          let totalLat = 0, totalLng = 0;
                          sa.polygon.forEach((pt) => {
                            totalLat += pt.lat;
                            totalLng += pt.lng;
                          });
                          const centroidLat = parseFloat((totalLat / sa.polygon.length).toFixed(6));
                          const centroidLng = parseFloat((totalLng / sa.polygon.length).toFixed(6));
                          setEditingRadiusRule({
                            ...editingRadiusRule,
                            lat: centroidLat,
                            lng: centroidLng,
                            name: editingRadiusRule.name || `${sa.name} Ranking Point`
                          });
                        }
                      }}
                      className="bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1 text-[11px] font-bold text-stone-800 focus:border-purple-600 cursor-pointer"
                    >
                      <option value={0}>📍 Jump Pin to Service Area...</option>
                      {serviceAreas.map((sa) => (
                        <option key={sa.id} value={sa.id}>
                          {sa.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        if (!navigator.geolocation) {
                          alert('GPS Geolocation is not supported by your browser.');
                          return;
                        }
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            setEditingRadiusRule({
                              ...editingRadiusRule,
                              lat: parseFloat(pos.coords.latitude.toFixed(6)),
                              lng: parseFloat(pos.coords.longitude.toFixed(6))
                            });
                          },
                          (err) => {
                            alert('Could not retrieve GPS coordinates. Please tap on map manually.');
                          },
                          { enableHighAccuracy: true, timeout: 8000 }
                        );
                      }}
                      className="bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-xl text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Crosshair className="w-3 h-3" />
                      <span>My GPS Pin</span>
                    </button>

                    <div className="font-mono text-[11px] text-purple-900 bg-purple-100 px-2.5 py-1 rounded-xl font-black">
                      Lat: {editingRadiusRule.lat?.toFixed(5)}, Lng: {editingRadiusRule.lng?.toFixed(5)}
                    </div>
                  </div>
                </div>

                <div className="h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-stone-200 relative bg-stone-100 shadow-inner">
                  <Map
                    defaultCenter={{
                      lat: Number(editingRadiusRule.lat) || 22.5400,
                      lng: Number(editingRadiusRule.lng) || 88.3600
                    }}
                    center={{
                      lat: Number(editingRadiusRule.lat) || 22.5400,
                      lng: Number(editingRadiusRule.lng) || 88.3600
                    }}
                    defaultZoom={13}
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    onClick={(e) => {
                      if (e.detail?.latLng) {
                        setEditingRadiusRule({
                          ...editingRadiusRule,
                          lat: parseFloat(e.detail.latLng.lat.toFixed(6)),
                          lng: parseFloat(e.detail.latLng.lng.toFixed(6))
                        });
                      }
                    }}
                    className="w-full h-full"
                  >
                    {/* Render Serviceable Area Boundaries as Translucent Green Polygons */}
                    {serviceAreas.map((sa) => (
                      <MapPolygonOverlay
                        key={`modal-sa-${sa.id}`}
                        paths={sa.polygon}
                        strokeColor="#059669"
                        fillColor="#10b981"
                      />
                    ))}

                    {/* Coverage Radius Circle around current Pinned Center */}
                    {(() => {
                      const isInside = !!findServiceAreaForPoint(
                        { lat: Number(editingRadiusRule.lat), lng: Number(editingRadiusRule.lng) },
                        serviceAreas
                      );
                      return (
                        <MapCircleOverlay
                          key={`modal-circle-${editingRadiusRule.lat}-${editingRadiusRule.lng}-${editingRadiusRule.radius_km}`}
                          center={{
                            lat: Number(editingRadiusRule.lat) || 22.5400,
                            lng: Number(editingRadiusRule.lng) || 88.3600
                          }}
                          radiusMeters={Number(editingRadiusRule.radius_km || 3.5) * 1000}
                          strokeColor={isInside ? '#7c3aed' : '#ef4444'}
                          fillColor={isInside ? '#8b5cf6' : '#f87171'}
                        />
                      );
                    })()}

                    {/* Render Restaurant Markers for Context */}
                    {restaurants.map((rest) => (
                      <AdvancedMarker
                        key={`modal-rest-${rest.id}`}
                        position={{ lat: Number(rest.latitude), lng: Number(rest.longitude) }}
                      >
                        <div
                          className="bg-orange-500 text-white p-1 rounded-xl shadow-md border border-white text-[10px] font-extrabold flex items-center gap-1 opacity-80 hover:opacity-100"
                          title={`${rest.name} (${rest.address})`}
                        >
                          <Store className="w-3 h-3" />
                          <span className="hidden sm:inline-block max-w-[80px] truncate">{rest.name}</span>
                        </div>
                      </AdvancedMarker>
                    ))}

                    {/* Active Pinned Center Marker (Draggable & Clickable) */}
                    {(() => {
                      const isInside = !!findServiceAreaForPoint(
                        { lat: Number(editingRadiusRule.lat), lng: Number(editingRadiusRule.lng) },
                        serviceAreas
                      );
                      return (
                        <AdvancedMarker
                          position={{
                            lat: Number(editingRadiusRule.lat) || 22.5400,
                            lng: Number(editingRadiusRule.lng) || 88.3600
                          }}
                          draggable={true}
                          onDragEnd={(e: any) => {
                            if (e.latLng) {
                              const newLat = typeof e.latLng.lat === 'function' ? e.latLng.lat() : e.latLng.lat;
                              const newLng = typeof e.latLng.lng === 'function' ? e.latLng.lng() : e.latLng.lng;
                              setEditingRadiusRule({
                                ...editingRadiusRule,
                                lat: parseFloat(Number(newLat).toFixed(6)),
                                lng: parseFloat(Number(newLng).toFixed(6))
                              });
                            }
                          }}
                        >
                          <div className="flex flex-col items-center cursor-grab active:cursor-grabbing">
                            <div
                              className={`p-2.5 rounded-full shadow-2xl ring-4 transition-all ${
                                isInside
                                  ? 'bg-purple-700 text-white ring-amber-400 animate-bounce'
                                  : 'bg-rose-600 text-white ring-red-400 animate-pulse'
                              }`}
                            >
                              {isInside ? (
                                <MapPin className="w-6 h-6 text-amber-300" />
                              ) : (
                                <AlertTriangle className="w-6 h-6 text-amber-200" />
                              )}
                            </div>
                            <div
                              className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg shadow-xl border mt-1 whitespace-nowrap ${
                                isInside
                                  ? 'bg-stone-950 text-amber-300 border-amber-400'
                                  : 'bg-rose-950 text-white border-rose-400'
                              }`}
                            >
                              {isInside
                                ? `📍 ${editingRadiusRule.name || 'Pinned Ranking Point'} (${editingRadiusRule.radius_km || 3.5} KM)`
                                : '⚠️ OUT OF SERVICE AREA'}
                            </div>
                          </div>
                        </AdvancedMarker>
                      );
                    })()}
                  </Map>

                  <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-bold text-stone-700 border border-stone-200 shadow-md flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span>Green overlay: Active Service Areas. Drag pin or click anywhere inside to set Ranking Point!</span>
                  </div>
                </div>
              </div>

              {/* TOP 5 RANKING SLOTS SELECTION */}
              <div className="space-y-3 pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-stone-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    <span>Top 5 Position Rankings for Customers in this Radius Zone:</span>
                  </h4>
                  <span className="text-[11px] text-stone-500 font-medium">
                    (১ম থেকে ৫ম স্থান নির্বাচন করুন)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((rNum) => {
                    const existingItem = (editingRadiusRule.rankings || []).find(
                      (item: any) => Number(item.rank) === rNum
                    );
                    const selectedRestId = existingItem ? Number(existingItem.restaurant_id) : 0;

                    return (
                      <div
                        key={rNum}
                        className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs font-black">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] ${
                              rNum === 1
                                ? 'bg-amber-400 text-amber-950'
                                : rNum === 2
                                ? 'bg-stone-300 text-stone-900'
                                : rNum === 3
                                ? 'bg-amber-700 text-white'
                                : 'bg-purple-200 text-purple-900'
                            }`}
                          >
                            Rank #{rNum}
                          </span>
                        </div>

                        <select
                          value={selectedRestId}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const updated = [...(editingRadiusRule.rankings || [])];
                            const idx = updated.findIndex((i: any) => Number(i.rank) === rNum);
                            if (idx !== -1) {
                              updated[idx].restaurant_id = val;
                            } else {
                              updated.push({ rank: rNum, restaurant_id: val });
                            }
                            setEditingRadiusRule({ ...editingRadiusRule, rankings: updated });
                          }}
                          className="w-full bg-white border border-stone-300 rounded-xl px-2 py-1.5 text-xs font-bold text-stone-900 focus:border-purple-600 cursor-pointer"
                        >
                          <option value={0}>-- None --</option>
                          {restaurants
                            .filter((r) => {
                              if (r.status !== 'approved') return false;
                              if (r.id === selectedRestId) return true;
                              // Exclude restaurants selected in other rank slots for this radius rule
                              const isSelectedInOtherSlot = (editingRadiusRule.rankings || []).some(
                                (item: any) => Number(item.rank) !== rNum && Number(item.restaurant_id) === r.id
                              );
                              return !isSelectedInOtherSlot;
                            })
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name} ({r.rating}★)
                              </option>
                            ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsRadiusRuleModalOpen(false)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveRadiusRule}
                disabled={isSavingRadiusRule}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingRadiusRule ? 'Saving Rule...' : 'Save Radius Rule (সেভ করুন)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE LOCATION RADIUS RULE CONFIRMATION */}
      {/* ========================================================================= */}
      {deletingRadiusRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center font-black text-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-stone-900 text-base">
                  Delete Location Radius Rule?
                </h3>
                <p className="text-xs text-stone-500">
                  লোকেশন রেডিয়াস র‍্যাঙ্কিং রুল মুছে ফেলা
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 bg-stone-50 p-3.5 rounded-2xl border border-stone-200 leading-relaxed">
              আপনি কি নিশ্চিতভাবে <strong>"{deletingRadiusRule.name}"</strong> রুলটি মুছে ফেলতে চান? এটি মুছে ফেললে এই এলাকার কাস্টমারদের জন্য ডিফল্ট সার্ভিস এরিয়া র‍্যাঙ্কিং কার্যকর হবে।
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingRule}
                onClick={() => setDeletingRadiusRule(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer transition-all"
              >
                Cancel (বাতিল)
              </button>
              <button
                type="button"
                disabled={isDeletingRule}
                onClick={handleConfirmDeleteRadiusRule}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingRule ? 'Deleting...' : 'Yes, Delete Rule (রুলটি ডিলিট করুন)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
