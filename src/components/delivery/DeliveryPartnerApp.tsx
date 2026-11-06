import React, { useEffect, useState } from 'react';
import {
  Bike,
  Power,
  Navigation,
  MapPin,
  Store,
  Home,
  CheckCircle,
  Phone,
  DollarSign,
  AlertCircle,
  Volume2,
  ShieldCheck,
  ArrowRight,
  Clock,
  RefreshCw,
  FileText,
  XCircle,
  History,
  CreditCard,
  TrendingUp,
  Wallet,
  Building2,
  QrCode,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  Calendar,
  ChevronRight,
  Sparkles,
  Info,
  BellRing,
  Check,
  X,
  ThumbsUp,
  ThumbsDown,
  Inbox,
  User,
  Save,
  Camera,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { DeliveryPartner, Order } from '../../types';
import { apiRequest } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { DeliveryLiveMap } from '../maps/DeliveryLiveMap';
import { playOrderAlertChime, playSuccessChime } from '../common/AudioAlerts';

type DeliveryTab = 'receive_accept' | 'live_pending' | 'delivery_history' | 'commission_payment' | 'profile';

interface PayoutAccount {
  upi_id?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  beneficiary_name?: string;
}

interface WalletData {
  balance: number;
  total_earned: number;
  total_withdrawn: number;
}

interface WalletTransaction {
  id: number;
  wallet_id: number;
  amount: number;
  type: 'credit' | 'debit';
  reference_type: string;
  reference_id?: number;
  description: string;
  created_at: string;
}

export const DeliveryPartnerApp: React.FC = () => {
  const { user, roleDetails } = useAuth();
  const { language } = useLanguage();

  const [activeTab, setActiveTab] = useState<DeliveryTab>('receive_accept');

  const [partner, setPartner] = useState<DeliveryPartner | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [declinedOrderIds, setDeclinedOrderIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Commission & Payment state
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [commissionRate, setCommissionRate] = useState<number>(10);
  const [minFareGuarantee, setMinFareGuarantee] = useState<number>(20);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>(null);

  // Payout Request Modal
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'upi' | 'bank'>('upi');
  const [customUpi, setCustomUpi] = useState('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState<string | null>(null);

  // Edit Payout Account Modal
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [editUpiId, setEditUpiId] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editIfscCode, setEditIfscCode] = useState('');
  const [editBeneficiaryName, setEditBeneficiaryName] = useState('');
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  // History Filter
  const [historyTimeFilter, setHistoryTimeFilter] = useState<'all' | 'today' | 'week'>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Delivery Partner Profile Tab State
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAge, setProfileAge] = useState('');
  const [profileGender, setProfileGender] = useState('male');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileVehicleType, setProfileVehicleType] = useState('bike');
  const [profileVehicleNumber, setProfileVehicleNumber] = useState('');
  const [profileDrivingLicense, setProfileDrivingLicense] = useState('');
  const [profileAadhaarNumber, setProfileAadhaarNumber] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');

  // Payment Details for Delivery Partner
  const [partnerPaymentMethod, setPartnerPaymentMethod] = useState<'upi' | 'bank'>('upi');
  const [partnerUpiId, setPartnerUpiId] = useState('');
  const [partnerUpiQrPhoto, setPartnerUpiQrPhoto] = useState('');
  const [partnerBankName, setPartnerBankName] = useState('');
  const [partnerBankAccountNo, setPartnerBankAccountNo] = useState('');
  const [partnerBankAccountHolder, setPartnerBankAccountHolder] = useState('');
  const [partnerBankIfsc, setPartnerBankIfsc] = useState('');
  const [partnerBankPassbookPhoto, setPartnerBankPassbookPhoto] = useState('');

  const [isSavingPartnerProfile, setIsSavingPartnerProfile] = useState(false);
  const [partnerProfileFeedback, setPartnerProfileFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile Upload Handlers
  const handleRiderPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRiderUpiQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPartnerUpiQrPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRiderPassbookUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPartnerBankPassbookPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveRiderProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPartnerProfile(true);
    setPartnerProfileFeedback(null);

    const payload = {
      name: profileName,
      phone: profilePhone,
      email: profileEmail,
      age: Number(profileAge) || undefined,
      gender: profileGender,
      address: profileAddress,
      vehicle_type: profileVehicleType,
      vehicle_number: profileVehicleNumber,
      driving_license_number: profileDrivingLicense,
      aadhaar_number: profileAadhaarNumber,
      profile_photo: profilePhoto,
      passport_photo: profilePhoto,
      photo_url: profilePhoto,
      payment_method: partnerPaymentMethod,
      upi_id: partnerUpiId,
      upi_qr_photo: partnerUpiQrPhoto,
      bank_name: partnerBankName,
      bank_account_no: partnerBankAccountNo,
      bank_account_number: partnerBankAccountNo,
      bank_account_holder: partnerBankAccountHolder,
      bank_ifsc: partnerBankIfsc,
      bank_passbook_photo: partnerBankPassbookPhoto
    };

    try {
      const res = await apiRequest('/api/delivery/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (res && res.data) {
        const saved = res.data;
        setPartner(saved);
        setProfileName(saved.name || '');
        setProfilePhone(saved.phone || '');
        setProfileEmail(saved.email || '');
        setProfileAge(String(saved.age || ''));
        setProfileGender(saved.gender || 'male');
        setProfileAddress(saved.address || '');
        setProfileVehicleType(saved.vehicle_type || 'bike');
        setProfileVehicleNumber(saved.vehicle_number || '');
        setProfileDrivingLicense(saved.driving_license_number || '');
        setProfileAadhaarNumber(saved.aadhaar_number || '');
        setProfilePhoto(saved.profile_photo || saved.passport_photo || '');
        setPartnerPaymentMethod((saved.payment_method as any) === 'bank' ? 'bank' : 'upi');
        setPartnerUpiId(saved.upi_id || '');
        setPartnerUpiQrPhoto(saved.upi_qr_photo || '');
        setPartnerBankName(saved.bank_name || '');
        setPartnerBankAccountNo(saved.bank_account_no || saved.bank_account_number || '');
        setPartnerBankAccountHolder(saved.bank_account_holder || saved.name || '');
        setPartnerBankIfsc(saved.bank_ifsc || '');
        setPartnerBankPassbookPhoto(saved.bank_passbook_photo || '');
      }
      setPartnerProfileFeedback({
        type: 'success',
        text: '✅ ডেলিভারি পার্টনারের প্রোফাইল ও পেমেন্ট সংক্রান্ত তথ্য সফলভাবে সংরক্ষণ করা হয়েছে! (Payment details saved successfully)'
      });
      setTimeout(() => setPartnerProfileFeedback(null), 5000);
      fetchProfileAndOrders();
    } catch (err: any) {
      setPartnerProfileFeedback({
        type: 'error',
        text: `❌ প্রোফাইল সেভ ব্যর্থ: ${err.message || 'Error updating profile'}`
      });
    } finally {
      setIsSavingPartnerProfile(false);
    }
  };

  const fetchProfileAndOrders = async () => {
    try {
      const data = await apiRequest('/api/delivery/profile');
      setPartner(data);

      // Sync local profile edit states if not dirty
      setProfileName((prev) => prev || data.name || user?.name || '');
      setProfilePhone((prev) => prev || data.phone || user?.phone || '');
      setProfileEmail((prev) => prev || data.email || user?.email || '');
      setProfileAge((prev) => prev || String(data.age || ''));
      setProfileGender((prev) => prev || data.gender || 'male');
      setProfileAddress((prev) => prev || data.address || '');
      setProfileVehicleType((prev) => prev || data.vehicle_type || 'bike');
      setProfileVehicleNumber((prev) => prev || data.vehicle_number || '');
      setProfileDrivingLicense((prev) => prev || data.driving_license_number || '');
      setProfileAadhaarNumber((prev) => prev || data.aadhaar_number || '');
      setProfilePhoto((prev) => prev || data.profile_photo || data.passport_photo || data.photo_url || '');

      setPartnerPaymentMethod((data.payment_method as any) === 'bank' ? 'bank' : 'upi');
      setPartnerUpiId(data.upi_id || '');
      setPartnerUpiQrPhoto(data.upi_qr_photo || '');
      setPartnerBankName(data.bank_name || '');
      setPartnerBankAccountNo(data.bank_account_no || data.bank_account_number || '');
      setPartnerBankAccountHolder(data.bank_account_holder || data.name || user?.name || '');
      setPartnerBankIfsc(data.bank_ifsc || '');
      setPartnerBankPassbookPhoto(data.bank_passbook_photo || '');

      const allOrders: Order[] = await apiRequest('/api/orders');

      // Check if rider already has an active order (assigned, accepted, preparing, ready, picked_up, on_the_way)
      const currentActive = allOrders.find(
        (o) =>
          o.delivery_partner_id === data.id &&
          Boolean(o.rider_accepted) &&
          ['assigned', 'accepted', 'preparing', 'ready', 'picked_up', 'on_the_way'].includes(o.status)
      );
      setActiveOrder(currentActive || null);

      // Always check for available incoming orders waiting for rider pickup
      const waitingOrders = allOrders.filter((o) => {
        // If already accepted by this rider, it's active
        if (o.delivery_partner_id === data.id && Boolean(o.rider_accepted)) return false;
        // If dismissed in this session
        if (declinedOrderIds.includes(o.id)) return false;
        // If finished or already in transit by someone else
        if (['delivered', 'cancelled', 'picked_up', 'on_the_way'].includes(o.status)) return false;
        // If restaurant requested rider, ALWAYS show in Receive & Accept menu
        if (Boolean(o.rider_requested)) return true;
        // If unassigned platform delivery order
        const isSelf = o.is_self_delivery === 1 || (o.is_self_delivery as any) === true || o.delivery_mode === 'self_delivery';
        return !isSelf && !o.delivery_partner_id;
      });
      if (waitingOrders.length > 0 && availableOrders.length === 0) {
        playOrderAlertChime();
      }
      setAvailableOrders(waitingOrders);

      // Filter history orders
      const myCompleted = allOrders.filter(
        (o) => o.delivery_partner_id === data.id && ['delivered', 'cancelled'].includes(o.status)
      );
      setHistoryOrders(myCompleted);
    } catch (e) {
      console.error('Fetch delivery partner error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEarningsData = async () => {
    try {
      const earningsRes = await apiRequest('/api/delivery/earnings');
      if (earningsRes && earningsRes.data) {
        const d = earningsRes.data;
        setWallet(d.wallet || null);
        setCommissionRate(d.commission_rate_percent || 10);
        setMinFareGuarantee(d.min_fare_guarantee || 20);
        setTransactions(d.transactions || []);
        if (d.payout_account) {
          setPayoutAccount(d.payout_account);
          setEditUpiId(d.payout_account.upi_id || '');
          setEditBankName(d.payout_account.bank_name || '');
          setEditAccountNumber(d.payout_account.account_number || '');
          setEditIfscCode(d.payout_account.ifsc_code || '');
          setEditBeneficiaryName(d.payout_account.beneficiary_name || '');
        }
      }
    } catch (e) {
      console.error('Fetch earnings error:', e);
    }
  };

  useEffect(() => {
    fetchProfileAndOrders();
    fetchEarningsData();
    const interval = setInterval(() => {
      fetchProfileAndOrders();
      if (activeTab === 'commission_payment') {
        fetchEarningsData();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Toggle Online/Offline
  const handleToggleOnline = async () => {
    if (!partner) return;
    setGpsError(null);

    const willGoOnline = !partner.is_online;

    if (willGoOnline) {
      // Prompt GPS permission when going ONLINE
      if (!navigator.geolocation) {
        setGpsError('GPS geolocation not supported on this device.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await apiRequest('/api/delivery/status', {
              method: 'POST',
              body: JSON.stringify({
                is_online: true,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
              })
            });
            fetchProfileAndOrders();
          } catch (err: any) {
            alert(err.message);
          }
        },
        async (err) => {
          setGpsError('GPS permission was denied. Using simulated hub coordinates for dispatch.');
          try {
            await apiRequest('/api/delivery/status', {
              method: 'POST',
              body: JSON.stringify({
                is_online: true,
                lat: 22.5401,
                lng: 88.3610
              })
            });
            fetchProfileAndOrders();
          } catch (e: any) {
            alert(e.message);
          }
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      try {
        await apiRequest('/api/delivery/status', {
          method: 'POST',
          body: JSON.stringify({ is_online: false })
        });
        fetchProfileAndOrders();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handleAcceptOrder = async (orderId: number) => {
    try {
      await apiRequest(`/api/delivery/orders/${orderId}/accept`, {
        method: 'POST'
      });
      playSuccessChime();
      fetchProfileAndOrders();
      setActiveTab('live_pending');
      setPayoutSuccessMsg(`Order #${orderId} accepted successfully! Heading to restaurant.`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeclineOrder = async (orderId: number) => {
    try {
      setDeclinedOrderIds((prev) => [...prev, orderId]);
      setAvailableOrders((prev) => prev.filter((o) => o.id !== orderId));
      await apiRequest(`/api/delivery/orders/${orderId}/decline`, {
        method: 'POST'
      });
      setPayoutSuccessMsg(`Order #${orderId} declined (অর্ডারটি বাদ দেওয়া হয়েছে)`);
      fetchProfileAndOrders();
    } catch (e: any) {
      setDeclinedOrderIds((prev) => [...prev, orderId]);
      setAvailableOrders((prev) => prev.filter((o) => o.id !== orderId));
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      await apiRequest(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      playSuccessChime();
      fetchProfileAndOrders();
      fetchEarningsData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Submit Payout Request
  const handleSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(payoutAmount);
    if (!amount || amount < 50) {
      alert('Minimum payout withdrawal amount is ₹50 (সর্বনিম্ন ৫০ টাকা)');
      return;
    }

    const availableBal = wallet?.balance ?? partner?.wallet_balance ?? 0;
    if (amount > availableBal) {
      alert(`Insufficient balance! Available: ₹${availableBal}`);
      return;
    }

    setIsSubmittingPayout(true);
    try {
      const res = await apiRequest('/api/delivery/payout-request', {
        method: 'POST',
        body: JSON.stringify({
          amount,
          method: payoutMethod,
          upi_id: payoutMethod === 'upi' ? (customUpi || payoutAccount?.upi_id || `${partner?.phone}@upi`) : undefined,
          account_number: payoutMethod === 'bank' ? payoutAccount?.account_number : undefined,
          ifsc_code: payoutMethod === 'bank' ? payoutAccount?.ifsc_code : undefined,
          beneficiary_name: payoutAccount?.beneficiary_name || partner?.name
        })
      });

      playSuccessChime();
      setPayoutSuccessMsg(res.message || `₹${amount} withdrawal request processed!`);
      setIsPayoutModalOpen(false);
      setPayoutAmount('');
      fetchEarningsData();
      fetchProfileAndOrders();
      setTimeout(() => setPayoutSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Payout request failed');
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  // Save Payout Method
  const handleSavePayoutMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAccount(true);
    try {
      const res = await apiRequest('/api/delivery/payout-method', {
        method: 'POST',
        body: JSON.stringify({
          upi_id: editUpiId,
          bank_name: editBankName,
          account_number: editAccountNumber,
          ifsc_code: editIfscCode,
          beneficiary_name: editBeneficiaryName
        })
      });

      setPayoutAccount(res.data);
      setIsEditAccountModalOpen(false);
      setPayoutSuccessMsg('Payment details updated successfully! (পেমেন্ট ডিটেইলস আপডেট করা হয়েছে)');
      setTimeout(() => setPayoutSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update payment details');
    } finally {
      setIsSavingAccount(false);
    }
  };

  if (!partner) {
    return (
      <div className="min-h-screen p-8 text-center text-stone-500">
        Loading delivery partner dashboard...
      </div>
    );
  }

  // If Delivery Partner is NOT approved yet by Admin (pending, rejected, or blocked)
  if (partner.status !== 'approved') {
    return (
      <div className="min-h-screen bg-stone-100 py-10 px-4">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Main Status Card */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${
                  partner.status === 'pending'
                    ? 'bg-amber-100 text-amber-700'
                    : partner.status === 'blocked'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-stone-200 text-stone-700'
                }`}
              >
                {partner.status === 'pending' ? '⏳' : partner.status === 'blocked' ? '🚫' : '❌'}
              </div>
              <div>
                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    partner.status === 'pending'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : partner.status === 'blocked'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {partner.status === 'pending'
                    ? 'Pending Admin Approval (অনুমোদনের অপেক্ষায়)'
                    : partner.status === 'blocked'
                    ? 'Account Suspended (অ্যাকাউন্ট সাময়িকভাবে স্থগিত)'
                    : 'Application Not Approved'}
                </span>
                <h2 className="text-xl font-black text-stone-900 mt-1">
                  {partner.status === 'pending'
                    ? 'Rider Verification Under Review'
                    : partner.status === 'blocked'
                    ? 'Delivery Partner Access Blocked'
                    : 'Application Rejected'}
                </h2>
                <p className="text-xs text-stone-500">
                  {partner.status === 'pending'
                    ? 'আপনার আবেদনটি বর্তমানে প্ল্যাটফর্ম অ্যাডমিন পর্যালোচনায় রয়েছে।'
                    : 'প্রশাসনিক কারণে অ্যাকাউন্টটি সাময়িকভাবে নিষ্ক্রিয় রাখা হয়েছে।'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              {partner.status === 'pending' ? (
                <>
                  <p className="font-bold text-amber-950 mb-1">
                    Thank you for applying to join the AharLocal Delivery Partner Fleet!
                  </p>
                  <p>
                    Your driving license and vehicle details are currently being reviewed by the operations admin. Once verified and approved, you can immediately go online and accept doorstep delivery requests.
                  </p>
                </>
              ) : partner.status === 'blocked' ? (
                <p>
                  Your delivery partner account has been blocked by the admin. You cannot go online or accept orders at this time. Please contact support.
                </p>
              ) : (
                <p>
                  Your application could not be approved at this time. Please contact administration to update your vehicle or driving license documents.
                </p>
              )}
            </div>

            {/* Applicant Summary */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2.5 text-xs">
              <h4 className="font-extrabold text-stone-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>Submitted Registration Details:</span>
              </h4>
              <div className="grid grid-cols-2 gap-2.5 text-stone-600 pt-2 border-t border-stone-200/60">
                <div>
                  <span className="text-[11px] text-stone-400 block">Applicant Name</span>
                  <strong className="text-stone-900 font-bold">{partner.name}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-stone-400 block">Registered Phone</span>
                  <strong className="text-stone-900 font-bold">{partner.phone}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-stone-400 block">Vehicle Type</span>
                  <strong className="text-stone-900 font-bold uppercase">{partner.vehicle_type}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-stone-400 block">Vehicle Registration</span>
                  <strong className="text-stone-900 font-bold">{partner.vehicle_number}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-stone-400 block">Driving License</span>
                  <strong className="text-stone-900 font-bold">{partner.driving_license_number}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-stone-400 block">Approval Status</span>
                  <span className="text-amber-700 font-black">Waiting for Admin ✓</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => fetchProfileAndOrders()}
                className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-2xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check Approval Status (রিফ্রেশ করুন)</span>
              </button>

              <div className="text-[11px] text-stone-400 font-mono">
                Admin Approval Required
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter history orders based on time and search query
  const filteredHistory = historyOrders.filter((ord) => {
    if (historyTimeFilter === 'today') {
      const orderDate = new Date(ord.delivered_at || ord.placed_at).toDateString();
      const today = new Date().toDateString();
      if (orderDate !== today) return false;
    } else if (historyTimeFilter === 'week') {
      const orderTime = new Date(ord.delivered_at || ord.placed_at).getTime();
      const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
      if (orderTime < sevenDaysAgo) return false;
    }

    if (historySearchQuery.trim()) {
      const q = historySearchQuery.toLowerCase();
      const matchNum = ord.order_number.toLowerCase().includes(q);
      const matchRest = ord.restaurant_name.toLowerCase().includes(q);
      const matchCust = ord.customer_name?.toLowerCase().includes(q);
      const matchAddr = ord.delivery_address.toLowerCase().includes(q);
      return matchNum || matchRest || matchCust || matchAddr;
    }
    return true;
  });

  const currentWalletBalance = wallet?.balance ?? partner.wallet_balance ?? 0;
  const currentTotalEarned = wallet?.total_earned ?? (currentWalletBalance + 450);
  const currentTotalWithdrawn = wallet?.total_withdrawn ?? 0;

  return (
    <div className="min-h-screen bg-stone-100 pb-24">
      {/* Top Rider Header */}
      <div className="bg-white border-b border-stone-200 py-3.5 px-4 shadow-xs sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
              🛵
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-stone-900 leading-tight">
                  {partner.name}
                </h1>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {partner.vehicle_type} ({partner.vehicle_number})
                </span>
              </div>
              <p className="text-xs text-stone-500">
                ⭐ {partner.rating} • {partner.total_deliveries} Deliveries Completed
              </p>
            </div>
          </div>

          {/* Quick Controls: Online/Offline Switch */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleToggleOnline}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black shadow-sm transition-all cursor-pointer ${
                partner.is_online
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                  : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{partner.is_online ? 'ONLINE (READY)' : 'OFFLINE'}</span>
            </button>
          </div>
        </div>

        {/* GPS tracking note */}
        <div className="max-w-5xl mx-auto mt-2 text-[11px] text-stone-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              {partner.is_online
                ? 'Live GPS is active for automatic trip dispatch. Location updates only while online.'
                : 'GPS tracking is OFF while offline.'}
            </span>
          </div>

          <div className="font-mono text-stone-600 font-bold">
            Wallet: <span className="text-emerald-700 font-black">₹{currentWalletBalance.toFixed(2)}</span>
          </div>
        </div>

        {gpsError && (
          <div className="max-w-5xl mx-auto mt-2 p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
            {gpsError}
          </div>
        )}

        {/* Navigation Tabs Menu */}
        <div className="max-w-5xl mx-auto mt-3 pt-2 border-t border-stone-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* TAB 1: Receive & Accept Order (BEFORE live_pending) */}
          <button
            onClick={() => setActiveTab('receive_accept')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 cursor-pointer relative ${
              activeTab === 'receive_accept'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Inbox className="w-4 h-4 text-amber-300" />
            <span>Receive & Accept Order (অর্ডার গ্রহণ)</span>
            {availableOrders.length > 0 ? (
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce shadow-xs">
                {availableOrders.length} New
              </span>
            ) : (
              <span className="text-[10px] bg-stone-200/80 text-stone-600 px-1.5 py-0.2 rounded-full font-bold">
                0
              </span>
            )}
          </button>

          {/* TAB 2: Live Pending Delivery */}
          <button
            onClick={() => setActiveTab('live_pending')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'live_pending'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>Live Pending Delivery (চলমান ডেলিভারি)</span>
            {activeOrder && (
              <span className="flex items-center gap-1 bg-amber-300 text-stone-900 text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-900 animate-ping" />
                1 Active
              </span>
            )}
          </button>

          {/* TAB 3: Delivery History */}
          <button
            onClick={() => setActiveTab('delivery_history')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'delivery_history'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Delivery History (ডেলিভারি হিস্ট্রি)</span>
            <span className="text-[10px] bg-stone-200/80 text-stone-700 px-1.5 py-0.2 rounded-full font-bold">
              {historyOrders.length}
            </span>
          </button>

          {/* TAB 4: Commission & Payment */}
          <button
            onClick={() => setActiveTab('commission_payment')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'commission_payment'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Commission & Payment (কমিশন ও পেমেন্ট)</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-1.5 py-0.2 rounded-full font-black">
              ₹{currentWalletBalance.toFixed(0)}
            </span>
          </button>

          {/* TAB 5: Rider Profile & Settlement Method */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <User className="w-4 h-4 text-emerald-300" />
            <span>Profile (প্রোফাইল ও পেমেন্ট)</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        {/* Toast / Notification Banner */}
        {payoutSuccessMsg && (
          <div className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-top-2 text-xs sm:text-sm font-bold">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{payoutSuccessMsg}</span>
            </div>
            <button
              onClick={() => setPayoutSuccessMsg(null)}
              className="p-1 hover:bg-emerald-700 rounded-lg text-emerald-100 hover:text-white"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: RECEIVE & ACCEPT ORDER (নতুন অর্ডার গ্রহণ ও কনফার্মেশন - YES / NO) */}
        {/* ========================================================================= */}
        {activeTab === 'receive_accept' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                <div className="text-[11px] font-bold text-stone-400 uppercase">Incoming Requests</div>
                <div className="text-xl font-black font-mono text-emerald-600 mt-0.5 flex items-center gap-2">
                  <span>{availableOrders.length}</span>
                  {availableOrders.length > 0 && (
                    <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-sans font-bold animate-pulse">
                      Action Required
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                <div className="text-[11px] font-bold text-stone-400 uppercase">Current Rider Status</div>
                <div className="text-base font-black text-stone-800 mt-1 flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      partner.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'
                    }`}
                  />
                  <span>{partner.is_online ? 'Online (Ready)' : 'Offline'}</span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                <div className="text-[11px] font-bold text-stone-400 uppercase">Active Running Trip</div>
                <div className="text-base font-black text-stone-800 mt-1">
                  {activeOrder ? '1 Trip In-Progress' : '0 Idle'}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                <div className="text-[11px] font-bold text-stone-400 uppercase">Earning Per Order</div>
                <div className="text-xl font-black font-mono text-orange-600 mt-0.5">
                  ₹{minFareGuarantee} - ₹65
                </div>
              </div>
            </div>

            {/* Offline Warning Banner for Incoming Orders */}
            {!partner.is_online && (
              <div className="bg-amber-500 text-white p-4 rounded-3xl shadow-md flex flex-wrap items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-black">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>
                    আপনি বর্তমানে অফলাইনে আছেন। রেস্তোরাঁর রিকোয়েস্ট গ্রহণ ও অর্ডার রিসিভ করতে এখনই অনলাইন হন!
                  </span>
                </div>
                <button
                  onClick={handleToggleOnline}
                  className="bg-white text-amber-900 font-black text-xs px-5 py-2.5 rounded-2xl shadow-xs hover:bg-amber-50 cursor-pointer"
                >
                  ⚡ Go ONLINE Now
                </button>
              </div>
            )}

            {/* Section Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-stone-900 flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-emerald-600" />
                  <span>Receive & Accept Order Menu (অর্ডার গ্রহণ ও কনফার্ম)</span>
                  <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-black">
                    {availableOrders.length} Available
                  </span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  অর্ডার আসলে <strong>YES (অর্ডার গ্রহণ করুন)</strong> বা <strong>NO (বাতিল)</strong> করতে হবে। YES চাপলে অর্ডার অ্যাক্সেপ্ট হবে ও লাইভ পেন্ডিং ডেলিভারিতে যুক্ত হবে।
                </p>
              </div>

              {partner.is_online ? (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  Listening for restaurant orders
                </span>
              ) : (
                <span className="text-xs text-stone-500 font-bold bg-stone-100 px-3 py-1.5 rounded-xl">
                  Rider is Offline
                </span>
              )}
            </div>

            {/* Available Orders List with YES / NO Buttons */}
            {availableOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-2xs space-y-4">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-stone-100 text-emerald-600 flex items-center justify-center text-4xl shadow-inner">
                  🛵
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-stone-800 text-lg">
                    বর্তমানে কোনো নতুন অর্ডার রিকোয়েস্ট অপেক্ষমাণ নেই
                  </h4>
                  <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                    {partner.is_online
                      ? 'আপনি অনলাইনে আছেন! কাছাকাছি কোনো রেস্তোরাঁ থেকে ডেলিভারি রিকোয়েস্ট আসলেই এখানে সাউন্ড অ্যালার্ট বাজবে এবং YES / NO অপশন ভেসে উঠবে।'
                      : 'নতুন অর্ডার পেতে উপরে অনলাইন বাটনে ক্লিক করুন।'}
                  </p>
                </div>

                {activeOrder && (
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab('live_pending')}
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-5 py-2.5 rounded-2xl shadow-md transition-all cursor-pointer"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>View Current Active Trip (#{activeOrder.order_number})</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {availableOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white rounded-3xl p-5 border-2 border-emerald-500 shadow-xl space-y-4 animate-in slide-in-from-bottom-2 relative overflow-hidden"
                  >
                    {/* Top Order Meta */}
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-black text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md">
                            #{ord.order_number}
                          </span>
                          {Boolean(ord.rider_requested) ? (
                            <span className="text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-300 px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                              <BellRing className="w-3 h-3 text-red-600" />
                              <span>🚨 Restaurant Urgent Request</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-700 border border-blue-300 px-2 py-0.5 rounded-full">
                              ⚡ New Delivery Request
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-black text-stone-900 mt-1">
                          {ord.restaurant_name}
                        </h4>
                      </div>

                      <div className="text-right bg-emerald-50 px-3 py-1.5 rounded-2xl border border-emerald-200">
                        <div className="text-[10px] text-emerald-800 font-bold uppercase">
                          Rider Earning
                        </div>
                        <div className="text-xl font-black font-mono text-emerald-700">
                          ₹{ord.delivery_fee || 35}
                        </div>
                      </div>
                    </div>

                    {/* Locations Information */}
                    <div className="space-y-2.5 text-xs bg-stone-50 p-3.5 rounded-2xl border border-stone-100">
                      <div className="flex items-start gap-2.5">
                        <Store className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-extrabold text-stone-800">
                            1. Pickup: {ord.restaurant_name}
                          </div>
                          <div className="text-stone-600 text-[11px] leading-tight mt-0.5">
                            {ord.restaurant_address}
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-stone-200/60 pt-2 flex items-start gap-2.5">
                        <Home className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-extrabold text-stone-800">
                            2. Customer Drop: {ord.customer_name}
                          </div>
                          <div className="text-stone-600 text-[11px] leading-tight mt-0.5">
                            {ord.delivery_address}
                          </div>
                          {ord.delivery_landmark && (
                            <div className="text-[11px] text-stone-500 italic mt-0.5">
                              Landmark: {ord.delivery_landmark}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Items & Trip Distance Summary */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-stone-600 bg-stone-100/70 p-2.5 rounded-xl border border-stone-200/60 font-medium">
                      <span>
                        📦 <strong>{ord.items.length} food items</strong> ({ord.items.map((i) => `${i.quantity}x ${i.food_name}`).join(', ')})
                      </span>
                      <span className="font-bold text-stone-800">
                        📍 ~{(ord.distance_km || 2.5).toFixed(1)} km
                      </span>
                    </div>

                    {/* Payment Mode */}
                    <div className="text-[11px]">
                      {ord.payment_method === 'cod' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                          <DollarSign className="w-3.5 h-3.5 text-red-600" />
                          <span>Cash on Delivery: ₹{ord.grand_total} collect on drop</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Prepaid Online (No cash collection required)</span>
                        </span>
                      )}
                    </div>

                    {/* YES / NO Action Buttons */}
                    <div className="pt-2 border-t border-stone-100 grid grid-cols-2 gap-3">
                      {/* NO / Decline Button */}
                      <button
                        onClick={() => handleDeclineOrder(ord.id)}
                        className="bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 font-black text-xs py-3 px-3 rounded-2xl border-2 border-rose-300 flex items-center justify-center gap-1.5 transition-all transform active:scale-95 cursor-pointer shadow-xs"
                      >
                        <X className="w-4 h-4 text-rose-600" />
                        <span>NO (বাতিল করুন)</span>
                      </button>

                      {/* YES / Accept Button */}
                      <button
                        onClick={() => handleAcceptOrder(ord.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs py-3 px-3 rounded-2xl shadow-md flex items-center justify-center gap-1.5 transition-all transform active:scale-95 cursor-pointer"
                      >
                        <Check className="w-4 h-4 text-white" />
                        <span>YES (অর্ডার গ্রহণ করুন)</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: LIVE PENDING DELIVERY (লাইভ পেন্ডিং ডেলিভারি) */}
        {/* ========================================================================= */}
        {activeTab === 'live_pending' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                <div className="text-[11px] font-bold text-stone-400 uppercase">Available Wallet</div>
                <div className="text-xl font-black font-mono text-emerald-600 mt-0.5">
                  ₹{currentWalletBalance.toFixed(2)}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                <div className="text-[11px] font-bold text-stone-400 uppercase">Current Status</div>
                <div className="text-base font-black text-stone-800 mt-1 flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      partner.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'
                    }`}
                  />
                  <span>{partner.is_online ? 'Online (Ready)' : 'Offline'}</span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                <div className="text-[11px] font-bold text-stone-400 uppercase">Active Task</div>
                <div className="text-base font-black text-stone-800 mt-1">
                  {activeOrder ? '1 Trip In-Progress' : '0 Idle'}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                <div className="text-[11px] font-bold text-stone-400 uppercase">Earnings Per Trip</div>
                <div className="text-xl font-black font-mono text-orange-600 mt-0.5">
                  ₹{minFareGuarantee} - ₹65
                </div>
              </div>
            </div>

            {/* ACTIVE ASSIGNED ORDER WORKFLOW */}
            {activeOrder ? (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-emerald-500 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                        Active Delivery Task (চলমান ডেলিভারি)
                      </span>
                      <span className="text-xs font-mono font-bold text-stone-500">
                        #{activeOrder.order_number}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-stone-900 mt-1">
                      {activeOrder.restaurant_name} → {activeOrder.customer_name}
                    </h3>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-stone-400 font-bold uppercase">Rider Payout Fare</div>
                    <div className="text-xl font-black font-mono text-emerald-600">
                      ₹{activeOrder.delivery_fee || 35}
                    </div>
                  </div>
                </div>

                {/* Google Road Map Navigation */}
                <DeliveryLiveMap order={activeOrder} heightClass="h-[300px]" showNavigationButton={true} />

                {/* Workflow Navigation Steps */}
                <div className="space-y-3 pt-2">
                  {/* Stage 1: Heading to Restaurant / Pickup (when order is assigned, accepted, preparing, or ready) */}
                  {['assigned', 'accepted', 'preparing', 'ready'].includes(activeOrder.status) && (
                    <div className="p-4 sm:p-5 bg-orange-50/90 border-2 border-orange-300 rounded-3xl space-y-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1 min-w-[240px]">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase text-orange-900 bg-orange-200/80 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                              <Store className="w-4 h-4 text-orange-700" />
                              <span>Step 1: Pick Up from Restaurant (রেস্তোরাঁ থেকে খাবার গ্রহণ)</span>
                            </span>

                            {/* Food Prep Badge */}
                            {activeOrder.status === 'ready' ? (
                              <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                <CheckCircle className="w-3 h-3" />
                                <span>Food Ready & Packed</span>
                              </span>
                            ) : activeOrder.status === 'preparing' ? (
                              <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Kitchen Cooking in Progress</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 rounded-full">
                                Order Confirmed
                              </span>
                            )}
                          </div>

                          <div className="text-base font-black text-stone-900 pt-1">
                            {activeOrder.restaurant_name}
                          </div>
                          <div className="text-xs text-stone-700 flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                            <span>{activeOrder.restaurant_address}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 pt-1">
                            {activeOrder.restaurant_phone && (
                              <a
                                href={`tel:${activeOrder.restaurant_phone}`}
                                className="inline-flex items-center gap-1 text-xs font-bold bg-white text-orange-800 border border-orange-200 px-3 py-1.5 rounded-xl hover:bg-orange-100 transition-all"
                              >
                                <Phone className="w-3.5 h-3.5 text-orange-600" />
                                <span>Call Restaurant: {activeOrder.restaurant_phone}</span>
                              </a>
                            )}

                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${activeOrder.restaurant_lat},${activeOrder.restaurant_lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold bg-stone-900 text-white px-3 py-1.5 rounded-xl hover:bg-stone-800 transition-all shadow-xs"
                            >
                              <Navigation className="w-3.5 h-3.5 text-orange-400" />
                              <span>Open Restaurant Map</span>
                            </a>
                          </div>
                        </div>

                        {/* Handover Status and Action Buttons */}
                        <div className="w-full sm:w-auto flex flex-col gap-2">
                          {/* If rider has NOT formally accepted this assigned order yet */}
                          {(!activeOrder.rider_accepted || activeOrder.status === 'assigned') ? (
                            <button
                              type="button"
                              onClick={() => handleAcceptOrder(activeOrder.id)}
                              className="w-full sm:w-auto font-black text-xs sm:text-sm px-7 py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transform active:scale-95 transition-all text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 ring-4 ring-emerald-300 animate-bounce"
                            >
                              <CheckCircle className="w-5 h-5" />
                              <span>⚡ Receive & Accept Order (অর্ডার রিসিভ ও গ্রহণ করুন)</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(activeOrder.id, 'on_the_way')}
                              className={`w-full sm:w-auto font-black text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transform active:scale-95 transition-all text-white ${
                                activeOrder.is_handed_over
                                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 animate-pulse ring-2 ring-emerald-400'
                                  : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700'
                              }`}
                            >
                              <Bike className="w-4 h-4" />
                              <span>🚀 On The Way / খাবার নিয়ে বের হলাম (Start Delivery)</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* State Banner: Waiting for Rider Acceptance vs Restaurant Handover */}
                      {(!activeOrder.rider_accepted || activeOrder.status === 'assigned') ? (
                        <div className="p-3.5 rounded-2xl border bg-amber-100/90 border-amber-300 text-amber-950 font-bold text-xs flex items-center justify-between gap-2 shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 animate-pulse" />
                            <div>
                              <div className="font-extrabold text-xs">
                                🔔 নতুন ডেলিভারি অ্যাসাইন হয়েছে (Delivery Assigned)
                              </div>
                              <div className="text-[11px] text-amber-900 mt-0.5">
                                রেস্তোরাঁ ও গ্রাহককে নিশ্চিত করতে উপরে <strong>"Receive & Accept Order"</strong> বাটনে ক্লিক করুন।
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Handover Status from Restaurant */
                        <div
                          className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
                            activeOrder.is_handed_over
                              ? 'bg-emerald-100/90 border-emerald-300 text-emerald-950 font-bold'
                              : 'bg-amber-50 border-amber-200 text-amber-950'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {activeOrder.is_handed_over ? (
                              <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
                            ) : (
                              <Clock className="w-5 h-5 text-amber-700 shrink-0" />
                            )}
                            <div>
                              <div className="font-extrabold text-xs">
                                {activeOrder.is_handed_over
                                  ? '✓ রেস্তোরাঁ খাবার বুঝিয়ে দিয়েছে (Restaurant Handed Over Food)'
                                  : '⏳ রেস্তোরাঁর হ্যান্ডওভারের অপেক্ষা (Restaurant Handover)'}
                              </div>
                              <div className="text-[11px] text-stone-600 mt-0.5">
                                {activeOrder.is_handed_over
                                  ? 'খাবার প্যাকেট আপনার হাতে পৌঁছেছে। উপরে "🚀 On The Way" বাটনে ক্লিক করে গ্রাহকের ড্রপ লোকেশনে যাত্রা শুরু করুন।'
                                  : 'রেস্তোরাঁর কাউন্টারে খাবার সংগ্রহ করুন। রেস্তোরাঁ "Handover to Rider" করার সাথে সাথে আপনি "On The Way" ক্লিক করে যাত্রা শুরু করতে পারবেন।'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Items verification checklist */}
                      <div className="bg-white rounded-2xl p-3.5 border border-orange-200/80 space-y-2">
                        <div className="text-[11px] font-extrabold uppercase text-stone-500 tracking-wider flex items-center justify-between">
                          <span>Verify Order Items at Counter ({activeOrder.items?.length || 0} items):</span>
                          <span className="text-orange-700 font-bold">প্যাকেটের খাবার মিলিয়ে নিন</span>
                        </div>
                        <div className="space-y-1.5 text-xs text-stone-800 divide-y divide-stone-100">
                          {activeOrder.items?.map((item, idx) => (
                            <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between font-bold">
                              <span className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-md bg-orange-100 text-orange-800 text-[10px] font-black flex items-center justify-center">
                                  {item.quantity}x
                                </span>
                                <span>{item.food_name}</span>
                              </span>
                              <span className="font-mono text-stone-500 text-[11px]">₹{item.total_price}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="text-[11px] text-orange-950 bg-orange-100/90 p-2.5 rounded-xl border border-orange-300 flex items-center gap-2">
                        <Info className="w-4 h-4 text-orange-700 shrink-0" />
                        <span>
                          রেস্তোরাঁ থেকে খাবার প্যাকেট বুঝে নিয়ে <strong>"I Picked Up Food"</strong> বাটনে ক্লিক করলেই গ্রাহকের কাছে <strong>"Out for Delivery"</strong> লাইভ লোকেশন চালু হবে।
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Stage 2: En Route to Customer / Delivery */}
                  {(activeOrder.status === 'picked_up' || activeOrder.status === 'on_the_way') && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-xs font-black uppercase text-emerald-800 flex items-center gap-1.5">
                            <Home className="w-4 h-4 text-emerald-600" />
                            <span>Step 2: Deliver to Customer (গ্রাহককে খাবার দিন)</span>
                          </div>
                          <div className="text-sm font-black text-stone-900">
                            {activeOrder.customer_name}
                          </div>
                          <div className="text-xs text-stone-700">
                            {activeOrder.delivery_address}
                          </div>
                          {activeOrder.delivery_landmark && (
                            <div className="text-xs text-stone-500 italic">
                              Landmark: {activeOrder.delivery_landmark}
                            </div>
                          )}
                          {activeOrder.customer_phone && (
                            <a
                              href={`tel:${activeOrder.customer_phone}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline pt-1"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Call Customer: {activeOrder.customer_phone}</span>
                            </a>
                          )}
                        </div>

                        <button
                          onClick={() => handleUpdateOrderStatus(activeOrder.id, 'delivered')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-6 py-3.5 rounded-2xl shadow-xl whitespace-nowrap cursor-pointer transform active:scale-95 transition-all"
                        >
                          Mark as Delivered ✓
                        </button>
                      </div>

                      {activeOrder.payment_method === 'cod' ? (
                        <div className="p-3 bg-red-100/90 border border-red-300 rounded-xl text-xs text-red-950 font-black flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-red-700 shrink-0" />
                          <span>⚠️ CASH ON DELIVERY: গ্রাহকের কাছ থেকে মোট ₹{activeOrder.grand_total} ক্যাশ গ্রহণ করুন।</span>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-emerald-100/80 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>Prepaid Order (অনলাইনে পরিশোধিত)। গ্রাহকের থেকে টাকা নেওয়ার প্রয়োজন নেই।</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* No Active Order in Live Pending */
              <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 shadow-2xs space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-stone-100 text-stone-600 flex items-center justify-center text-3xl">
                  🧭
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-stone-800 text-base">
                    বর্তমানে কোনো চলমান ডেলিভারি ট্রিপ নেই (No Active Running Trip)
                  </h4>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    নতুন অর্ডার গ্রহণ করতে <strong>"Receive & Accept Order"</strong> মেনুতে যান। সেখানে নতুন রিকোয়েস্ট আসলে YES বাটনে চাপ দিয়ে ট্রিপ শুরু করুন।
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('receive_accept')}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-6 py-3 rounded-2xl shadow-md cursor-pointer transition-all"
                  >
                    <Inbox className="w-4 h-4 text-amber-300" />
                    <span>Go to Receive & Accept Order ({availableOrders.length} Available)</span>
                  </button>
                </div>
              </div>
            )}

            {/* If Available orders exist, show banner in live_pending as well */}
            {availableOrders.length > 0 && (
              <div className="bg-emerald-50 border-2 border-emerald-400 p-4 rounded-3xl shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-emerald-950">
                  <Inbox className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    ⚡ {availableOrders.length}টি নতুন ডেলিভারি রিকোয়েস্ট অপেক্ষমাণ আছে! YES / NO করতে অর্ডার গ্রহণ মেনুতে যান।
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('receive_accept')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <span>Go to Receive & Accept</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: DELIVERY HISTORY (ডেলিভারি হিস্ট্রি) */}
        {/* ========================================================================= */}
        {activeTab === 'delivery_history' && (
          <div className="space-y-5 animate-in fade-in">
            {/* History Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-2xl">
                  <button
                    onClick={() => setHistoryTimeFilter('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      historyTimeFilter === 'all'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    All History ({historyOrders.length})
                  </button>
                  <button
                    onClick={() => setHistoryTimeFilter('today')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      historyTimeFilter === 'today'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Today (আজকের)
                  </button>
                  <button
                    onClick={() => setHistoryTimeFilter('week')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      historyTimeFilter === 'week'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    This Week (এই সপ্তাহে)
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Search by order #, restaurant..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-emerald-500"
                  />
                  {historySearchQuery && (
                    <button
                      onClick={() => setHistorySearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* History Summary Stats */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-100 text-center">
                <div className="bg-stone-50 p-2.5 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-stone-400">Filtered Trips</div>
                  <div className="text-base font-black text-stone-800">{filteredHistory.length}</div>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-stone-400">Total Delivery Earned</div>
                  <div className="text-base font-black font-mono text-emerald-600">
                    ₹{filteredHistory.reduce((sum, o) => sum + (o.delivery_fee || 35), 0)}
                  </div>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-stone-400">Avg / Trip</div>
                  <div className="text-base font-black font-mono text-orange-600">
                    ₹{filteredHistory.length ? Math.round(filteredHistory.reduce((sum, o) => sum + (o.delivery_fee || 35), 0) / filteredHistory.length) : 0}
                  </div>
                </div>
              </div>
            </div>

            {/* List of Delivered / Past Orders */}
            {filteredHistory.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 text-stone-400 text-xs">
                No delivery history found matching your filters.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-2xs space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-stone-900">
                          #{ord.order_number}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            ord.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {ord.status === 'delivered' ? 'Completed ✓' : ord.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-stone-400">
                          {new Date(ord.delivered_at || ord.placed_at).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span className="font-mono text-base font-black text-emerald-600">
                          +₹{ord.delivery_fee || 35}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="flex items-start gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                        <Store className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-stone-900">{ord.restaurant_name}</div>
                          <div className="text-[11px] text-stone-500 line-clamp-1">
                            {ord.restaurant_address}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                        <Home className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-stone-900">{ord.customer_name}</div>
                          <div className="text-[11px] text-stone-500 line-clamp-1">
                            {ord.delivery_address}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                      <div>
                        Payment: <strong className="text-stone-700 uppercase">{ord.payment_method}</strong> ({ord.payment_status})
                      </div>
                      <div className="font-semibold text-stone-600">
                        Total Order: ₹{ord.grand_total} ({ord.items?.length || 0} items)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: COMMISSION & DIRECT SETTLEMENT (কমিশন ও সরাসরি সেটেলমেন্ট) */}
        {/* ========================================================================= */}
        {activeTab === 'commission_payment' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Big Wallet Balance & Payout Action Hero */}
            <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-900 rounded-3xl p-6 text-white shadow-xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-200 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-300" />
                    <span>Total Direct Earnings Received (সরাসরি পেমেন্ট মেথডে প্রাপ্ত মোট উপার্জন)</span>
                  </span>
                  <div className="text-3xl sm:text-4xl font-black font-mono mt-1">
                    ₹{currentTotalEarned.toFixed(2)}
                  </div>
                  <p className="text-xs text-emerald-200/90 mt-1">
                    নো ওয়ালেট অপশন - আপনার অর্জিত রাইডার চার্জ সরাসরি আপনার প্রোফাইলে যুক্ত ইউপিআই / ব্যাংক অ্যাকাউন্টে সেটেল হয়।
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <span>Payment Method in Profile (প্রোফাইলের পেমেন্ট মেথড)</span>
                  </button>
                </div>
              </div>

              {/* Financial Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-white/15 text-xs">
                <div className="bg-black/20 backdrop-blur-xs p-3 rounded-2xl">
                  <div className="text-[10px] text-emerald-200 uppercase font-bold">Lifetime Gross Earned</div>
                  <div className="text-lg font-black font-mono mt-0.5">₹{currentTotalEarned.toFixed(2)}</div>
                </div>

                <div className="bg-black/20 backdrop-blur-xs p-3 rounded-2xl">
                  <div className="text-[10px] text-emerald-200 uppercase font-bold">Direct Settled to Bank/UPI</div>
                  <div className="text-lg font-black font-mono mt-0.5">₹{(currentTotalEarned - currentWalletBalance > 0 ? currentTotalEarned : currentTotalEarned).toFixed(2)}</div>
                </div>

                <div className="bg-black/20 backdrop-blur-xs p-3 rounded-2xl col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-emerald-200 uppercase font-bold">Platform Fee Deducted</div>
                  <div className="text-lg font-black font-mono text-amber-300 mt-0.5">
                    {commissionRate}% (Rider receives {100 - commissionRate}%)
                  </div>
                </div>
              </div>
            </div>

            {/* Payout Details & Commission Rules Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Linked Bank / UPI Account */}
              <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>Saved Payment Settlement Account</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                  >
                    Edit in Profile
                  </button>
                </div>

                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400">Primary UPI ID:</span>
                    <strong className="font-mono text-stone-800 font-bold">
                      {partnerUpiId || payoutAccount?.upi_id || `${partner?.phone || ''}@upi`}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400">Bank Name:</span>
                    <strong className="text-stone-800 font-bold">
                      {partnerBankName || payoutAccount?.bank_name || 'State Bank of India'}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400">Account Number:</span>
                    <strong className="font-mono text-stone-800 font-bold">
                      {partnerBankAccountNo || payoutAccount?.account_number || '•••• •••• 4421'}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400">IFSC Code:</span>
                    <strong className="font-mono text-stone-800 font-bold">
                      {partnerBankIfsc || payoutAccount?.ifsc_code || 'SBIN0001234'}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400">Beneficiary Name:</span>
                    <strong className="text-stone-800 font-bold">
                      {partnerBankAccountHolder || payoutAccount?.beneficiary_name || partner?.name || 'Rider'}
                    </strong>
                  </div>
                </div>

                <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Direct NEFT / IMPS / UPI transfer directly to your verified account by Admin.</span>
                </div>
              </div>

              {/* Commission Structure & FAQ */}
              <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-2xs space-y-4">
                <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                  <span>Delivery Partner Commission & Payout Policy</span>
                </h3>

                <div className="space-y-2.5 text-xs text-stone-700">
                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
                    <div className="font-bold text-stone-900">1. ৯0% রাইডার শেয়ার (Rider Share):</div>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      প্রতিটি ডেলিভারির গ্রাহক ফি থেকে আপনি পাচ্ছেন <strong>{100 - commissionRate}%</strong> নিট অর্থ এবং প্ল্যাটফর্ম সার্ভিস চার্জ মাত্র <strong>{commissionRate}%</strong>।
                    </p>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
                    <div className="font-bold text-stone-900">2. মিনিমাম গ্যারান্টি ফেয়ার (Min Fare Guarantee):</div>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      প্রতি ট্রিপে সর্বনিম্ন <strong>₹{minFareGuarantee}</strong> গ্যারান্টিযুক্ত। দূরত্ব বৃদ্ধি পেলে অতিরিক্ত কিমি অনুযায়ী আয় বৃদ্ধি পায়।
                    </p>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
                    <div className="font-bold text-stone-900">3. সরাসরি পেমেন্ট সেটেলমেন্ট (Direct Payment Settlement):</div>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      আপনার অর্জিত টাকা সরাসরি আপনার দেওয়া ইউপিআই বা ব্যাংক অ্যাকাউন্টে ট্রান্সফার ও সেটেল করে দেওয়া হয়। কোনো ওয়ালেটের ঝামেলা নেই।
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payout & Commission Transaction History */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Recent Commission & Withdrawal Ledger (লেনদেনের বিবরণী)</span>
                </h3>
                <span className="text-xs text-stone-400 font-mono">
                  {transactions.length} Transactions
                </span>
              </div>

              {transactions.length === 0 ? (
                <div className="bg-stone-50 rounded-2xl p-8 text-center text-stone-400 text-xs">
                  No transaction history recorded yet. Complete deliveries to see your commission ledger!
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {transactions.map((txn) => (
                    <div key={txn.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                            txn.type === 'credit'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {txn.type === 'credit' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-stone-900">{txn.description}</div>
                          <div className="text-[11px] text-stone-400">
                            {new Date(txn.created_at).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`font-mono text-sm font-black ${
                          txn.type === 'credit' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {txn.type === 'credit' ? `+₹${txn.amount.toFixed(2)}` : `-₹${txn.amount.toFixed(2)}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: RIDER PROFILE & PAYMENT DETAILS (রাইডার প্রোফাইল ও পেমেন্ট পদ্ধতি) */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
            {/* Header Hero */}
            <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-stone-900 text-white p-6 rounded-3xl shadow-lg flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={profilePhoto || partner.profile_photo || partner.passport_photo || (partner as any).photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                    alt={partner.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-300 shadow-md bg-stone-800"
                  />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white bg-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-200 uppercase tracking-wider">
                    <Bike className="w-4 h-4" />
                    <span>Delivery Partner Profile & Bank Details</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black mt-0.5">
                    {profileName || partner.name}
                  </h2>
                  <p className="text-xs text-emerald-100/90 mt-0.5">
                    ID #{partner.id} • {profileVehicleType.toUpperCase()} ({profileVehicleNumber || partner.vehicle_number || 'WB-01'})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveRiderProfile}
                disabled={isSavingPartnerProfile}
                className="bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs px-5 py-2.5 rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-emerald-600" />
                <span>{isSavingPartnerProfile ? 'Saving...' : 'Save Profile (সেভ করুন)'}</span>
              </button>
            </div>

            {/* Profile Feedback Toast */}
            {partnerProfileFeedback && (
              <div
                className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in slide-in-from-top-2 ${
                  partnerProfileFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                    : 'bg-red-50 text-red-900 border border-red-300'
                }`}
              >
                <span>{partnerProfileFeedback.text}</span>
                <button
                  onClick={() => setPartnerProfileFeedback(null)}
                  className="font-black hover:opacity-75 ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleSaveRiderProfile} className="space-y-6">
              {/* SECTION 1: PERSONAL & VEHICLE DETAILS */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-2xs space-y-4">
                <div className="border-b border-stone-100 pb-2 flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>Personal Details & Vehicle Information (ব্যক্তিগত ও গাড়ির তথ্য)</span>
                  </h3>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full uppercase">
                    Rider Profile
                  </span>
                </div>

                {/* Profile Photo Upload */}
                <div className="flex items-center gap-4 bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-stone-200 border-2 border-dashed border-stone-300 shrink-0">
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="Rider" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <Camera className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="text-xs font-bold text-stone-800">Rider Photo / Selfie (রাইডারের ছবি)</div>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer bg-stone-900 hover:bg-stone-800 text-white rounded-xl py-1.5 px-3 text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleRiderPhotoUpload}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        value={profilePhoto}
                        onChange={(e) => setProfilePhoto(e.target.value)}
                        placeholder="Or photo URL (https://...)"
                        className="flex-1 bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-[11px] text-stone-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Full Name (সম্পূর্ণ নাম) <span className="text-emerald-700">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="e.g. Rahul Sen"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Phone Number (ফোন নম্বর) <span className="text-emerald-700">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="+91..."
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Age (বয়স)
                    </label>
                    <input
                      type="number"
                      value={profileAge}
                      onChange={(e) => setProfileAge(e.target.value)}
                      placeholder="e.g. 26"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Gender (লিঙ্গ)
                    </label>
                    <select
                      value={profileGender}
                      onChange={(e) => setProfileGender(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                    >
                      <option value="male">Male (পুরুষ)</option>
                      <option value="female">Female (মহিলা)</option>
                      <option value="other">Other (অন্যান্য)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Residential Address (স্থায়ী ঠিকানা) <span className="text-emerald-700">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      placeholder="Village / Town, Police Station, District, PIN"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Vehicle Type (গাড়ির ধরন) <span className="text-emerald-700">*</span>
                    </label>
                    <select
                      value={profileVehicleType}
                      onChange={(e) => setProfileVehicleType(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                    >
                      <option value="bike">🛵 Motorbike (মোটরবাইক)</option>
                      <option value="scooter">🛵 Scooter (স্কুটার)</option>
                      <option value="electric_ev">⚡ Electric EV (ইলেকট্রিক স্কুটার)</option>
                      <option value="bicycle">🚲 Bicycle (সাইকেল)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Vehicle Number (গাড়ির নম্বর)
                    </label>
                    <input
                      type="text"
                      value={profileVehicleNumber}
                      onChange={(e) => setProfileVehicleNumber(e.target.value)}
                      placeholder="e.g. WB-01-BK-4589"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Driving License Number (ড্রাইভিং লাইসেন্স নং)
                    </label>
                    <input
                      type="text"
                      value={profileDrivingLicense}
                      onChange={(e) => setProfileDrivingLicense(e.target.value)}
                      placeholder="e.g. DL-0420110012345"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-900 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Aadhaar Card Number (আধার নম্বর)
                    </label>
                    <input
                      type="text"
                      value={profileAadhaarNumber}
                      onChange={(e) => setProfileAadhaarNumber(e.target.value)}
                      placeholder="e.g. 8921 4412 9021"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-900"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: PAYMENT SETTLEMENT DETAILS (UPI OR BANK ACCOUNT) */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-2xs space-y-5">
                <div className="border-b border-stone-100 pb-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>Rider Payout & Settlement Details (রাইডার পেমেন্ট পাওয়ার পদ্ধতি)</span>
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      অ্যাডমিন প্যানেল থেকে আপনার ডেলিভারি কমিশন ও উপার্জিত টাকা এই ইউপিআই বা ব্যাংক অ্যাকাউন্টে পাঠাবেন।
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                    Direct Admin Payout
                  </span>
                </div>

                {/* Method Selection Toggle */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPartnerPaymentMethod('upi')}
                    className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      partnerPaymentMethod === 'upi'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>UPI ID & Scanner QR (ইউপিআই)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPartnerPaymentMethod('bank')}
                    className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      partnerPaymentMethod === 'bank'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>Bank Account & Passbook (ব্যাংক অ্যাকাউন্ট)</span>
                  </button>
                </div>

                {/* 1. UPI Mode Form */}
                {partnerPaymentMethod === 'upi' && (
                  <div className="bg-emerald-50/40 rounded-2xl p-4 border border-emerald-200 space-y-4 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        UPI ID (যেমন: rahulsen@okaxis / 9800000005@paytm) <span className="text-emerald-700">*</span>
                      </label>
                      <input
                        type="text"
                        value={partnerUpiId}
                        onChange={(e) => setPartnerUpiId(e.target.value)}
                        placeholder="e.g. rahulsen@okhdfcbank"
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
                          {partnerUpiQrPhoto ? (
                            <img src={partnerUpiQrPhoto} alt="UPI QR" className="w-full h-full object-cover" />
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
                            <span>Upload Scanner QR</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleRiderUpiQrUpload}
                              className="hidden"
                            />
                          </label>

                          <input
                            type="text"
                            value={partnerUpiQrPhoto}
                            onChange={(e) => setPartnerUpiQrPhoto(e.target.value)}
                            placeholder="Or enter image URL (https://...)"
                            className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-[11px] text-stone-700"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Bank Account Mode Form */}
                {partnerPaymentMethod === 'bank' && (
                  <div className="bg-emerald-50/40 rounded-2xl p-4 border border-emerald-200 space-y-4 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">
                          Bank Name (ব্যাংকের নাম) <span className="text-emerald-700">*</span>
                        </label>
                        <input
                          type="text"
                          value={partnerBankName}
                          onChange={(e) => setPartnerBankName(e.target.value)}
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
                          value={partnerBankAccountHolder}
                          onChange={(e) => setPartnerBankAccountHolder(e.target.value)}
                          placeholder="e.g. Rahul Sen"
                          className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">
                          Bank Account Number (অ্যাকাউন্ট নং) <span className="text-emerald-700">*</span>
                        </label>
                        <input
                          type="text"
                          value={partnerBankAccountNo}
                          onChange={(e) => setPartnerBankAccountNo(e.target.value)}
                          placeholder="e.g. 919800004589"
                          className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-stone-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">
                          IFSC Code (আইএফএসসি কোড) <span className="text-emerald-700">*</span>
                        </label>
                        <input
                          type="text"
                          value={partnerBankIfsc}
                          onChange={(e) => setPartnerBankIfsc(e.target.value)}
                          placeholder="e.g. SBIN0001458"
                          className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-stone-900 uppercase"
                        />
                      </div>
                    </div>

                    {/* Passbook Photo Upload */}
                    <div className="space-y-2 pt-2 border-t border-emerald-200">
                      <label className="block text-xs font-bold text-stone-800">
                        Upload Bank Passbook / Cancelled Cheque Photo (পাসবুকের ছবি)
                      </label>

                      <div className="flex items-center gap-3">
                        <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-emerald-300 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                          {partnerBankPassbookPhoto ? (
                            <img src={partnerBankPassbookPhoto} alt="Passbook" className="w-full h-full object-cover" />
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
                              onChange={handleRiderPassbookUpload}
                              className="hidden"
                            />
                          </label>

                          <input
                            type="text"
                            value={partnerBankPassbookPhoto}
                            onChange={(e) => setPartnerBankPassbookPhoto(e.target.value)}
                            placeholder="Or enter passbook image URL (https://...)"
                            className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-[11px] text-stone-700"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Save Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingPartnerProfile}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm px-7 py-3 rounded-2xl shadow-lg transition-all cursor-pointer active:scale-95 flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingPartnerProfile ? 'Saving All Details...' : 'Save Rider Profile & Details (সেভ করুন)'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: PAYOUT WITHDRAWAL REQUEST */}
      {/* ========================================================================= */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-stone-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  💰
                </div>
                <div>
                  <h3 className="font-black text-stone-900 text-base">Withdraw Rider Earnings</h3>
                  <p className="text-xs text-stone-500">টাকা তোলার আবেদন ফর্ম</p>
                </div>
              </div>
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="p-1 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayout} className="space-y-4">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs flex justify-between items-center">
                <span className="text-emerald-800 font-bold">Available Balance:</span>
                <span className="text-lg font-black font-mono text-emerald-700">
                  ₹{currentWalletBalance.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Withdrawal Amount (টাকার পরিমাণ) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-stone-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="50"
                    max={currentWalletBalance}
                    step="1"
                    required
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="e.g. 250"
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl pl-8 pr-4 py-2.5 text-sm font-bold text-stone-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Minimum withdrawal: ₹50. Maximum: ₹{currentWalletBalance.toFixed(0)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Payout Method (পেমেন্ট পদ্ধতি)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('upi')}
                    className={`p-3 rounded-2xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      payoutMethod === 'upi'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-black'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    UPI Transfer (GPay/PhonePe)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('bank')}
                    className={`p-3 rounded-2xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      payoutMethod === 'bank'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-black'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    Bank NEFT / IMPS
                  </button>
                </div>
              </div>

              {payoutMethod === 'upi' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    UPI ID (Virtual Payment Address)
                  </label>
                  <input
                    type="text"
                    value={customUpi || payoutAccount?.upi_id || `${partner.phone}@upi`}
                    onChange={(e) => setCustomUpi(e.target.value)}
                    placeholder="e.g. yourname@okaxis"
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2 text-xs font-mono text-stone-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {payoutMethod === 'bank' && (
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs space-y-1">
                  <div className="text-stone-500 font-bold">Transferring to:</div>
                  <div className="text-stone-900 font-bold">{payoutAccount?.bank_name || 'State Bank of India'}</div>
                  <div className="text-stone-700 font-mono">A/C: {payoutAccount?.account_number || '•••• •••• 4421'}</div>
                  <div className="text-stone-700 font-mono">IFSC: {payoutAccount?.ifsc_code || 'SBIN0001234'}</div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs py-3 rounded-2xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayout || !Number(payoutAmount) || Number(payoutAmount) < 50}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs py-3 rounded-2xl shadow-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                >
                  {isSubmittingPayout ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Confirm & Withdraw ✓</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT PAYOUT ACCOUNT DETAILS */}
      {/* ========================================================================= */}
      {isEditAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-stone-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-black text-stone-900 text-base">Update Payout Settlement Info</h3>
                <p className="text-xs text-stone-500">ব্যাংক ও ইউপিআই বিবরণী আপডেট করুন</p>
              </div>
              <button
                onClick={() => setIsEditAccountModalOpen(false)}
                className="p-1 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayoutMethod} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  UPI ID (GPay / PhonePe / Paytm)
                </label>
                <input
                  type="text"
                  required
                  value={editUpiId}
                  onChange={(e) => setEditUpiId(e.target.value)}
                  placeholder="e.g. 9800000005@paytm"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Account Beneficiary Name
                </label>
                <input
                  type="text"
                  required
                  value={editBeneficiaryName}
                  onChange={(e) => setEditBeneficiaryName(e.target.value)}
                  placeholder="e.g. Rahul Sen"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={editBankName}
                    onChange={(e) => setEditBankName(e.target.value)}
                    placeholder="e.g. SBI, HDFC"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={editIfscCode}
                    onChange={(e) => setEditIfscCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SBIN0001234"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono uppercase text-stone-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={editAccountNumber}
                  onChange={(e) => setEditAccountNumber(e.target.value)}
                  placeholder="e.g. 1002938475892"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditAccountModalOpen(false)}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAccount}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl shadow-md cursor-pointer"
                >
                  {isSavingAccount ? 'Saving...' : 'Save Details ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
