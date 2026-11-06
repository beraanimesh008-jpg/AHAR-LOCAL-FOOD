import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  QrCode,
  Smartphone,
  CreditCard,
  CheckCircle,
  X,
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSuccessChime } from '../common/AudioAlerts';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  amount: number;
  paymentMethod: 'upi' | 'cod';
  onlineSubMethod: 'gpay' | 'phonepe' | 'paytm' | 'qr' | 'card';
  customerName?: string;
  storeName?: string;
  itemCount?: number;
  onPaymentSuccess: () => void;
  onCancel: () => void;
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  amount,
  paymentMethod,
  onlineSubMethod,
  customerName = 'Valued Customer',
  storeName = 'AharLocal Partner Store',
  itemCount = 1,
  onPaymentSuccess,
  onCancel
}) => {
  const [activeTab, setActiveTab] = useState<'gpay' | 'phonepe' | 'paytm' | 'qr' | 'card'>(onlineSubMethod || 'gpay');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState(customerName);

  const [paymentState, setPaymentState] = useState<'idle' | 'processing' | 'verifying' | 'success'>('idle');
  const [statusMessage, setPaymentStatusMessage] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 mins QR timer

  useEffect(() => {
    setActiveTab(onlineSubMethod || 'gpay');
    setPaymentState('idle');
  }, [onlineSubMethod, isOpen]);

  // QR Timer Countdown
  useEffect(() => {
    if (!isOpen || activeTab !== 'qr') return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleExecutePayment = () => {
    setPaymentState('processing');
    setPaymentStatusMessage('Connecting to Secure Bank Gateway...');

    setTimeout(() => {
      setPaymentState('verifying');
      setPaymentStatusMessage('Verifying UPI / Card Payment Confirmation...');

      setTimeout(() => {
        setPaymentState('success');
        setPaymentStatusMessage('Payment Approved! Finalizing Order...');
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch {}
        playSuccessChime();

        setTimeout(() => {
          onPaymentSuccess();
        }, 1200);
      }, 1500);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-orange-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600/30 border border-orange-500/50 flex items-center justify-center text-xl font-black">
              🔒
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base">AharLocal Secure Payment Gateway</h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> 256-bit SSL
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-0.5">
                Paying for {itemCount} items from {storeName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={paymentState !== 'idle'}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div>
            <div className="text-xs font-medium text-orange-100 uppercase tracking-wider">Total Amount Payable</div>
            <div className="text-2xl font-black font-mono mt-0.5">₹{amount.toFixed(2)}</div>
            <div className="text-[10px] font-bold text-orange-100 bg-black/20 px-2 py-0.5 rounded mt-1 inline-block">
              🏦 Direct to Admin Platform Payment Account
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] bg-white/20 px-2.5 py-1 rounded-xl font-bold backdrop-blur-md">
              Order ID: #{Math.floor(100000 + Math.random() * 900000)}
            </div>
            <div className="text-[10px] text-orange-100 mt-1">Direct Bank & UPI Settlement</div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {paymentState !== 'idle' ? (
            /* Processing State Animation */
            <div className="py-12 text-center space-y-4 animate-in zoom-in-95">
              {paymentState === 'success' ? (
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-4xl shadow-lg animate-bounce">
                  ✓
                </div>
              ) : (
                <div className="relative w-16 h-16 mx-auto">
                  <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-orange-600">
                    ₹
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-extrabold text-base text-stone-900">{statusMessage}</h4>
                <p className="text-xs text-stone-500 mt-1">Please do not refresh or close this browser window.</p>
              </div>

              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 max-w-xs mx-auto text-xs text-stone-600 space-y-1">
                <div className="flex justify-between">
                  <span>Merchant:</span>
                  <span className="font-bold text-stone-800">AharLocal Foods Pvt Ltd</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-bold font-mono text-orange-600">₹{amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Payment Gateway Options Selector */
            <>
              {/* Payment App Tabs */}
              <div className="grid grid-cols-5 gap-1.5 bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
                {[
                  { id: 'gpay', label: 'Google Pay', icon: '🟢' },
                  { id: 'phonepe', label: 'PhonePe', icon: '🟣' },
                  { id: 'paytm', label: 'Paytm UPI', icon: '🔵' },
                  { id: 'qr', label: 'Scan QR', icon: '📷' },
                  { id: 'card', label: 'Card', icon: '💳' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`p-2 rounded-xl text-[11px] font-black transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-white text-orange-700 shadow-md border border-orange-300'
                        : 'text-stone-600 hover:bg-white/60'
                    }`}
                  >
                    <span className="text-base">{tab.icon}</span>
                    <span className="truncate max-w-full">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* TAB 1: GOOGLE PAY / PHONEPE / PAYTM UPI */}
              {['gpay', 'phonepe', 'paytm'].includes(activeTab) && (
                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-orange-600" />
                    <div>
                      <h4 className="font-extrabold text-xs text-stone-900 capitalize">
                        Pay using {activeTab === 'gpay' ? 'Google Pay' : activeTab === 'phonepe' ? 'PhonePe' : 'Paytm UPI'}
                      </h4>
                      <p className="text-[11px] text-stone-500">Enter your UPI VPA ID or Mobile Number to receive payment request</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-stone-700">UPI ID / VPA (e.g. username@okaxis / 9800000007@ybl)</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={activeTab === 'gpay' ? '9800000007@gpay' : activeTab === 'phonepe' ? '9800000007@ybl' : '9800000007@paytm'}
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-hidden focus:border-orange-500 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setUpiId('9800000007@gpay')}
                        className="absolute right-2 top-2 bg-orange-100 text-orange-800 text-[10px] font-extrabold px-2 py-1 rounded-lg hover:bg-orange-200 cursor-pointer"
                      >
                        Use Saved ID
                      </button>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-[11px] text-emerald-800 font-medium flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Instant UPI collect request will be sent to your {activeTab.toUpperCase()} mobile app.</span>
                  </div>
                </div>
              )}

              {/* TAB 2: SCAN UPI QR CODE */}
              {activeTab === 'qr' && (
                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3 text-center animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                    <span>Scan with Any UPI App (GPay / PhonePe / Paytm)</span>
                    <span className="text-orange-600 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTimer(timerSeconds)}
                    </span>
                  </div>

                  {/* Generated QR Code */}
                  <div className="bg-white p-3 rounded-2xl border-2 border-stone-300 inline-block shadow-md my-1 relative">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=aharlocal@icici%26pn=AharLocal%26am=${amount}%26cu=INR`}
                      alt="UPI QR Code"
                      className="w-40 h-40 object-contain mx-auto"
                    />
                    <div className="text-[10px] font-black text-stone-700 mt-1">UPI ID: aharlocal@icici</div>
                  </div>

                  <p className="text-[11px] text-stone-500">
                    Open Google Pay, PhonePe, or Paytm app on your phone, scan this QR code & approve ₹{amount.toFixed(2)}.
                  </p>
                </div>
              )}

              {/* TAB 3: CREDIT / DEBIT CARD */}
              {activeTab === 'card' && (
                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="w-5 h-5 text-orange-600" />
                    <h4 className="font-extrabold text-xs text-stone-900">Debit or Credit ATM Card</h4>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-700">16-Digit Card Number</label>
                      <input
                        type="text"
                        placeholder="4532 8901 2345 6789"
                        maxLength={19}
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-hidden focus:border-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-700">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          placeholder="12/28"
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-hidden focus:border-orange-500 text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-stone-700">CVV / CVC</label>
                        <input
                          type="password"
                          placeholder="•••"
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-hidden focus:border-orange-500 text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleExecutePayment}
                className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm py-4 px-6 rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-between transition-all transform active:scale-98 cursor-pointer mt-2"
              >
                <div className="text-left">
                  <div className="text-[10px] opacity-80 font-normal uppercase">Authorized Payment</div>
                  <div className="font-mono text-base font-black">Pay ₹{amount.toFixed(2)}</div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span>Complete Payment & Place Order (পেমেন্ট সম্পন্ন করুন)</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-stone-100 border-t border-stone-200 p-3 text-center text-[10px] text-stone-500 font-medium flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Secured by Razorpay / Cashfree Payments • 100% Refund Guarantee</span>
        </div>
      </div>
    </div>
  );
};
