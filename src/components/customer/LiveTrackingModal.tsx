import React, { useEffect, useState } from 'react';
import {
  X,
  CheckCircle,
  Clock,
  Bike,
  Store,
  Home,
  Phone,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { apiRequest } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { DeliveryLiveMap } from '../maps/DeliveryLiveMap';

interface LiveTrackingModalProps {
  orderId: number;
  isOpen: boolean;
  onClose: () => void;
}

const statusOrder: OrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'assigned',
  'picked_up',
  'on_the_way',
  'delivered'
];

export const LiveTrackingModal: React.FC<LiveTrackingModalProps> = ({
  orderId,
  isOpen,
  onClose
}) => {
  const { language, t } = useLanguage();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeType, setDisputeType] = useState('Food Spoilage / Quality Issue');
  const [disputeSuccess, setDisputeSuccess] = useState('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  const fetchOrder = async () => {
    try {
      const data = await apiRequest(`/api/orders/${orderId}`);
      setOrder(data);
    } catch (e) {
      console.error('Fetch order error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !disputeReason) return;
    setIsSubmittingDispute(true);
    try {
      await apiRequest(`/api/orders/${order.id}/dispute`, {
        method: 'POST',
        body: JSON.stringify({ reason: disputeReason, issueType: disputeType })
      });
      setDisputeSuccess('Your issue has been reported directly to Admin Support. Payment is frozen in escrow pending refund.');
      setIsDisputeOpen(false);
      fetchOrder();
    } catch (err: any) {
      alert(err.message || 'Failed to submit issue');
    } finally {
      setIsSubmittingDispute(false);
    }
  };


  useEffect(() => {
    if (!isOpen) return;
    fetchOrder();
    const interval = setInterval(fetchOrder, 4000);
    return () => clearInterval(interval);
  }, [orderId, isOpen]);

  if (!isOpen) return null;

  const currentStepIdx = order ? statusOrder.indexOf(order.status) : 0;

  const stepsMeta = [
    { key: 'pending', label: 'Order Placed', labelBn: 'অর্ডার গৃহীত' },
    { key: 'accepted', label: 'Accepted', labelBn: 'রেস্তোরাঁ গ্রহণ করেছে' },
    { key: 'preparing', label: 'Cooking', labelBn: 'খাবার তৈরি হচ্ছে' },
    { key: 'ready', label: 'Food Ready', labelBn: 'খাবার তৈরি' },
    { key: 'assigned', label: 'Rider Assigned', labelBn: 'রাইডার নিয়োগ' },
    { key: 'picked_up', label: 'Picked Up', labelBn: 'খাবার তোলা হয়েছে' },
    { key: 'on_the_way', label: 'On The Way', labelBn: 'রাস্তায় আছে' },
    { key: 'delivered', label: 'Delivered', labelBn: 'ডেলিভারি সম্পন্ন' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-bold">
              🛵
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-stone-900 text-base">
                  {order ? order.order_number : 'Order Tracking'}
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Live GPS
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium">
                {order?.restaurant_name} • ETA: {order?.estimated_delivery_time || '20-30 mins'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchOrder}
              className="p-2 text-stone-500 hover:text-stone-800 rounded-full hover:bg-stone-200"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isLoading && !order ? (
          <div className="p-12 text-center text-stone-400">Loading live tracking details...</div>
        ) : order ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Interactive Google Map with Road Route and Animated Rider */}
            <DeliveryLiveMap order={order} heightClass="h-[280px] sm:h-[340px]" showNavigationButton={false} />

            {/* Live Status Header Banner */}
            <div className="bg-orange-50/80 border border-orange-200 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {order.status === 'delivered'
                    ? '🎉'
                    : order.status === 'on_the_way'
                    ? '🛵'
                    : order.status === 'ready'
                    ? '🍲'
                    : order.status === 'preparing' || order.status === 'accepted'
                    ? '👨‍🍳'
                    : '⏱️'}
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">
                    {order.status === 'pending'
                      ? (language === 'bn' ? 'অর্ডার প্লেস করা হয়েছে (কনফার্মেশন অপেক্ষমাণ)' : 'Order Placed (Awaiting Confirmation)')
                      : order.status === 'accepted' || order.status === 'preparing'
                      ? (language === 'bn' ? 'রেস্তোরাঁ খাবার তৈরি করছে (Cooking in Progress)' : 'Restaurant is Cooking Your Food')
                      : order.status === 'ready'
                      ? (language === 'bn' ? 'খাবার প্রস্তুত ও প্যাকড (Food Ready & Packed)' : 'Food is Ready & Packed')
                      : order.status === 'on_the_way' || order.status === 'picked_up'
                      ? (language === 'bn' ? 'রাইডার খাবার নিয়ে আপনার ঠিকানায় আসছেন (Out for Delivery)' : 'Out for Delivery (Rider on the way)')
                      : order.status === 'delivered'
                      ? (language === 'bn' ? 'খাবার ডেলিভারি সম্পন্ন হয়েছে (Delivered)' : 'Delivered Successfully')
                      : t(`order.status.${order.status}`)}
                  </h4>
                  <p className="text-xs text-stone-600">
                    {order.status === 'delivered'
                      ? (language === 'bn' ? 'আপনার খাবার উপভোগ করুন!' : 'Enjoy your delicious hot meal!')
                      : order.status === 'on_the_way'
                      ? (language === 'bn' ? `রাইডার ${order.delivery_partner_name || 'ডেলিভারি পার্টনার'} রাস্তায় আছেন` : `Rider ${order.delivery_partner_name || 'Driver'} is on the road`)
                      : order.status === 'ready'
                      ? (language === 'bn' ? 'খাবার প্যাক হয়ে গেছে, রাইডার কাউন্টার থেকে সংগ্রহ করছেন' : 'Food packed at counter, waiting for rider pickup')
                      : (language === 'bn' ? `আনুমানিক ডেলিভারি সময়: ${order.estimated_delivery_time || '25-35 mins'}` : `Estimated ETA: ${order.estimated_delivery_time || '25-35 mins'}`)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold text-stone-500 uppercase">Grand Total</div>
                <div className="text-base font-black font-mono text-orange-600">
                  ₹{order.grand_total}
                </div>
              </div>
            </div>

            {/* Rider Information & Contact (when assigned) */}
            {order.delivery_partner_name && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                    🛵
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-emerald-800 uppercase">
                      {language === 'bn' ? 'নিযুক্ত ডেলিভারি পার্টনার (Rider)' : 'Assigned Delivery Partner'}
                    </div>
                    <div className="text-xs font-black text-stone-900">
                      {order.delivery_partner_name}
                    </div>
                  </div>
                </div>

                {order.delivery_partner_phone && (
                  <a
                    href={`tel:${order.delivery_partner_phone}`}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'রাইডারকে কল করুন' : 'Call Rider'}</span>
                  </a>
                )}
              </div>
            )}

            {/* Stepper Timeline */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200">
              <div className="text-xs font-bold text-stone-700 mb-3">Order Progress (অর্ডার পর্যায়)</div>
              <div className="relative flex justify-between items-center">
                {/* Connecting Line */}
                <div className="absolute top-3.5 left-4 right-4 h-1 bg-stone-200 -z-0">
                  <div
                    className="h-full bg-orange-600 transition-all duration-500"
                    style={{
                      width: `${(Math.max(0, currentStepIdx) / (stepsMeta.length - 1)) * 100}%`
                    }}
                  />
                </div>

                {stepsMeta.map((s, idx) => {
                  const isDone = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;

                  return (
                    <div key={s.key} className="flex flex-col items-center z-10">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isCurrent
                            ? 'bg-orange-600 text-white ring-4 ring-orange-200 shadow-md scale-110'
                            : isDone
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-200 text-stone-500'
                        }`}
                      >
                        {isDone ? '✓' : idx + 1}
                      </div>
                      <span className="text-[9px] font-bold text-stone-600 mt-1 max-w-[50px] text-center leading-tight hidden sm:block">
                        {language === 'bn' ? s.labelBn : s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Items Summary */}
            <div className="bg-white rounded-2xl p-4 border border-stone-200 space-y-2">
              <div className="text-xs font-bold text-stone-700 mb-1">Items Ordered</div>
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs text-stone-700">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-orange-600">{item.quantity}x</span>
                    <span>{item.food_name}</span>
                  </div>
                  <span className="font-mono font-semibold">₹{item.total_price}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-stone-200 pt-2 flex justify-between text-xs font-bold text-stone-800">
                <span>Payment Mode:</span>
                <span className="uppercase text-orange-700">{order.payment_method}</span>
              </div>
            </div>

            {/* 24-Hour Admin Escrow Protection Banner & Customer Support Action */}
            {order.status === 'delivered' && (
              <div className="bg-purple-50/80 rounded-2xl p-4 border border-purple-200 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h5 className="font-extrabold text-xs text-purple-950">
                        ২৪-ঘণ্টা পেমেন্ট প্রটেকশন (24h Admin Escrow Guarantee)
                      </h5>
                      <span className="text-[9px] font-black uppercase bg-purple-200 text-purple-800 px-1.5 py-0.2 rounded">
                        Active
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-900/90 leading-relaxed font-bengali">
                      আপনার টাকা বর্তমানে প্ল্যাটফর্ম অ্যাডমিন এসক্রো হেফাজতে সুরক্ষিত আছে। ডেলিভারির ২৪ ঘণ্টা পর রেস্তোরাঁকে অর্থ ছাড় করা হবে। কোনো ত্রুটি বা খাবারে সমস্যা থাকলে রিপোর্ট করুন।
                    </p>
                  </div>
                </div>

                {order.escrow_status === 'refunded' ? (
                  <div className="bg-emerald-100 text-emerald-900 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>✓ ₹{order.grand_total} রিফান্ড আপনার অ্যাকাউন্টে ফেরত পাঠানো হয়েছে।</span>
                  </div>
                ) : order.escrow_status === 'disputed' ? (
                  <div className="bg-amber-100 text-amber-900 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>⚠️ আপনার অভিযোগ অ্যাডমিন সাপোর্টে তদন্তাধীন আছে। পেমেন্ট সাময়িকভাবে হোল্ড রাখা হয়েছে।</span>
                  </div>
                ) : (
                  <div>
                    {!isDisputeOpen ? (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-stone-500">খাবারে কোনো সমস্যা হয়েছে?</span>
                        <button
                          type="button"
                          onClick={() => setIsDisputeOpen(true)}
                          className="bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-xs px-3.5 py-1.5 rounded-xl border border-purple-300 transition-all flex items-center gap-1.5"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Report Issue / Request Refund</span>
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleReportDispute} className="space-y-2 pt-2 border-t border-purple-200">
                        <div className="text-xs font-bold text-purple-950">অভিযোগ ও রিফান্ড আবেদন:</div>
                        <select
                          value={disputeType}
                          onChange={(e) => setDisputeType(e.target.value)}
                          className="w-full bg-white border border-purple-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-800 font-medium"
                        >
                          <option value="Food Spoilage / Quality Issue">খাবারের মান খারাপ / বাসি ছিল (Quality Issue)</option>
                          <option value="Packaging Tampered / Unsealed">প্যাকেটের সিল খোলা ছিল (Packaging Damaged)</option>
                          <option value="Wrong Items Delivered">ভুল খাবার এসেছে (Wrong Items)</option>
                          <option value="Items Missing">কোনো খাবার বাদ পড়েছে (Missing Item)</option>
                          <option value="Excessive Delivery Delay">অতিরিক্ত দেরিতে ডেলিভারি (Late Delivery)</option>
                        </select>
                        <textarea
                          required
                          rows={2}
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          placeholder="Please explain the issue to our support team..."
                          className="w-full bg-white border border-purple-200 rounded-xl p-2 text-xs focus:outline-hidden focus:border-purple-600"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsDisputeOpen(false)}
                            className="text-xs text-stone-500 hover:text-stone-800 px-3 py-1"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmittingDispute}
                            className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-4 py-1.5 rounded-xl shadow-xs disabled:opacity-50"
                          >
                            {isSubmittingDispute ? 'Submitting...' : 'Submit to Admin Support'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {disputeSuccess && (
                  <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    {disputeSuccess}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

