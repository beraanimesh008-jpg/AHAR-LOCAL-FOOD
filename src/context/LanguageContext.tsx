import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'bn' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  bn: {
    'brand.name': 'আহার লোকাল',
    'brand.tagline': 'ঘরের কাছের প্রিয় খাবার, দ্রুত ডেলিভারি',
    'nav.home': 'হোম',
    'nav.orders': 'অর্ডার',
    'nav.cart': 'ব্যাগ',
    'nav.profile': 'প্রোফাইল',
    'role.customer': 'গ্রাহক (Customer)',
    'role.restaurant': 'রেস্তোরাঁ (Restaurant)',
    'role.delivery': 'ডেলিভারি পার্টনার (Rider)',
    'role.admin': 'প্ল্যাটফর্ম অ্যাডমিন (Admin)',
    'location.detect': 'আমার জিপিএস লোকেশন খুঁজুন',
    'location.manual': 'ম্যানুয়ালি ঠিকানা বাছুন',
    'location.delivering_to': 'ডেলিভারি ঠিকানা',
    'search.placeholder': 'রেস্তোরাঁ বা পছন্দের খাবারের নাম খুঁজুন...',
    'cart.title': 'আপনার ব্যাগ',
    'cart.empty': 'আপনার ব্যাগ খালি',
    'cart.checkout': 'অর্ডার কনফার্ম করুন',
    'cart.total': 'মোট প্রদেয়',
    'cart.subtotal': 'খাবারের মূল্য',
    'cart.delivery_fee': 'ডেলিভারি চার্জ',
    'cart.discount': 'কুপন ছাড়',
    'cart.tax': 'ট্যাক্স ও ফি',
    'order.status.pending': 'অর্ডার গৃহীত হয়েছে',
    'order.status.accepted': 'রেস্তোরাঁ গ্রহণ করেছে',
    'order.status.preparing': 'খাবার তৈরি হচ্ছে',
    'order.status.ready': 'খাবার প্রস্তুত (পিকআপ)',
    'order.status.assigned': 'রাইডার নিয়োগ হয়েছে',
    'order.status.picked_up': 'খাবার তুলে নিয়েছে',
    'order.status.on_the_way': 'ডেলিভারি রাস্তায় আছে',
    'order.status.delivered': 'সফলভাবে পৌঁছে গেছে',
    'order.status.cancelled': 'অর্ডার বাতিল',
    'payment.cod': 'ক্যাশ অন ডেলিভারি (Cash on Delivery)',
    'payment.online': 'অনলাইন পেমেন্ট / ইউপিআই (UPI / Cards)',
    'action.accept': 'গ্রহণ করুন',
    'action.reject': 'বাতিল করুন',
    'action.view_map': 'ম্যাপে দেখুন'
  },
  en: {
    'brand.name': 'AharLocal',
    'brand.tagline': 'Hyperlocal Fresh Food Delivery',
    'nav.home': 'Home',
    'nav.orders': 'Orders',
    'nav.cart': 'Cart',
    'nav.profile': 'Profile',
    'role.customer': 'Customer',
    'role.restaurant': 'Restaurant Panel',
    'role.delivery': 'Delivery Partner',
    'role.admin': 'Platform Admin',
    'location.detect': 'Detect My GPS Location',
    'location.manual': 'Select Address Manually',
    'location.delivering_to': 'Delivering to',
    'search.placeholder': 'Search restaurants, biryani, sweets...',
    'cart.title': 'Your Cart',
    'cart.empty': 'Your cart is empty',
    'cart.checkout': 'Place Order',
    'cart.total': 'Grand Total',
    'cart.subtotal': 'Item Total',
    'cart.delivery_fee': 'Delivery Charge',
    'cart.discount': 'Discount',
    'cart.tax': 'Taxes & Fees',
    'order.status.pending': 'Order Placed',
    'order.status.accepted': 'Restaurant Accepted',
    'order.status.preparing': 'Food Preparing',
    'order.status.ready': 'Ready for Pickup',
    'order.status.assigned': 'Delivery Partner Assigned',
    'order.status.picked_up': 'Order Picked Up',
    'order.status.on_the_way': 'On The Way',
    'order.status.delivered': 'Delivered',
    'order.status.cancelled': 'Cancelled',
    'payment.cod': 'Cash on Delivery',
    'payment.online': 'Online Payment / UPI',
    'action.accept': 'Accept',
    'action.reject': 'Reject',
    'action.view_map': 'View on Map'
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'bn',
  setLanguage: () => {},
  t: (key) => key
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('aharlocal_lang') as Language) || 'bn';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('aharlocal_lang', lang);
  };

  const t = (key: string, defaultText?: string): string => {
    return translations[language][key] || defaultText || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
