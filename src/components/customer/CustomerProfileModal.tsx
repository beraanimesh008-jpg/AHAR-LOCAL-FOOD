import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  ShieldCheck,
  Calendar,
  Phone,
  MapPin,
  Lock,
  Camera,
  CheckCircle,
  AlertCircle,
  CreditCard,
  QrCode,
  Building2,
  Upload,
  Save,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { apiRequest } from '../../services/api';

interface CustomerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  isOpen,
  onClose
}) => {
  const { user, refreshUser } = useAuth();
  const { language } = useLanguage();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');

  // Payment details state (UPI / Bank Account)
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'bank'>('upi');
  const [upiId, setUpiId] = useState('');
  const [upiQrPhoto, setUpiQrPhoto] = useState('');

  const [bankName, setBankName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankPassbookPhoto, setBankPassbookPhoto] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccessToast, setShowSaveSuccessToast] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setDob(user.dob || '');
      setGender(user.gender || 'Not specified');
      setAddress(user.address || '');
      setProfilePhoto(user.profile_photo || user.passport_photo || '');

      setPaymentMethod((user.payment_method as any) === 'bank' ? 'bank' : 'upi');
      setUpiId(user.upi_id || '');
      setUpiQrPhoto(user.upi_qr_photo || '');

      setBankName(user.bank_name || '');
      setBankAccountNo(user.bank_account_no || '');
      setBankAccountHolder(user.bank_account_holder || user.name || '');
      setBankIfsc(user.bank_ifsc || '');
      setBankPassbookPhoto(user.bank_passbook_photo || '');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) => {
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
            setter(canvas.toDataURL('image/jpeg', 0.82));
          } else {
            setter(rawBase64);
          }
        };
        img.onerror = () => setter(rawBase64);
        img.src = rawBase64;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedbackMsg(null);

    try {
      const payload = {
        name,
        phone,
        dob,
        gender,
        address,
        profile_photo: profilePhoto,
        passport_photo: profilePhoto,
        payment_method: paymentMethod,
        upi_id: upiId,
        upi_qr_photo: upiQrPhoto,
        bank_name: bankName,
        bank_account_no: bankAccountNo,
        bank_account_holder: bankAccountHolder,
        bank_ifsc: bankIfsc,
        bank_passbook_photo: bankPassbookPhoto
      };

      const res = await apiRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      try {
        await refreshUser();
      } catch (_) {}

      // Update local storage if user was stored
      const stored = localStorage.getItem('aharlocal_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const updated = { ...parsed, ...payload };
          localStorage.setItem('aharlocal_user', JSON.stringify(updated));
        } catch (_) {}
      }

      setFeedbackMsg({
        type: 'success',
        text: '✅ পেমেন্ট মেথড ও প্রোফাইল সফলভাবে সেভ হয়েছে! (Payment & profile details saved successfully)'
      });
      setShowSaveSuccessToast(true);

      setTimeout(() => {
        setFeedbackMsg(null);
        setShowSaveSuccessToast(false);
      }, 5000);
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to update profile'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-xl max-h-[92vh] rounded-3xl shadow-2xl border border-stone-200 overflow-hidden relative flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-sm relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/90 flex items-center justify-center font-bold text-white shadow-md border border-white/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Customer Profile (ক্রেতার প্রোফাইল)</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Prepaid Only
                </span>
              </h3>
              <p className="text-[11px] text-blue-200">
                Personal details & Refund payment method configuration
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-stone-200 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Success Toast Overlay */}
        {showSaveSuccessToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-2xl border-2 border-emerald-300 flex items-center gap-3 animate-in zoom-in-95 duration-200 w-[90%] max-w-md">
            <div className="w-9 h-9 rounded-full bg-white text-emerald-800 flex items-center justify-center font-black text-lg shadow-md shrink-0">
              ✓
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-black text-xs sm:text-sm text-white">Save Successful! (পেমেন্ট মেথড সেভ হয়েছে!)</div>
              <div className="text-[11px] text-emerald-100 font-medium truncate mt-0.5">
                {paymentMethod === 'upi'
                  ? `Saved UPI ID: ${upiId || 'Updated'}`
                  : `Saved Bank: ${bankName || 'Updated'} (${bankAccountNo || ''})`}
              </div>
            </div>
            <button
              onClick={() => setShowSaveSuccessToast(false)}
              className="text-emerald-200 hover:text-white font-black text-xs shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Scrollable Form Content */}
        <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          
          {feedbackMsg && (
            <div
              className={`p-3 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* SECTION 1: Personal Details */}
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <span className="font-extrabold text-stone-900 text-xs flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                <span>Personal Information (ব্যক্তিগত তথ্য)</span>
              </span>
              <span className="text-[10px] text-stone-500 font-mono">{user.email}</span>
            </div>

            {/* Photo & Name Grid */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Photo Preview & Upload */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-blue-400 overflow-hidden flex items-center justify-center shadow-xs">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-stone-300" />
                  )}
                </div>
                <label className="absolute inset-0 bg-black/40 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer">
                  <Camera className="w-4 h-4" />
                  <span className="text-[9px] font-bold">Change</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, setProfilePhoto)}
                  />
                </label>
              </div>

              <div className="flex-1 w-full space-y-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                    Full Name (নাম)
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-bold text-stone-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                      Phone (মোবাইল)
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-bold text-stone-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                      Date of Birth
                    </label>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-bold text-stone-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                  Gender (লিঙ্গ)
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-bold text-stone-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="Not specified">Not specified</option>
                  <option value="Male">Male (পুরুষ)</option>
                  <option value="Female">Female (মহিলা)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                  Delivery Address (ঠিকানা)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House, street, locality, landmark"
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-medium text-stone-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Payment & Refund Details (UPI / Bank Account) */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/70 p-4 rounded-2xl border-2 border-indigo-200 space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
              <div>
                <span className="font-black text-indigo-950 text-xs flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span>Refund & Payment Details (রিফান্ড ও পেমেন্ট মাধ্যম)</span>
                </span>
                <p className="text-[10px] text-indigo-700 mt-0.5">
                  অর্ডার বাতিল বা রিফান্ডের সময় অ্যাডমিন এই মাধ্যমে সরাসরি টাকা ফেরত পাঠাতে পারবেন।
                </p>
              </div>
            </div>

            {/* Payment Method Selector Toggle Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                  paymentMethod === 'upi'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>UPI ID & Scanner (ইউপিআই)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bank')}
                className={`py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                  paymentMethod === 'bank'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Bank Account (ব্যাংক একাউন্ট)</span>
              </button>
            </div>

            {/* UPI Form */}
            {paymentMethod === 'upi' && (
              <div className="bg-white p-3.5 rounded-2xl border border-indigo-200 space-y-3 animate-in fade-in">
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                    UPI ID (ইউপিআই আইডি টাইপ করুন) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. yourname@oksbi / 9800000000@paytm"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono font-bold text-xs text-stone-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <span className="absolute right-3 top-2 text-[10px] font-black text-blue-600 uppercase">
                      UPI
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                    UPI QR Scanner Photo Upload (ইউপিআই কিউআর কোড ছবি আপলোড করুন)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl border border-dashed border-stone-300 bg-stone-50 overflow-hidden flex items-center justify-center shrink-0">
                      {upiQrPhoto ? (
                        <img src={upiQrPhoto} alt="UPI QR" className="w-full h-full object-cover" />
                      ) : (
                        <QrCode className="w-6 h-6 text-stone-300" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-extrabold text-[11px] cursor-pointer border border-blue-200 transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{upiQrPhoto ? 'Replace QR Code' : 'Upload QR Photo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, setUpiQrPhoto)}
                        />
                      </label>
                      <p className="text-[10px] text-stone-400">
                        PhonePe, GPay বা Paytm থেকে QR Code স্ক্রিনশট আপলোড করুন।
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bank Account Form */}
            {paymentMethod === 'bank' && (
              <div className="bg-white p-3.5 rounded-2xl border border-indigo-200 space-y-3 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                      Bank Name (ব্যাংকের নাম) *
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. State Bank of India, HDFC"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-xs text-stone-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                      Account Holder Name (হোল্ডার নাম) *
                    </label>
                    <input
                      type="text"
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                      placeholder="Name as printed in passbook"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-xs text-stone-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                      Bank Account Number (অ্যাকাউন্ট নং) *
                    </label>
                    <input
                      type="text"
                      value={bankAccountNo}
                      onChange={(e) => setBankAccountNo(e.target.value)}
                      placeholder="11-16 digit account number"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono font-bold text-xs text-stone-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                      IFSC Code (আইএফএসসি কোড) *
                    </label>
                    <input
                      type="text"
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                      placeholder="e.g. SBIN0001234"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono font-bold text-xs text-stone-900 uppercase focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                    Passbook / Cheque Photo Upload (পাসবই / চেক এর ছবি আপলোড)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl border border-dashed border-stone-300 bg-stone-50 overflow-hidden flex items-center justify-center shrink-0">
                      {bankPassbookPhoto ? (
                        <img src={bankPassbookPhoto} alt="Passbook" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-6 h-6 text-stone-300" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-extrabold text-[11px] cursor-pointer border border-blue-200 transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{bankPassbookPhoto ? 'Replace Passbook Photo' : 'Upload Passbook / Cheque'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, setBankPassbookPhoto)}
                        />
                      </label>
                      <p className="text-[10px] text-stone-400">
                        স্পষ্ট ব্যাংক পাসবই প্রথম পাতা বা ক্যানসেলড চেকের ছবি দিন।
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Strict Prepaid Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2 text-amber-900 text-[11px] leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-950">Strict Prepaid Policy (শুধুমাত্র প্রিপেইড অর্ডার):</strong>
              <p className="mt-0.5">
                কাস্টমারগণ শুধুমাত্র অনলাইন ইউপিআই, কার্ড বা ওয়ালেট প্রিপেইড পেমেন্টের মাধ্যমে খাবার অর্ডার করতে পারবেন। কোনো অর্ডারে সমস্যা হলে অ্যাডমিন আপনার উপরে উল্লেখিত ব্যাংক একাউন্ট বা ইউপিআই আইডিতে তাৎক্ষণিক রিফান্ড সম্পন্ন করবেন।
              </p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 font-bold text-stone-600 hover:bg-stone-50 cursor-pointer"
            >
              Cancel (বাতিল)
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl font-extrabold flex items-center gap-2 shadow-md shadow-blue-500/25 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Profile...' : 'Save Profile & Payment Details (সংরক্ষণ করুন)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
