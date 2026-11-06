import React, { useState } from 'react';
import {
  X,
  User,
  Store,
  Bike,
  ShieldCheck,
  ShieldAlert,
  CheckCircle,
  Upload,
  Eye,
  EyeOff,
  Lock,
  ArrowRight,
  Camera,
  FileText,
  Check,
  AlertCircle,
  LogIn,
  Phone,
  Calendar,
  MapPin,
  RefreshCw,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { UserRole } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: UserRole | null;
}

type Step = 'role_selection' | 'google_accounts' | 'register_buyer' | 'register_seller' | 'register_delivery' | 'admin_login';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialRole
}) => {
  const { googleAuth, registerRole, adminLogin, isLoading } = useAuth();
  const { language } = useLanguage();

  const [step, setStep] = useState<Step>(() => {
    if (initialRole === 'admin') return 'admin_login';
    return 'role_selection';
  });
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole || 'customer');
  const [errorMsg, setErrorMsg] = useState('');

  // Google Account simulated identity
  const [activeGoogleUser, setActiveGoogleUser] = useState({
    name: 'Animesh Bera',
    email: 'beraanimesh008@gmail.com',
    photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
  });
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

  // 1. Buyer Form State
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerDob, setBuyerDob] = useState('');
  const [buyerGender, setBuyerGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerPassportPhoto, setBuyerPassportPhoto] = useState('');

  // 2. Seller Form State
  const [sellerRestName, setSellerRestName] = useState('');
  const [sellerRestPhoto, setSellerRestPhoto] = useState('');
  const [sellerOwnerName, setSellerOwnerName] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');
  const [sellerLicenseNo, setSellerLicenseNo] = useState('');
  const [sellerDocPhoto, setSellerDocPhoto] = useState('');
  const [sellerSelfDelivery, setSellerSelfDelivery] = useState<boolean>(false);
  const [sellerSelfDeliveryRadius, setSellerSelfDeliveryRadius] = useState<number>(3);

  // 3. Delivery Partner Form State
  const [riderName, setRiderName] = useState('');
  const [riderAge, setRiderAge] = useState('24');
  const [riderGender, setRiderGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [riderPhone, setRiderPhone] = useState('');
  const [riderVehicleType, setRiderVehicleType] = useState<'cycle' | 'bike' | 'toto' | 'scooter' | 'ev'>('bike');
  const [riderVehicleNumber, setRiderVehicleNumber] = useState('');
  const [riderVehiclePhoto, setRiderVehiclePhoto] = useState('');
  const [riderPassportPhoto, setRiderPassportPhoto] = useState('');
  const [riderAadhaarNo, setRiderAadhaarNo] = useState('');
  const [riderAadhaarPhoto, setRiderAadhaarPhoto] = useState('');

  // 4. Admin Login Form State
  const [adminUsername, setAdminUsername] = useState('admin@aharlocal.com');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [showAdminPass, setShowAdminPass] = useState(false);

  if (!isOpen) return null;

  // Handle Photo file conversion and compression to Base64 for instant upload
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert('File size exceeds 20MB. Please choose a smaller photo.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const rawBase64 = reader.result as string;
        // Compress image using HTML Canvas
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
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
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            setter(compressed);
          } else {
            setter(rawBase64);
          }
        };
        img.onerror = () => {
          setter(rawBase64);
        };
        img.src = rawBase64;
      };
      reader.readAsDataURL(file);
    }
  };

  // Google Login Initiator for a role
  const handleSelectRoleGoogle = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg('');
    setStep('google_accounts');
  };

  // User chooses a Google Account
  const handlePickGoogleAccount = async (account: { name: string; email: string; photo: string }) => {
    setActiveGoogleUser(account);
    setErrorMsg('');
    try {
      const res = await googleAuth(account.email, account.name, account.photo, selectedRole);

      if (res.isNewUser) {
        // Prepopulate names
        if (selectedRole === 'customer') {
          setBuyerName(account.name);
          setStep('register_buyer');
        } else if (selectedRole === 'restaurant') {
          setSellerOwnerName(account.name);
          setStep('register_seller');
        } else if (selectedRole === 'delivery') {
          setRiderName(account.name);
          setStep('register_delivery');
        }
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Authentication failed');
    }
  };

  // Buyer Registration Submit
  const handleBuyerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!buyerName || !buyerPhone || !buyerDob || !buyerAddress) {
      setErrorMsg('All fields marked with * are required (সবগুলো প্রয়োজনীয় তথ্য দিন)');
      return;
    }

    try {
      await registerRole({
        role: 'customer',
        name: buyerName,
        email: activeGoogleUser.email,
        phone: buyerPhone,
        dob: buyerDob,
        gender: buyerGender,
        address: buyerAddress,
        passport_photo: buyerPassportPhoto || activeGoogleUser.photo,
        auth_provider: 'google'
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Buyer registration failed');
    }
  };

  // Seller Registration Submit
  const handleSellerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!sellerRestName || !sellerOwnerName || !sellerPhone || !sellerAddress) {
      setErrorMsg('Please fill all mandatory restaurant details (রেস্তোরাঁর প্রয়োজনীয় তথ্য দিন)');
      return;
    }

    try {
      await registerRole({
        role: 'restaurant',
        name: sellerOwnerName,
        ownerName: sellerOwnerName,
        email: activeGoogleUser.email,
        phone: sellerPhone,
        restaurantName: sellerRestName,
        restaurantPhoto: sellerRestPhoto || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
        address: sellerAddress,
        licenseNumber: sellerLicenseNo || 'APPLIED',
        documentPhoto: sellerDocPhoto || undefined,
        self_delivery_enabled: sellerSelfDelivery,
        self_delivery_radius_km: sellerSelfDeliveryRadius,
        auth_provider: 'google'
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Restaurant registration failed');
    }
  };

  // Delivery Partner Registration Submit
  const handleRiderRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!riderName || !riderPhone || !riderAge || !riderAadhaarNo) {
      setErrorMsg('Please fill all mandatory delivery partner details (রাইডারের প্রয়োজনীয় তথ্য দিন)');
      return;
    }

    try {
      await registerRole({
        role: 'delivery',
        name: riderName,
        email: activeGoogleUser.email,
        phone: riderPhone,
        age: Number(riderAge),
        gender: riderGender,
        vehicle_type: riderVehicleType,
        vehicle_number: riderVehicleNumber || 'WB-PENDING',
        vehicle_photo: riderVehiclePhoto || undefined,
        passport_photo: riderPassportPhoto || activeGoogleUser.photo,
        aadhaar_number: riderAadhaarNo,
        aadhaar_photo: riderAadhaarPhoto || undefined,
        auth_provider: 'google'
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Delivery Partner registration failed');
    }
  };

  // Admin Login Submit
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!adminUsername || !adminPassword) {
      setErrorMsg('User ID and Password are required (আইডি এবং পাসওয়ার্ড দিন)');
      return;
    }

    try {
      await adminLogin(adminUsername, adminPassword);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Admin login failed. Check credentials.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-100 text-stone-900 flex flex-col overflow-y-auto animate-in fade-in duration-200 min-h-screen">
      {/* Full Screen Top Navigation Bar */}
      <div className="bg-stone-900 text-white px-6 py-4 shadow-md sticky top-0 z-10 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-black text-xl shadow-md">
              আ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight text-white">
                  AharLocal Access & Registration Portal
                </h3>
                <span className="text-[10px] font-bold bg-orange-500/30 text-orange-300 border border-orange-400/30 px-2 py-0.5 rounded-full">
                  Full Screen Portal
                </span>
              </div>
              <p className="text-xs text-stone-400">
                লগইন ও নিবন্ধন পোর্টাল • Buyer • Seller • Delivery Partner • Admin
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-stone-200 hover:text-white text-xs font-extrabold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-white/10 shadow-xs"
          >
            <X className="w-4 h-4" />
            <span>Close Portal (অ্যাপে ফিরে যান)</span>
          </button>
        </div>
      </div>

      {/* Full Screen Content Wrapper */}
      <div className="max-w-6xl mx-auto w-full flex-1 p-4 sm:p-8 flex flex-col justify-center my-auto">
        <div className="bg-white rounded-3xl shadow-xl border border-stone-200 p-6 sm:p-8 overflow-hidden">

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: ROLE SELECTION WITH VISUAL BOXES */}
          {step === 'role_selection' && (
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <h2 className="text-xl font-black text-stone-900">
                  Select Your Account Category (আপনার ধরন বেছে নিন)
                </h2>
                <p className="text-xs text-stone-500">
                  Choose how you want to join AharLocal. Sign in easily with your Google Account.
                </p>
              </div>

              {/* 3 Main Role Boxes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. BUYER (CUSTOMER) BOX */}
                <div
                  onClick={() => handleSelectRoleGoogle('customer')}
                  className="group relative bg-white rounded-3xl border-2 border-stone-200 hover:border-blue-500 p-4 transition-all hover:shadow-xl cursor-pointer flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="h-36 w-full rounded-2xl overflow-hidden relative">
                      <img
                        src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80"
                        alt="Buyer Food Delivery"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
                        <span className="bg-blue-600 text-white text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full shadow">
                          Buyer / গ্রাহক
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-stone-900 group-hover:text-blue-600 transition-colors">
                        Order Delicious Food (ক্রেতা)
                      </h4>
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                        ঘরের কাছের সেরা রেস্তোরাঁ থেকে গরম সুস্বাদু খাবার অর্ডার করুন। লাইভ জিপিএস লোকেশনে দ্রুত ডেলিভারি।
                      </p>
                    </div>

                    <div className="bg-blue-50/70 rounded-xl p-2.5 text-[11px] text-blue-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Simple Registration Requirements:</span>
                      </div>
                      <div className="text-blue-800/80 leading-tight">
                        Name, Mobile, DOB, Gender, Address & Passport Photo (Strictly Private).
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-4 w-full bg-blue-600 group-hover:bg-blue-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {/* Google G SVG */}
                    <svg className="w-3.5 h-3.5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                </div>

                {/* 2. SELLER (RESTAURANT) BOX */}
                <div
                  onClick={() => handleSelectRoleGoogle('restaurant')}
                  className="group relative bg-white rounded-3xl border-2 border-stone-200 hover:border-orange-500 p-4 transition-all hover:shadow-xl cursor-pointer flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="h-36 w-full rounded-2xl overflow-hidden relative">
                      <img
                        src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80"
                        alt="Restaurant Food Seller"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
                        <span className="bg-orange-600 text-white text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full shadow">
                          Seller / রেস্তোরাঁ
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-stone-900 group-hover:text-orange-600 transition-colors">
                        Grow Food Business (বিক্রেতা)
                      </h4>
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                        আপনার রেস্তোরাঁ বা হোম-কিচেন নথিভুক্ত করুন। স্থানীয় গ্রাহকদের কাছে পৌঁছে খাবার বিক্রি বাড়িয়ে তুলুন।
                      </p>
                    </div>

                    <div className="bg-orange-50/70 rounded-xl p-2.5 text-[11px] text-orange-950 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-orange-600" />
                        <span>Restaurant Registration:</span>
                      </div>
                      <div className="text-orange-900/80 leading-tight">
                        Store Name, Outside Photo, Owner Contact, Address, License No & Doc Photo (Optional).
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-4 w-full bg-orange-600 group-hover:bg-orange-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Seller Google Login</span>
                  </button>
                </div>

                {/* 3. DELIVERY PARTNER BOX */}
                <div
                  onClick={() => handleSelectRoleGoogle('delivery')}
                  className="group relative bg-white rounded-3xl border-2 border-stone-200 hover:border-emerald-500 p-4 transition-all hover:shadow-xl cursor-pointer flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="h-36 w-full rounded-2xl overflow-hidden relative">
                      <img
                        src="https://images.unsplash.com/photo-1617347454431-f49d7ff5c3b1?w=800&auto=format&fit=crop&q=80"
                        alt="Delivery Partner Rider"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
                        <span className="bg-emerald-600 text-white text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full shadow">
                          Rider / ডেলিভারি পার্টনার
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-stone-900 group-hover:text-emerald-600 transition-colors">
                        Earn per Kilometer (রাইডার)
                      </h4>
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                        প্রতি কিলোমিটার অনুযায়ী স্বচ্ছ ফেয়ারে আয় করুন। ফ্লেক্সিবল টাইমে নিজের বাইক বা স্কুটিতে অর্ডার ডেলিভারি দিন।
                      </p>
                    </div>

                    <div className="bg-emerald-50/70 rounded-xl p-2.5 text-[11px] text-emerald-950 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <Bike className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Rider Registration:</span>
                      </div>
                      <div className="text-emerald-900/80 leading-tight">
                        Name, Age, Gender, Mobile, Passport Photo, Aadhaar Card Number & Photo.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-4 w-full bg-emerald-600 group-hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Rider Google Login</span>
                  </button>
                </div>
              </div>

              {/* 4. ADMIN LOGIN BOX */}
              <div className="bg-stone-900 text-white rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-stone-800 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-500/40 text-purple-400 flex items-center justify-center font-bold text-xl shrink-0">
                    <ShieldAlert className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <span>Administrator Access (অ্যাডমিন পোর্টাল)</span>
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-400/30 px-2 py-0.5 rounded font-mono">
                        Password Auth
                      </span>
                    </h4>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Authorized platform administrators can sign in directly using User ID & Password.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setStep('admin_login');
                  }}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-black px-5 py-2.5 rounded-2xl shadow transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Admin Login (অ্যাডমিন প্রবেশ)</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: GOOGLE ACCOUNT SELECTION SIMULATION */}
          {step === 'google_accounts' && (
            <div className="max-w-md mx-auto space-y-5 animate-in fade-in">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto shadow-inner">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
                <h3 className="text-base font-black text-stone-900">
                  Choose a Google Account to continue as {selectedRole.toUpperCase()}
                </h3>
                <p className="text-xs text-stone-500">
                  Select your Google profile to sign in or proceed to registration
                </p>
              </div>

              {/* Account List */}
              <div className="space-y-2 border border-stone-200 rounded-2xl p-2 bg-stone-50/60 shadow-2xs">
                {/* 1. Primary User Google Account */}
                <button
                  type="button"
                  onClick={() =>
                    handlePickGoogleAccount({
                      name: 'Animesh Bera',
                      email: 'beraanimesh008@gmail.com',
                      photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
                    })
                  }
                  className="w-full flex items-center justify-between p-3 bg-white hover:bg-orange-50/80 rounded-xl border border-stone-200 transition-all text-left shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
                      alt="Animesh Bera"
                      className="w-10 h-10 rounded-full object-cover border border-stone-200"
                    />
                    <div>
                      <div className="text-xs font-extrabold text-stone-900 flex items-center gap-1.5">
                        <span>Animesh Bera</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                          Primary
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500">beraanimesh008@gmail.com</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-400" />
                </button>

                {/* 2. Demo Buyer Account */}
                <button
                  type="button"
                  onClick={() =>
                    handlePickGoogleAccount({
                      name: 'Priyanka Sen',
                      email: 'priyanka@aharlocal.com',
                      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
                    })
                  }
                  className="w-full flex items-center justify-between p-3 bg-white hover:bg-orange-50/80 rounded-xl border border-stone-200 transition-all text-left shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
                      alt="Priyanka Sen"
                      className="w-10 h-10 rounded-full object-cover border border-stone-200"
                    />
                    <div>
                      <div className="text-xs font-extrabold text-stone-900">Priyanka Sen</div>
                      <div className="text-[11px] text-stone-500">priyanka@aharlocal.com</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-400" />
                </button>

                {/* 3. Demo Seller Account */}
                <button
                  type="button"
                  onClick={() =>
                    handlePickGoogleAccount({
                      name: 'Subrata Ghosh (Kitchen)',
                      email: 'kolkatabiryani@aharlocal.com',
                      photo: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150'
                    })
                  }
                  className="w-full flex items-center justify-between p-3 bg-white hover:bg-orange-50/80 rounded-xl border border-stone-200 transition-all text-left shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150"
                      alt="Subrata Ghosh"
                      className="w-10 h-10 rounded-full object-cover border border-stone-200"
                    />
                    <div>
                      <div className="text-xs font-extrabold text-stone-900">Subrata Ghosh</div>
                      <div className="text-[11px] text-stone-500">kolkatabiryani@aharlocal.com</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-400" />
                </button>

                {/* 4. Demo Rider Account */}
                <button
                  type="button"
                  onClick={() =>
                    handlePickGoogleAccount({
                      name: 'Rahul Sen (Rider)',
                      email: 'rahul.delivery@aharlocal.com',
                      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
                    })
                  }
                  className="w-full flex items-center justify-between p-3 bg-white hover:bg-orange-50/80 rounded-xl border border-stone-200 transition-all text-left shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
                      alt="Rahul Sen"
                      className="w-10 h-10 rounded-full object-cover border border-stone-200"
                    />
                    <div>
                      <div className="text-xs font-extrabold text-stone-900">Rahul Sen</div>
                      <div className="text-[11px] text-stone-500">rahul.delivery@aharlocal.com</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-400" />
                </button>
              </div>

              {/* Custom Google Account Entry */}
              <div className="pt-2 border-t border-stone-200 space-y-2">
                <div className="text-xs font-bold text-stone-700">Or use another Google Account:</div>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Your Full Name (e.g. Joydeb Das)"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-hidden focus:border-orange-500"
                  />
                  <input
                    type="email"
                    placeholder="Your Google Email (e.g. joydeb@gmail.com)"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-hidden focus:border-orange-500"
                  />
                  <button
                    type="button"
                    disabled={!customGoogleEmail || !customGoogleName}
                    onClick={() =>
                      handlePickGoogleAccount({
                        name: customGoogleName,
                        email: customGoogleEmail,
                        photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
                      })
                    }
                    className="w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl transition-all"
                  >
                    Authenticate with this Google Account
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep('role_selection')}
                className="w-full text-center text-xs font-bold text-stone-500 hover:text-stone-800 py-1"
              >
                ← Back to Role Selection
              </button>
            </div>
          )}

          {/* STEP 3: BUYER (CUSTOMER) REGISTRATION FORM */}
          {step === 'register_buyer' && (
            <form onSubmit={handleBuyerRegister} className="max-w-xl mx-auto space-y-5 animate-in fade-in">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={activeGoogleUser.photo}
                    alt="Google Avatar"
                    className="w-10 h-10 rounded-full border border-blue-300"
                  />
                  <div>
                    <div className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                      <span>{activeGoogleUser.name}</span>
                      <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-bold">
                        Google Verified
                      </span>
                    </div>
                    <div className="text-[11px] text-blue-800">{activeGoogleUser.email}</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-white px-2.5 py-1 rounded-xl border border-blue-200 shadow-2xs">
                  Buyer Form
                </span>
              </div>

              <div className="space-y-4 text-xs">
                {/* Customer Name */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Customer Name (গ্রাহকের নাম) *
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Enter full customer name"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-hidden focus:border-blue-600"
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Mobile Number (মোবাইল নম্বর) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-xs">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="98765 43210"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-12 pr-3 py-2.5 text-xs font-bold font-mono focus:outline-hidden focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* DOB */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Date of Birth (জন্মতারিখ) *
                    </label>
                    <input
                      type="date"
                      required
                      value={buyerDob}
                      onChange={(e) => setBuyerDob(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-hidden focus:border-blue-600"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Gender (লিঙ্গ) *
                    </label>
                    <div className="flex gap-2">
                      {(['Male', 'Female', 'Other'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setBuyerGender(g)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                            buyerGender === g
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Delivery Address */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Current Address (বর্তমান ঠিকানা) *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    placeholder="House/Flat No, Street, Locality, Kolkata 700019"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs font-medium focus:outline-hidden focus:border-blue-600"
                  />
                  {/* Live GPS Access Callout */}
                  <div className="mt-1.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>লাইভ জিপিএস লোকেশন নোট:</strong> খাবার অর্ডার করার সময় আপনার ব্রাউজার থেকে সরাসরি লাইভ জিপিএস লোকেশন (GPS Live Location) এক্সেস করা হবে যাতে রেস্তোরাঁ থেকে সঠিক দূরত্ব অনুযায়ী ডেলিভারি ফেয়ার কার্টে স্বয়ংক্রিয়ভাবে হিসাব হয়।
                    </span>
                  </div>
                </div>

                {/* Upload Passport Photo with Privacy Protection Guarantee */}
                <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-extrabold text-stone-900 block">
                        Upload Passport Size Photo (পাসপোর্ট সাইজ ফটো আপলোড) *
                      </label>
                      <p className="text-[11px] text-stone-500">
                        Clear headshot photograph for your customer identity
                      </p>
                    </div>

                    {buyerPassportPhoto && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Uploaded</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-16 h-20 rounded-xl border-2 border-dashed border-stone-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      {buyerPassportPhoto ? (
                        <img
                          src={buyerPassportPhoto}
                          alt="Customer Passport Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className="w-6 h-6 text-stone-400" />
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, setBuyerPassportPhoto)}
                        className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setBuyerPassportPhoto('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300')}
                          className="text-[10px] font-bold text-blue-700 underline"
                        >
                          Use Sample Photo 1
                        </button>
                        <button
                          type="button"
                          onClick={() => setBuyerPassportPhoto('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300')}
                          className="text-[10px] font-bold text-blue-700 underline"
                        >
                          Use Sample Photo 2
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* STRICT PRIVACY BANNER */}
                  <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-[11px] flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-purple-900">গোপনীয়তা ও সিকিউরিটি গ্যারান্টি (Privacy Guarantee):</strong>
                      <p className="mt-0.5 leading-relaxed text-purple-800">
                        আপনার এই পাসপোর্ট ফটো শুধুমাত্র প্ল্যাটফর্ম অ্যাডমিন এবং আপনার নিজস্ব ক্রেতা প্রোফাইলে দেখা যাবে। কোনো রেস্তোরাঁ (সেলার) বা ডেলিভারি পার্টনার এই ফটো দেখতে পারবে না।
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('role_selection')}
                  className="px-4 py-2.5 rounded-2xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs py-3 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  <span>Complete Buyer Registration (নিবন্ধন সম্পন্ন করুন)</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: SELLER (RESTAURANT) REGISTRATION FORM */}
          {step === 'register_seller' && (
            <form onSubmit={handleSellerRegister} className="max-w-xl mx-auto space-y-5 animate-in fade-in">
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={activeGoogleUser.photo}
                    alt="Google Avatar"
                    className="w-10 h-10 rounded-full border border-orange-300"
                  />
                  <div>
                    <div className="text-xs font-black text-orange-950 flex items-center gap-1.5">
                      <span>{activeGoogleUser.name}</span>
                      <span className="text-[10px] bg-orange-600 text-white px-1.5 py-0.2 rounded font-bold">
                        Google Verified Seller
                      </span>
                    </div>
                    <div className="text-[11px] text-orange-800">{activeGoogleUser.email}</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-orange-700 bg-white px-2.5 py-1 rounded-xl border border-orange-200 shadow-2xs">
                  Seller Form
                </span>
              </div>

              <div className="space-y-4 text-xs">
                {/* Restaurant Name */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Restaurant Name (রেস্তোরাঁর নাম) *
                  </label>
                  <input
                    type="text"
                    required
                    value={sellerRestName}
                    onChange={(e) => setSellerRestName(e.target.value)}
                    placeholder="e.g. Kolkata Biryani & Sweets"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-hidden focus:border-orange-600"
                  />
                </div>

                {/* Owner Name */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Owner Name (মালিকের নাম) *
                  </label>
                  <input
                    type="text"
                    required
                    value={sellerOwnerName}
                    onChange={(e) => setSellerOwnerName(e.target.value)}
                    placeholder="Enter owner's full legal name"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-hidden focus:border-orange-600"
                  />
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Contact Number (যোগাযোগের মোবাইল নম্বর) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={sellerPhone}
                    onChange={(e) => setSellerPhone(e.target.value)}
                    placeholder="+91 98300 12345"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold font-mono focus:outline-hidden focus:border-orange-600"
                  />
                </div>

                {/* Restaurant Address */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Restaurant Address (রেস্তোরাঁর সম্পূর্ণ ঠিকানা) *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={sellerAddress}
                    onChange={(e) => setSellerAddress(e.target.value)}
                    placeholder="Shop No, Market Road, Ballygunge, Kolkata 700019"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs font-medium focus:outline-hidden focus:border-orange-600"
                  />
                </div>

                {/* Restaurant License Number (OPTIONAL) */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Restaurant License No (FSSAI / ট্রেড লাইসেন্স নম্বর)
                    <span className="ml-1 text-stone-500 font-bold text-[11px]">(ঐচ্ছিক / Not mandatory)</span>
                  </label>
                  <input
                    type="text"
                    value={sellerLicenseNo}
                    onChange={(e) => setSellerLicenseNo(e.target.value)}
                    placeholder="e.g. FSSAI-2026-998877 (যদি থাকে)"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold font-mono focus:outline-hidden focus:border-orange-600"
                  />
                </div>

                {/* Delivery by Restaurant Option (রেস্তোরাঁর নিজস্ব ডেলিভারি ব্যবস্থা) */}
                <div className="border border-stone-200 rounded-2xl p-4 bg-orange-50/50 space-y-3">
                  <div>
                    <label className="font-extrabold text-stone-900 block text-xs">
                      Delivery by Restaurant (রেস্তোরাঁ কি নিজস্ব লোক দিয়ে ডেলিভারি করবে?) *
                    </label>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      নিজস্ব ডেলিভারি সার্ভিস চালু রাখলে নির্দিষ্ট ব্যাসার্ধের ভেতর আপনার নিজের লোক পাঠাতে পারবেন।
                    </p>
                  </div>

                  {/* Yes / No Toggle Radio Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSellerSelfDelivery(true)}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        sellerSelfDelivery
                          ? 'bg-orange-600 text-white border-orange-600 shadow-xs font-extrabold'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100 font-bold'
                      }`}
                    >
                      <span>Yes (হ্যাঁ, নিজস্ব ডেলিভারি করবো)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSellerSelfDelivery(false)}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        !sellerSelfDelivery
                          ? 'bg-stone-800 text-white border-stone-800 shadow-xs font-extrabold'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100 font-bold'
                      }`}
                    >
                      <span>No (না, প্ল্যাটফর্ম রাইডার দিয়ে করবো)</span>
                    </button>
                  </div>

                  {/* Radius Selection when Yes is selected */}
                  {sellerSelfDelivery && (
                    <div className="pt-2 border-t border-orange-200/60 space-y-2 animate-in fade-in">
                      <label className="font-bold text-stone-800 block text-xs">
                        Delivery Radius (কত কিমি ব্যাসার্ধ পর্যন্ত নিজস্ব ডেলিভারি করবেন?) *
                      </label>

                      <div className="grid grid-cols-3 gap-2">
                        {[3, 5, 10].map((radius) => (
                          <button
                            key={radius}
                            type="button"
                            onClick={() => setSellerSelfDeliveryRadius(radius)}
                            className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                              sellerSelfDeliveryRadius === radius
                                ? 'bg-orange-600 text-white border-orange-600 ring-2 ring-orange-500/30'
                                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                            }`}
                          >
                            {radius} KM (কিমি)
                          </button>
                        ))}
                      </div>

                      <p className="text-[10px] text-stone-600 font-medium italic mt-1 bg-white p-2 rounded-lg border border-orange-200/80">
                        ℹ️ <strong>নোট:</strong> {sellerSelfDeliveryRadius} কিমির বাইরের অর্ডারের ক্ষেত্রে স্বয়ংক্রিয়ভাবে AharLocal প্ল্যাটফর্ম ডেলিভারি পার্টনার (Rider) নিয়োগ করা হবে।
                      </p>
                    </div>
                  )}
                </div>

                {/* Outside Photo Upload */}
                <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-extrabold text-stone-900 block">
                        Restaurant Photo Outside (রেস্তোরাঁর বাইরের / সম্মুখভাগের ছবি) *
                      </label>
                      <p className="text-[11px] text-stone-500">
                        Help customers and riders recognize your storefront
                      </p>
                    </div>
                    {sellerRestPhoto && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        ✓ Photo Ready
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-24 h-16 rounded-xl border border-stone-300 bg-white overflow-hidden shrink-0 shadow-2xs">
                      {sellerRestPhoto ? (
                        <img
                          src={sellerRestPhoto}
                          alt="Storefront Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400">
                          <Store className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, setSellerRestPhoto)}
                        className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-600 file:text-white hover:file:bg-orange-700 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => setSellerRestPhoto('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600')}
                        className="text-[10px] font-bold text-orange-700 underline block"
                      >
                        Use Sample Storefront Photo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Document Photo Upload (NOT MANDATORY) */}
                <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-extrabold text-stone-900 block">
                        Document Photo (লাইসেন্স বা ট্রেড নথির ছবি)
                        <span className="ml-1.5 text-stone-500 font-bold text-[11px]">
                          (ঐচ্ছিক / Not Mandatory)
                        </span>
                      </label>
                      <p className="text-[11px] text-stone-500">
                        Upload your FSSAI certificate or trade document if available
                      </p>
                    </div>
                    {sellerDocPhoto && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        ✓ Attached
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-20 h-16 rounded-xl border border-stone-300 bg-white overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                      {sellerDocPhoto ? (
                        <img
                          src={sellerDocPhoto}
                          alt="Document Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText className="w-6 h-6 text-stone-400" />
                      )}
                    </div>
                    <div className="space-y-1 flex-1">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileUpload(e, setSellerDocPhoto)}
                        className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-stone-800 file:text-white hover:file:bg-stone-900 cursor-pointer"
                      />
                      <span className="text-[10px] text-stone-400 block">
                        Optional: You can provide this later during admin verification
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('role_selection')}
                  className="px-4 py-2.5 rounded-2xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-extrabold text-xs py-3 rounded-2xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Store className="w-4 h-4" />}
                  <span>Submit Restaurant Application (আবেদন জমা দিন)</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 5: DELIVERY PARTNER REGISTRATION FORM */}
          {step === 'register_delivery' && (
            <form onSubmit={handleRiderRegister} className="max-w-xl mx-auto space-y-5 animate-in fade-in">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={activeGoogleUser.photo}
                    alt="Google Avatar"
                    className="w-10 h-10 rounded-full border border-emerald-300"
                  />
                  <div>
                    <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      <span>{activeGoogleUser.name}</span>
                      <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">
                        Google Verified Rider
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-800">{activeGoogleUser.email}</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                  Rider Form
                </span>
              </div>

              <div className="space-y-4 text-xs">
                {/* Rider Name */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Delivery Partner Name (রাইডারের নাম) *
                  </label>
                  <input
                    type="text"
                    required
                    value={riderName}
                    onChange={(e) => setRiderName(e.target.value)}
                    placeholder="Enter full legal name as per Aadhaar"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-hidden focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Age */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Age (বয়স) *
                    </label>
                    <input
                      type="number"
                      required
                      min="18"
                      max="65"
                      value={riderAge}
                      onChange={(e) => setRiderAge(e.target.value)}
                      placeholder="e.g. 24"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold font-mono focus:outline-hidden focus:border-emerald-600"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Gender (লিঙ্গ) *
                    </label>
                    <div className="flex gap-2">
                      {(['Male', 'Female', 'Other'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setRiderGender(g)}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                            riderGender === g
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Mobile Number (মোবাইল নম্বর) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-xs">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      value={riderPhone}
                      onChange={(e) => setRiderPhone(e.target.value)}
                      placeholder="98300 55443"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-12 pr-3 py-2.5 text-xs font-bold font-mono focus:outline-hidden focus:border-emerald-600"
                    />
                  </div>
                </div>

                {/* Vehicle Selection & Photo Upload */}
                <div className="border border-emerald-200 bg-emerald-50/50 rounded-2xl p-4 space-y-3">
                  <div className="font-extrabold text-stone-900 flex items-center justify-between">
                    <span>What Vehicle Do You Have? (আপনার কী বাহন আছে?) *</span>
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                      Vehicle Details
                    </span>
                  </div>

                  {/* Vehicle Type Dropdown / Selectable Cards */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cycle', label: 'Bicycle (সাইকেল)', icon: '🚲' },
                      { id: 'bike', label: 'Bike / Scooty (বাইক/স্কুটি)', icon: '🛵' },
                      { id: 'toto', label: 'Toto / Auto / EV (টোটো/ইভি)', icon: '🛺' }
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setRiderVehicleType(v.id as any)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          riderVehicleType === v.id
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-black'
                            : 'bg-white text-stone-800 border-stone-200 hover:bg-emerald-50'
                        }`}
                      >
                        <span className="text-xl">{v.icon}</span>
                        <span className="text-[11px] leading-tight font-bold">{v.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Vehicle Number (Optional for Cycle & Toto) */}
                  {riderVehicleType !== 'cycle' && (
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">
                        Vehicle Registration Number (গাড়ির নম্বর)
                        <span className="ml-1.5 text-stone-500 font-bold text-[11px]">(ঐচ্ছিক / Not mandatory)</span>
                      </label>
                      <input
                        type="text"
                        value={riderVehicleNumber}
                        onChange={(e) => setRiderVehicleNumber(e.target.value)}
                        placeholder="e.g. WB 24 X 1234 (যদি থাকে)"
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold font-mono focus:outline-hidden focus:border-emerald-600"
                      />
                    </div>
                  )}

                  {/* Vehicle Photo Upload */}
                  <div className="pt-2 border-t border-emerald-200/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-extrabold text-stone-900 block">
                        Upload Vehicle Picture (বাহন/গাড়ির ছবি আপলোড করুন) *
                      </label>
                      {riderVehiclePhoto && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          ✓ Vehicle Photo Uploaded
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-20 h-16 rounded-xl border border-stone-300 bg-white overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                        {riderVehiclePhoto ? (
                          <img
                            src={riderVehiclePhoto}
                            alt="Vehicle Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">
                            {riderVehicleType === 'cycle' ? '🚲' : riderVehicleType === 'toto' ? '🛺' : '🛵'}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, setRiderVehiclePhoto)}
                          className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setRiderVehiclePhoto(
                              riderVehicleType === 'cycle'
                                ? 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=500'
                                : riderVehicleType === 'toto'
                                ? 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=500'
                                : 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=500'
                            )
                          }
                          className="text-[10px] font-bold text-emerald-700 underline block"
                        >
                          Use Sample Vehicle Photo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Passport Size Photo Upload */}
                <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-extrabold text-stone-900 block">
                        Passport Size Photo (পাসপোর্ট সাইজ ছবি) *
                      </label>
                      <p className="text-[11px] text-stone-500">
                        Official driver photo displayed on delivery badges
                      </p>
                    </div>
                    {riderPassportPhoto && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        ✓ Photo Ready
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-16 h-20 rounded-xl border-2 border-dashed border-stone-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      {riderPassportPhoto ? (
                        <img
                          src={riderPassportPhoto}
                          alt="Rider Passport Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className="w-6 h-6 text-stone-400" />
                      )}
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, setRiderPassportPhoto)}
                        className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => setRiderPassportPhoto('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300')}
                        className="text-[10px] font-bold text-emerald-700 underline block"
                      >
                        Use Sample Rider Photo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Aadhaar Number */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Aadhaar Card Number (১২ ডিজিট আধার নম্বর) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    value={riderAadhaarNo}
                    onChange={(e) => setRiderAadhaarNo(e.target.value)}
                    placeholder="1234 5678 9012"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold font-mono focus:outline-hidden focus:border-emerald-600"
                  />
                </div>

                {/* Aadhaar Photo Upload */}
                <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-extrabold text-stone-900 block">
                        Aadhaar Card Photo (আধার কার্ডের ছবি) *
                      </label>
                      <p className="text-[11px] text-stone-500">
                        Upload front photo of your Aadhaar card for KYC verification
                      </p>
                    </div>
                    {riderAadhaarPhoto && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        ✓ Card Uploaded
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-24 h-16 rounded-xl border border-stone-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      {riderAadhaarPhoto ? (
                        <img
                          src={riderAadhaarPhoto}
                          alt="Aadhaar Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText className="w-6 h-6 text-stone-400" />
                      )}
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, setRiderAadhaarPhoto)}
                        className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-stone-800 file:text-white hover:file:bg-stone-900 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => setRiderAadhaarPhoto('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600')}
                        className="text-[10px] font-bold text-emerald-700 underline block"
                      >
                        Attach Sample Verification Card
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('role_selection')}
                  className="px-4 py-2.5 rounded-2xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs py-3 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bike className="w-4 h-4" />}
                  <span>Submit Rider Application (আবেদন জমা দিন)</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 6: ADMIN LOGIN FORM (USER ID & PASSWORD) */}
          {step === 'admin_login' && (
            <form onSubmit={handleAdminLoginSubmit} className="max-w-md mx-auto space-y-5 animate-in fade-in">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-xs font-bold">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-stone-900">
                  Admin Command Login (অ্যাডমিন প্রবেশ)
                </h3>
                <p className="text-xs text-stone-500">
                  Enter your Administrator credentials to manage rates, approvals & platform settings
                </p>
              </div>

              <div className="space-y-4 text-xs">
                {/* User ID / Email */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Admin User ID / Email (অ্যাডমিন ইউজার আইডি) *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="admin@aharlocal.com or admin"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold font-mono focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Password (পাসওয়ার্ড) *
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPass ? 'text' : 'password'}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-mono font-bold pr-10 focus:outline-hidden focus:border-purple-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPass(!showAdminPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                    >
                      {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Quick Demo Credentials Autofill */}
                <div className="bg-purple-50 rounded-2xl p-3 border border-purple-200 flex items-center justify-between">
                  <div className="text-[11px] text-purple-900">
                    <div className="font-bold">Demo Credentials:</div>
                    <div className="font-mono text-stone-600">admin@aharlocal.com / admin123</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminUsername('admin@aharlocal.com');
                      setAdminPassword('admin123');
                    }}
                    className="bg-purple-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-purple-700 shadow-2xs"
                  >
                    Auto-Fill
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('role_selection')}
                  className="px-4 py-2.5 rounded-2xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold text-xs py-3 rounded-2xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>Unlock Admin Operations</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  </div>
);
};
