/**
 * Database connection and query execution layer.
 * Supports production MySQL via mysql2/promise, with an automatic, seamless
 * memory-relational fallback if no live MySQL server daemon is detected in the development sandbox.
 */

import mysql from 'mysql2/promise';

export interface QueryResult<T = any> {
  rows: T[];
  insertId?: number;
  affectedRows?: number;
}

// In-memory data store holding full seed data
let inMemoryStore: any = null;

async function initInMemoryStore() {
  inMemoryStore = {
    users: [
      {
        id: 1,
        name: 'AharLocal Operations',
        email: 'admin@aharlocal.com',
        phone: '+919800000001',
        password_hash: '$2a$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m',
        role: 'admin',
        profile_photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        language: 'bn',
        is_active: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Subrata Ghosh',
        email: 'kolkatabiryani@aharlocal.com',
        phone: '+919800000002',
        password_hash: '$2a$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m',
        role: 'restaurant',
        profile_photo: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150',
        language: 'bn',
        is_active: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        name: 'Debabrata Modak',
        email: 'maatarasweets@aharlocal.com',
        phone: '+919800000003',
        password_hash: '$2a$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m',
        role: 'restaurant',
        profile_photo: 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=150',
        language: 'bn',
        is_active: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 4,
        name: 'Soma Mukherjee',
        email: 'banglarrannaghor@aharlocal.com',
        phone: '+919800000004',
        password_hash: '$2a$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m',
        role: 'restaurant',
        profile_photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
        language: 'bn',
        is_active: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 5,
        name: 'Rahul Sen (Delivery Rider)',
        email: 'rahul.delivery@aharlocal.com',
        phone: '+919800000005',
        password_hash: '$2a$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m',
        role: 'delivery',
        profile_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        language: 'bn',
        is_active: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 6,
        name: 'Subhash Roy (Delivery Rider)',
        email: 'subhash.delivery@aharlocal.com',
        phone: '+919800000006',
        password_hash: '$2a$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m',
        role: 'delivery',
        profile_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        language: 'bn',
        is_active: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 7,
        name: 'Bikram Das',
        email: 'customer@aharlocal.com',
        phone: '+919800000007',
        password_hash: '$2a$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m',
        role: 'customer',
        profile_photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        passport_photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        language: 'bn',
        is_active: 1,
        cod_enabled: 0,
        address: 'Flat 3B, Sunshine Heights, 14 Ballygunge Circular Road, Kolkata 700019',
        dob: '15/08/1996',
        gender: 'Male',
        payment_method: 'upi',
        upi_id: 'bikram.das@okaxis',
        upi_qr_photo: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400',
        bank_name: 'State Bank of India',
        bank_account_no: '38291048291',
        bank_account_holder: 'Bikram Das',
        bank_ifsc: 'SBIN0001234',
        bank_passbook_photo: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
        created_at: new Date().toISOString()
      },
      {
        id: 8,
        name: 'Tanmoy Nandi (Pending Vendor)',
        email: 'newrest@aharlocal.com',
        phone: '+919800000008',
        password_hash: '$2a$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m',
        role: 'restaurant',
        profile_photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        language: 'bn',
        is_active: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 9,
        name: 'Priyanka Sen (VIP Customer)',
        email: 'priyanka@aharlocal.com',
        phone: '+919800000009',
        password_hash: '$2a$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m',
        role: 'customer',
        profile_photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        passport_photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        language: 'bn',
        is_active: 1,
        cod_enabled: 1,
        address: '58/2 Southern Avenue, Lake Market, Kolkata 700029',
        dob: '22/11/1998',
        gender: 'Female',
        payment_method: 'bank',
        upi_id: 'priyanka.sen@okhdfcbank',
        upi_qr_photo: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400',
        bank_name: 'HDFC Bank',
        bank_account_no: '501004829104',
        bank_account_holder: 'Priyanka Sen',
        bank_ifsc: 'HDFC0000456',
        bank_passbook_photo: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
        created_at: new Date().toISOString()
      },
      {
        id: 10,
        name: 'Amit Mondal (New Rider Applicant)',
        email: 'amit.rider@aharlocal.com',
        phone: '+919800000010',
        password_hash: '$2a$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m',
        role: 'delivery',
        profile_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        language: 'bn',
        is_active: 1,
        created_at: new Date().toISOString()
      }

    ],


    settings: {
      global_cod_enabled: 0, // Cash on delivery is globally off by default; prepaid orders preferred
      restaurant_commission_percent: 15.0, // Default restaurant commission % (রেস্তোরাঁ কমিশন)
      delivery_partner_commission_percent: 10.0, // Default delivery partner platform fee % (ডেলিভারি পার্টনার কমিশন)
      delivery_base_fare: 25.0, // Base delivery charge in ₹ (বেস ডেলিভারি চার্জ)
      delivery_base_distance_km: 2.0, // Base distance in km covered by base fare
      delivery_per_km_rate: 10.0, // Delivery fee per extra km in ₹ (প্রতি কিমি ডেলিভারি রেট)
      min_delivery_fare: 20.0 // Minimum delivery partner payout guarantee
    },

    promotions: {
      // 1. Restaurant Platform Charge Discount
      restaurant_discount_enabled: 1,
      restaurant_discount_type: 'percent_off_commission', // 'percent_off_commission' (e.g. 50% discount) or 'flat_commission_rate' (e.g. 5% commission)
      restaurant_discount_value: 50.0, // 50% discount on restaurant commission
      restaurant_discount_title: 'Festival Partner Offer: 50% Off Platform Fee',
      restaurant_discount_title_bn: 'রেস্তোরাঁ উৎসব অফার: প্ল্যাটফর্ম ফি-তে ৫০% বিশেষ ছাড়!',
      restaurant_discount_note: 'All restaurant partners enjoy 50% discount on standard commission rates during this campaign.',

      // 2. Delivery Partner Platform Charge Discount
      partner_discount_enabled: 1,
      partner_discount_type: 'zero_fee', // 'zero_fee', 'percent_off_fee', 'flat_fee_rate'
      partner_discount_value: 100.0, // 100% discount = 0% platform deduction
      partner_bonus_per_order: 5.0, // Extra ₹5 bonus per delivery order
      partner_discount_title: 'Rider Super Bonus: 0% Platform Deduction + ₹5 Extra Payout',
      partner_discount_title_bn: 'রাইডার ধামাকা বোনাস: ০% প্ল্যাটফর্ম কর্তন ও প্রতি ডেলিভারিতে অতিরিক্ত ₹৫ ইনসেনটিভ',
      partner_discount_note: 'Riders retain 100% of delivery fees with zero platform deduction and receive ₹5 cash bonus per completed delivery.',

      // 3. Customer Delivery Charge Discount
      customer_delivery_discount_enabled: 1,
      customer_delivery_discount_type: 'free_delivery_above', // 'free_delivery_above', 'flat_discount', 'percent_discount'
      customer_delivery_discount_value: 100.0, // 100% discount
      customer_min_order_for_free_delivery: 199.0, // Orders above ₹199 get FREE delivery
      customer_first_order_free_delivery: 1, // First order free delivery
      customer_flat_delivery_discount: 10.0, // Flat ₹10 off delivery charge
      customer_promo_banner_enabled: 1,
      customer_promo_banner_text: '🎉 বিশেষ অফার: ₹১৯৯ টাকার বেশি অর্ডারে সম্পূর্ণ ফ্রি ডেলিভারি!',
      customer_promo_banner_text_en: '🎉 Limited Time Offer: FREE Delivery on all food orders above ₹199!'
    },

    location_rankings: [
      {
        id: 1,
        name: 'Park Circus & Ballygunge Zone (Radius 3.5 KM)',
        name_bn: 'পার্ক সার্কাস ও বালিগঞ্জ জোন (রেডিয়াস ৩.৫ কিমি)',
        lat: 22.5400,
        lng: 88.3600,
        radius_km: 3.5,
        is_active: 1,
        rankings: [
          { rank: 1, restaurant_id: 1 },
          { rank: 2, restaurant_id: 3 },
          { rank: 3, restaurant_id: 2 }
        ],
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Raidighi Main Market Point (Radius 5 KM)',
        name_bn: 'রায়দিঘি মেন মার্কেট পয়েন্ট (রেডিয়াস ৫ কিমি)',
        lat: 21.9200,
        lng: 88.4300,
        radius_km: 5.0,
        is_active: 1,
        rankings: [
          { rank: 1, restaurant_id: 7 },
          { rank: 2, restaurant_id: 5 },
          { rank: 3, restaurant_id: 6 }
        ],
        created_at: new Date().toISOString()
      }
    ],

    service_areas: [
      {
        id: 1,
        name: 'Central & South Kolkata Service Zone',
        name_bn: 'সেন্ট্রাল ও সাউথ কলকাতা সার্ভিস এরিয়া',
        min_delivery_charge: 25.00,
        per_km_charge: 8.00,
        is_active: 1,
        polygon: [
          { lat: 22.5850, lng: 88.3300 },
          { lat: 22.5850, lng: 88.3850 },
          { lat: 22.5100, lng: 88.3900 },
          { lat: 22.5050, lng: 88.3350 },
          { lat: 22.5400, lng: 88.3200 }
        ]
      },
      {
        id: 2,
        name: 'Salt Lake & New Town Delivery Zone',
        name_bn: 'সল্টলেক ও নিউ টাউন ডেলিভারি এরিয়া',
        min_delivery_charge: 30.00,
        per_km_charge: 9.00,
        is_active: 1,
        polygon: [
          { lat: 22.6000, lng: 88.4000 },
          { lat: 22.6000, lng: 88.4700 },
          { lat: 22.5400, lng: 88.4750 },
          { lat: 22.5400, lng: 88.4050 }
        ]
      },
      {
        id: 3,
        name: 'Raidighi Bazaar & Town Service Area',
        name_bn: 'রায়দিঘি বাজার ও শহর সার্ভিস এরিয়া',
        min_delivery_charge: 20.00,
        per_km_charge: 7.00,
        is_active: 1,
        polygon: [
          { lat: 21.9400, lng: 88.4100 },
          { lat: 21.9400, lng: 88.4600 },
          { lat: 21.9000, lng: 88.4650 },
          { lat: 21.8950, lng: 88.4150 }
        ]
      }
    ],

    restaurants: [
      {
        id: 1,
        user_id: 2,
        service_area_id: 1,
        name: 'Kolkata Royal Biryani House',
        name_bn: 'কলকাতা রয়্যাল বিরিয়ানি হাউস',
        owner_name: 'Subrata Ghosh',
        phone: '+919800000002',
        email: 'kolkatabiryani@aharlocal.com',
        address: '42/A Park Circus Crossing, Kolkata 700017',
        latitude: 22.5429,
        longitude: 88.3653,
        photo_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600',
        banner_url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=1200',
        photos: [
          'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=1200',
          'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1200',
          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200'
        ],
        fssai_license: 'FSSAI-12821019000123',
        commission_rate: 15.00,
        min_order_amount: 99.00,
        avg_delivery_minutes: 25,
        rating: 4.8,
        rating_count: 420,
        is_open: 1,
        is_pure_veg: 0,
        self_delivery_enabled: 1,
        self_delivery_radius_km: 5,
        status: 'approved',
        cuisine_types: ['Biryani', 'Mughlai', 'Kebab'],
        payment_method: 'upi',
        upi_id: 'kolkatabiryani@okhdfcbank',
        upi_qr_photo: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400',
        bank_name: 'State Bank of India',
        bank_account_no: '38291048291',
        bank_account_holder: 'Subrata Ghosh',
        bank_ifsc: 'SBIN0001234',
        bank_passbook_photo: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400'
      },
      {
        id: 2,
        user_id: 3,
        service_area_id: 1,
        name: 'Maa Tara Mishtanna Bhandar',
        name_bn: 'মা তারা মিষ্টান্ন ভাণ্ডার',
        owner_name: 'Debabrata Modak',
        phone: '+919800000003',
        email: 'maatarasweets@aharlocal.com',
        address: '18 Kalighat Temple Road, Kolkata 700026',
        latitude: 22.5204,
        longitude: 88.3448,
        photo_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600',
        banner_url: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=1200',
        photos: [
          'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=1200',
          'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=1200',
          'https://images.unsplash.com/photo-1571217664816-953e98f0fa3b?w=1200'
        ],
        fssai_license: 'FSSAI-12821019000456',
        commission_rate: 12.00,
        min_order_amount: 50.00,
        avg_delivery_minutes: 20,
        rating: 4.9,
        rating_count: 850,
        is_open: 1,
        is_pure_veg: 1,
        self_delivery_enabled: 0,
        self_delivery_radius_km: 0,
        status: 'approved',
        cuisine_types: ['Bengali Sweets', 'Mishti', 'Snacks'],
        payment_method: 'bank',
        upi_id: 'maatarasweets@ybl',
        upi_qr_photo: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400',
        bank_name: 'Punjab National Bank',
        bank_account_no: '0912002100048123',
        bank_account_holder: 'Debabrata Modak',
        bank_ifsc: 'PUNB0091200',
        bank_passbook_photo: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400'
      },
      {
        id: 3,
        user_id: 4,
        service_area_id: 1,
        name: 'Banglar Rannaghor & Thali',
        name_bn: 'বাংলার রান্নাঘর ও থালি',
        owner_name: 'Soma Mukherjee',
        phone: '+919800000004',
        email: 'banglarrannaghor@aharlocal.com',
        address: '78 Gariahat Road, Kolkata 700019',
        latitude: 22.5186,
        longitude: 88.3664,
        photo_url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600',
        banner_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=1200',
        photos: [
          'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=1200',
          'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=1200',
          'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=1200'
        ],
        fssai_license: 'FSSAI-12821019000789',
        commission_rate: 14.00,
        min_order_amount: 80.00,
        avg_delivery_minutes: 30,
        rating: 4.6,
        rating_count: 310,
        is_open: 1,
        is_pure_veg: 0,
        self_delivery_enabled: 1,
        self_delivery_radius_km: 3,
        status: 'approved',
        cuisine_types: ['Bengali Thali', 'Fish Curry', 'Rice Meals'],
        payment_method: 'upi',
        upi_id: 'banglarrannaghor@okaxis',
        upi_qr_photo: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400',
        bank_name: 'Bank of Baroda',
        bank_account_no: '28490100029481',
        bank_account_holder: 'Soma Mukherjee',
        bank_ifsc: 'BARB0GARIAH',
        bank_passbook_photo: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400'
      },
      {
        id: 4,
        user_id: 8,
        service_area_id: 1,
        name: 'Hindusthan Roll Corner',
        name_bn: 'হিন্দুস্থান রোল কর্নার',
        owner_name: 'Tanmoy Nandi',
        phone: '+919800000008',
        email: 'newrest@aharlocal.com',
        address: '12 Shyambazar 5-Point Crossing',
        latitude: 22.6001,
        longitude: 88.3712,
        photo_url: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=600',
        banner_url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1200',
        photos: [
          'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1200',
          'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=1200',
          'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=1200'
        ],
        fssai_license: 'FSSAI-12821019000999',
        commission_rate: 15.00,
        min_order_amount: 60.00,
        avg_delivery_minutes: 20,
        rating: 4.2,
        rating_count: 45,
        is_open: 0,
        is_pure_veg: 0,
        status: 'approved',
        cuisine_types: ['Kolkata Rolls', 'Chowmein', 'Fast Food'],
        payment_method: 'upi',
        upi_id: 'hindusthanrolls@paytm',
        upi_qr_photo: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400',
        bank_name: 'Axis Bank',
        bank_account_no: '918020038491024',
        bank_account_holder: 'Tanmoy Nandi',
        bank_ifsc: 'UTIB0000123',
        bank_passbook_photo: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400'
      },
      {
        id: 5,
        user_id: 2,
        service_area_id: 3,
        name: 'Food Hub (Raidighi)',
        name_bn: 'ফুড হাব (রায়দিঘি)',
        owner_name: 'Anish Naskar',
        phone: '+919800000055',
        email: 'foodhub.raidighi@aharlocal.com',
        address: 'Raidighi Bazaar Road, Near Cinema Hall, Raidighi, South 24 Parganas 743383',
        latitude: 21.9212,
        longitude: 88.4350,
        photo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
        banner_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
        photos: [
          'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200',
          'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200'
        ],
        fssai_license: 'FSSAI-12821019000555',
        commission_rate: 12.00,
        min_order_amount: 70.00,
        avg_delivery_minutes: 20,
        rating: 4.8,
        rating_count: 320,
        is_open: 1,
        is_pure_veg: 0,
        status: 'approved',
        cuisine_types: ['Fast Food', 'Chowmein', 'Snacks', 'Chinese', 'Beverages'],
        payment_method: 'upi',
        upi_id: 'foodhub.raidighi@okicici',
        upi_qr_photo: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400',
        bank_name: 'State Bank of India',
        bank_account_no: '30492810492',
        bank_account_holder: 'Anish Naskar',
        bank_ifsc: 'SBIN0002145',
        bank_passbook_photo: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400'
      },
      {
        id: 6,
        user_id: 3,
        service_area_id: 3,
        name: 'Moner Hodish (Raidighi)',
        name_bn: 'মনের হদিস (রায়দিঘি)',
        owner_name: 'Dipankar Haldar',
        phone: '+919800000066',
        email: 'monerhodish.raidighi@aharlocal.com',
        address: 'Hospital Road, Raidighi Town, South 24 Parganas 743383',
        latitude: 21.9220,
        longitude: 88.4380,
        photo_url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600',
        banner_url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200',
        photos: [
          'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200',
          'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200',
          'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1200'
        ],
        fssai_license: 'FSSAI-12821019000666',
        commission_rate: 14.00,
        min_order_amount: 80.00,
        avg_delivery_minutes: 25,
        rating: 4.9,
        rating_count: 480,
        is_open: 1,
        is_pure_veg: 0,
        status: 'approved',
        cuisine_types: ['Bengali Thali', 'Fish Curry', 'Mutton Kasha', 'Sweets'],
        payment_method: 'bank',
        upi_id: 'monerhodish@ybl',
        upi_qr_photo: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400',
        bank_name: 'UCO Bank',
        bank_account_no: '18490210004912',
        bank_account_holder: 'Dipankar Haldar',
        bank_ifsc: 'UCBA0001849',
        bank_passbook_photo: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400'
      },
      {
        id: 7,
        user_id: 4,
        service_area_id: 3,
        name: 'Royal Indian Biryani (Raidighi)',
        name_bn: 'রয়্যাল ইন্ডিয়ান বিরিয়ানি (রায়দিঘি)',
        owner_name: 'Sheikh Nizamuddin',
        phone: '+919800000077',
        email: 'royalbiryani.raidighi@aharlocal.com',
        address: 'Main Road Near Bus Stand, Raidighi, South 24 Parganas 743383',
        latitude: 21.9205,
        longitude: 88.4320,
        photo_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600',
        banner_url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=1200',
        photos: [
          'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=1200',
          'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1200',
          'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=1200'
        ],
        fssai_license: 'FSSAI-12821019000777',
        commission_rate: 15.00,
        min_order_amount: 90.00,
        avg_delivery_minutes: 20,
        rating: 4.95,
        rating_count: 610,
        is_open: 1,
        is_pure_veg: 0,
        status: 'approved',
        cuisine_types: ['Royal Biryani', 'Chicken Chaap', 'Kebabs', 'Mughlai'],
        payment_method: 'upi',
        upi_id: 'royalbiryani.raidighi@okhdfcbank',
        upi_qr_photo: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400',
        bank_name: 'HDFC Bank',
        bank_account_no: '50100918291048',
        bank_account_holder: 'Sheikh Nizamuddin',
        bank_ifsc: 'HDFC0000918',
        bank_passbook_photo: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400'
      }
    ],

    food_categories: [
      { id: 1, name: 'Biryani & Kebabs', name_bn: 'বিরিয়ানি ও কাবাব', image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200', sort_order: 1 },
      { id: 2, name: 'Bengali Sweets', name_bn: 'মিষ্টি ও দই', image_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=200', sort_order: 2 },
      { id: 3, name: 'Traditional Thali', name_bn: 'বাঙালী থালি ও ভাত', image_url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=200', sort_order: 3 },
      { id: 4, name: 'Rolls & Fast Food', name_bn: 'কাঠি রোল ও ফাস্ট ফুড', image_url: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=200', sort_order: 4 },
      { id: 5, name: 'Fish & Mutton', name_bn: 'মাছ ও খাসির মাংস', image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200', sort_order: 5 },
      { id: 6, name: 'Snacks & Tea', name_bn: 'সন্ধ্যার স্ন্যাক্স ও চা', image_url: 'https://images.unsplash.com/photo-1601050690187-8e6d2bc4a5b4?w=200', sort_order: 6 }
    ],

    foods: [
      {
        id: 1,
        restaurant_id: 1,
        category: 'Rice',
        category_bn: 'বিরিয়ানি ও চাল',
        name: 'Kolkata Special Chicken Biryani',
        name_bn: 'কলকাতা স্পেশাল চিকেন বিরিয়ানি',
        description: 'Fragrant basmati rice served with tender chicken piece, golden potato (alu), and egg.',
        description_bn: 'সুগন্ধি বাসমতী চাল, নরম চিকেন, মশলাদার আলু এবং ডিম সহযোগে খাঁটি কলকাতার বিরিয়ানি।',
        price: 180.00,
        discount_price: 160.00,
        photo_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500',
        is_veg: 0,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 15
      },
      {
        id: 2,
        restaurant_id: 1,
        category: 'Rice',
        category_bn: 'বিরিয়ানি ও চাল',
        name: 'Kolkata Royal Mutton Biryani',
        name_bn: 'কলকাতা রয়্যাল মাটন বিরিয়ানি',
        description: 'Slow-cooked aged mutton with melt-in-mouth potato and basmati rice infused with saffron.',
        description_bn: 'সুস্বাদু মাটন পিস, সুগন্ধি চাল ও জাফরান গন্ধযুক্ত সেরা স্বাদের মাটন বিরিয়ানি।',
        price: 260.00,
        discount_price: 240.00,
        photo_url: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500',
        is_veg: 0,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 20
      },
      {
        id: 3,
        restaurant_id: 1,
        category: 'Starters',
        category_bn: 'চিকেন চাপ',
        name: 'Shahi Chicken Chaap',
        name_bn: 'শাহী চিকেন চাপ',
        description: 'Rich and aromatic slow-cooked chicken gravy with cashew and poppy paste.',
        description_bn: 'পোস্ত ও কাজুবাদাম বাটা দিয়ে তৈরি সুস্বাদু ও ঘন চিকেন চাপ।',
        price: 140.00,
        discount_price: null,
        photo_url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500',
        is_veg: 0,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 15
      },
      {
        id: 4,
        restaurant_id: 2,
        category: 'Sweets',
        category_bn: 'মিষ্টি',
        name: 'Baked Rosogolla (2 Pcs)',
        name_bn: 'বেকড রসগোল্লা (২ পিস)',
        description: 'Warm caramelised cottage cheese dumplings baked in thick rabri.',
        description_bn: 'ঘন রাবড়িতে বেক করা নরম তুলতুলে সুস্বাদু বেকড রসগোল্লা।',
        price: 60.00,
        discount_price: 50.00,
        photo_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500',
        is_veg: 1,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 5
      },
      {
        id: 5,
        restaurant_id: 2,
        category: 'Sweets',
        category_bn: 'মিষ্টি দই',
        name: 'Kolkata Special Mishti Doi (Cup)',
        name_bn: 'কলকাতার স্পেশাল মিষ্টি দই',
        description: 'Traditional earthen pot sweetened curd with rich creamy texture.',
        description_bn: 'খাঁটি মাটির ভাঁড়ে পাতা ঘন ও খাঁটি মিষ্টি দই।',
        price: 55.00,
        discount_price: null,
        photo_url: 'https://images.unsplash.com/photo-1571217664816-953e98f0fa3b?w=500',
        is_veg: 1,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 2
      },
      {
        id: 6,
        restaurant_id: 2,
        category: 'Sweets',
        category_bn: 'মিষ্টি',
        name: 'Soft Gulab Jamun (2 Pcs)',
        name_bn: 'নরম গোলাপ জামুন (২ পিস)',
        description: 'Juicy golden fried khoya dumplings soaked in cardamom sugar syrup.',
        description_bn: 'এলাচ ও সুগন্ধি রসে ডোবানো নরম ও রসালে গোলাপ জামুন।',
        price: 40.00,
        discount_price: 35.00,
        photo_url: 'https://images.unsplash.com/photo-1601050690187-8e6d2bc4a5b4?w=500',
        is_veg: 1,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 2
      },
      {
        id: 7,
        restaurant_id: 2,
        category: 'Sweets',
        category_bn: 'মিষ্টি',
        name: 'Special Kesar Rasmalai (2 Pcs)',
        name_bn: 'স্পেশাল কেসর রসমালাই',
        description: 'Spongy paneer discs floating in thick saffron pistachios milk.',
        description_bn: 'জাফরান ও পেস্তা সহযোগে ঘন ক্রিমি স্বাদের খাঁটি রসমালাই।',
        price: 70.00,
        discount_price: 65.00,
        photo_url: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=500',
        is_veg: 1,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 2
      },
      {
        id: 8,
        restaurant_id: 2,
        category: 'Sweets',
        category_bn: 'মিষ্টি',
        name: 'Premium Kaju Barfi Katli (4 Pcs)',
        name_bn: 'প্রিমিয়াম কাজু বরফি কাটলি (৪ পিস)',
        description: 'Melt-in-mouth cashew sweet embellished with silver leaf.',
        description_bn: 'খাঁটি কাজুবাদাম দিয়ে তৈরি সুস্বাদু রাজকীয় কাজু বরফি।',
        price: 85.00,
        discount_price: 80.00,
        photo_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500',
        is_veg: 1,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 2
      },
      {
        id: 9,
        restaurant_id: 2,
        category: 'Sweets',
        category_bn: 'মিষ্টি',
        name: 'Traditional Nolen Gur Sandesh (4 Pcs)',
        name_bn: 'নোলেন গুড়ের সন্দেশ (৪ পিস)',
        description: 'Authentic date palm jaggery cottage cheese sandesh.',
        description_bn: 'খাঁটি খেজুর গুড় ও ছানা দিয়ে তৈরি জিভে জল আনা সন্দেশ।',
        price: 90.00,
        discount_price: null,
        photo_url: 'https://images.unsplash.com/photo-1571217664816-953e98f0fa3b?w=500',
        is_veg: 1,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 2
      },
      {
        id: 10,
        restaurant_id: 2,
        category: 'Beverages',
        category_bn: 'পানীয়',
        name: 'Sweet Fresh Mango Lassi (Glass)',
        name_bn: 'সুইট ফ্রেশ আম লস্যি',
        description: 'Thick creamy yoghurt blended with Alphonso mango pulp.',
        description_bn: 'ঘন দই ও খাঁটি আলফানসো আমের মিক্সড ঠান্ডা লস্যি।',
        price: 50.00,
        discount_price: 45.00,
        photo_url: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=500',
        is_veg: 1,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 5
      },
      {
        id: 11,
        restaurant_id: 1,
        category: 'Beverages',
        category_bn: 'পানীয়',
        name: 'Chilled Cold Drink (Coca-Cola / Sprite 500ml)',
        name_bn: 'চিল্ড কোল্ড ড্রিঙ্ক (৫০০ মি.লি.)',
        description: 'Chilled carbonated soft drink to pair with hot biryani.',
        description_bn: 'বিরিয়ানির সাথে ঠান্ডা ঠান্ডা কোমল পানীয়।',
        price: 40.00,
        discount_price: null,
        photo_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500',
        is_veg: 1,
        is_available: 1,
        is_recommended: 0,
        preparation_minutes: 1
      },
      {
        id: 12,
        restaurant_id: 2,
        category: 'Beverages',
        category_bn: 'পানীয়',
        name: 'Special Kesar Badam Milk (Glass)',
        name_bn: 'স্পেশাল কেসর বাদাম মিল্ক',
        description: 'Chilled almond and saffron infused thick cold milk drink.',
        description_bn: 'কেসর, বাদাম ও এলাচ মিশ্রিত সুস্বাদু ঠাণ্ডা বাদাম দুধ।',
        price: 55.00,
        discount_price: 50.00,
        photo_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500',
        is_veg: 1,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 3
      },
      {
        id: 13,
        restaurant_id: 3,
        category: 'Beverages',
        category_bn: 'পানীয়',
        name: 'Thick Chocolate Cold Coffee',
        name_bn: 'থিক চকলেট কোল্ড কফি',
        description: 'Creamy espresso blended with chocolate syrup and ice cream.',
        description_bn: 'চকলেট আইসক্রিম ও কফি মিশ্রিত চিল্ড কোল্ড কফি।',
        price: 65.00,
        discount_price: 60.00,
        photo_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500',
        is_veg: 1,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 5
      },
      {
        id: 14,
        restaurant_id: 1,
        category: 'Breads',
        category_bn: 'রুটি ও নান',
        name: 'Butter Tandoori Naan',
        name_bn: 'বাটার তন্দুরি নান',
        description: 'Soft clay-oven baked flatbread brushed with amul butter.',
        description_bn: 'তন্দুরে তৈরি নরম মাখনে মাখানো বাটার নান।',
        price: 35.00,
        discount_price: null,
        photo_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500',
        is_veg: 1,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 10
      },
      {
        id: 15,
        restaurant_id: 1,
        category: 'Breads',
        category_bn: 'রুটি ও নান',
        name: 'Garlic Butter Naan',
        name_bn: 'গার্লিক বাটার নান',
        description: 'Flavoured with roasted garlic, coriander, and melted butter.',
        description_bn: 'রসুন ও ধনেপাতা ছড়িয়ে প্রস্তুত তন্দুরি গার্লিক নান।',
        price: 45.00,
        discount_price: null,
        photo_url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500',
        is_veg: 1,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 10
      },
      {
        id: 16,
        restaurant_id: 1,
        category: 'Breads',
        category_bn: 'রুটি ও নান',
        name: 'Soft Rumali Roti (2 Pcs)',
        name_bn: 'সফট রুমালি রুটি (২ পিস)',
        description: 'Thin handkerchief bread perfect with chicken chaap and kebabs.',
        description_bn: 'চিকেন চাপের সাথে জমার মতন সুস্বাদু পাত্র রুমালি রুটি।',
        price: 25.00,
        discount_price: null,
        photo_url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500',
        is_veg: 1,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 5
      },
      {
        id: 17,
        restaurant_id: 3,
        category: 'Starters',
        category_bn: 'স্ন্যাক্স',
        name: 'Kolkata Special Egg Chicken Roll',
        name_bn: 'কলকাতা স্পেশাল এগ চিকেন রোল',
        description: 'Crispy paratha stuffed with fried egg, juicy chicken tikka, onions and sauces.',
        description_bn: 'ডিম, চিকেন টিক্কা, পেঁয়াজ ও চাটনি সহযোগে মুচমুচে কাঠি রোল।',
        price: 75.00,
        discount_price: 70.00,
        photo_url: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=500',
        is_veg: 0,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 10
      },
      {
        id: 18,
        restaurant_id: 3,
        category: 'Starters',
        category_bn: 'স্ন্যাক্স',
        name: 'Crispy Paneer Tikka (4 Pcs)',
        name_bn: 'মুচমুচে পনির টিক্কা (৪ পিস)',
        description: 'Charcoal grilled marinated paneer cubes with capsicum and mint chutney.',
        description_bn: 'তন্দুরে সেঁকা তুলতুলে মশলাদার পনির টিক্কা।',
        price: 130.00,
        discount_price: 120.00,
        photo_url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500',
        is_veg: 1,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 15
      },
      {
        id: 19,
        restaurant_id: 2,
        category: 'Starters',
        category_bn: 'স্ন্যাক্স',
        name: 'Hing Kochuri with Chholar Dal (4 Pcs)',
        name_bn: 'হিঙের কচুরি ও ছোলার ডাল',
        description: 'Crispy asafoetida kachori served with sweet-spicy coconut chholar dal.',
        description_bn: 'গরম মুচমুচে হিঙের কচুরি এবং নারকেল কুচি দেওয়া সুস্বাদু ছোলার ডাল।',
        price: 40.00,
        discount_price: null,
        photo_url: 'https://images.unsplash.com/photo-1601050690187-8e6d2bc4a5b4?w=500',
        is_veg: 1,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 10
      },
      {
        id: 20,
        restaurant_id: 3,
        category: 'Rice',
        category_bn: 'বাঙালী থালি',
        name: 'Sholoana Bangali Veg Thali',
        name_bn: 'ষোলোআনা বাঙালী নিরামিষ থালি',
        description: 'Steamed rice, Jhuri alubhaja, Sukto, Sonamug dal, Dhokar dalna, Chutney & Papad.',
        description_bn: 'ভাত, ঝুরি আলুভাজা, শুক্তো, সোনামুগ ডাল, ধোঁকার ডালনা, চাটনি ও পাঁপড়।',
        price: 140.00,
        discount_price: 125.00,
        photo_url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500',
        is_veg: 1,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 15
      },
      // Items for Food Hub (Raidighi) - restaurant_id: 5
      {
        id: 21,
        restaurant_id: 5,
        category: 'Rice',
        category_bn: 'ফ্রাইড রাইস',
        name: 'Crispy Chicken Fried Rice',
        name_bn: 'ক্রিস্পি চিকেন ফ্রাইড রাইস',
        description: 'Wok tossed aromatic rice with juicy chicken bites, egg, spring onions and secret spices.',
        description_bn: 'চিকেন টুকরো, ডিম ও স্প্রিং অনিয়ন সহযোগে স্পেশাল চাইনিজ ফ্রাইড রাইস।',
        price: 140.00,
        discount_price: 130.00,
        photo_url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500',
        is_veg: 0,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 15
      },
      {
        id: 22,
        restaurant_id: 5,
        category: 'Starters',
        category_bn: 'চিলি চিকেন',
        name: 'Hot & Spicy Chilli Chicken Dry (8 Pcs)',
        name_bn: 'হট অ্যান্ড স্পাইসি চিলি চিকেন (৮ পিস)',
        description: 'Tender chicken tossed in dark soy, capsicum, garlic and green chillies.',
        description_bn: 'ক্যাপসিকাম, রসুন ও কাঁচালঙ্কা দিয়ে ফ্রাই করা সুস্বাদু চিলি চিকেন।',
        price: 160.00,
        discount_price: 150.00,
        photo_url: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=500',
        is_veg: 0,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 15
      },
      {
        id: 23,
        restaurant_id: 5,
        category: 'Starters',
        category_bn: 'চাউমিন',
        name: 'Special Raidighi Food Hub Chowmein',
        name_bn: 'ফুড হাব স্পেশাল মিক্সড চাউমিন',
        description: 'Street-style noodles loaded with chicken, egg and crunchy vegetables.',
        description_bn: 'চিকেন, ডিম ও তাজা সবজি দিয়ে তৈরি স্পেশাল স্ট্রিট চাউমিন।',
        price: 110.00,
        discount_price: null,
        photo_url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500',
        is_veg: 0,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 10
      },

      // Items for Moner Hodish (Raidighi) - restaurant_id: 6
      {
        id: 24,
        restaurant_id: 6,
        category: 'Starters',
        category_bn: 'মাছ ও পাতুড়ি',
        name: 'Moner Hodish Special Bhetki Paturi',
        name_bn: 'মনের হদিস স্পেশাল ভেটকি পাতুড়ি',
        description: 'Fresh Bhetki fillet marinated in mustard poppy paste wrapped in banana leaf and steamed.',
        description_bn: 'কলাপাতায় মোড়ানো সর্ষে-পোস্ত বাটা মাখানো খাঁটি ভেটকি পাতুড়ি।',
        price: 190.00,
        discount_price: 180.00,
        photo_url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500',
        is_veg: 0,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 20
      },
      {
        id: 25,
        restaurant_id: 6,
        category: 'Rice',
        category_bn: 'বাঙালী থালি',
        name: 'Traditional Shorshe Ilish Rice Meal',
        name_bn: 'খাঁটি সর্ষে ইলিশ ও বাসমতী ভাত',
        description: 'Fresh Padma Ilish cooked in pungent mustard gravy with piping hot steamed rice.',
        description_bn: 'তাওয়া গরম বাসমতী ভাত ও ঝাঁঝালো সর্ষে ইলিশের সুস্বাদু থালি।',
        price: 240.00,
        discount_price: 220.00,
        photo_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500',
        is_veg: 0,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 20
      },
      {
        id: 26,
        restaurant_id: 6,
        category: 'Rice',
        category_bn: 'খাসির মাংস ও পোলাও',
        name: 'Kasha Mutton with Sweet Basanti Pulao',
        name_bn: 'কষা খাসির মাংস ও মিষ্টি বাসন্তী পোলাও',
        description: 'Rich slow cooked mutton gravy served with fragrant cashew raisins Basanti Pulao.',
        description_bn: 'কাজু-কিশমিশ দেওয়া সুবাসিত বাসন্তী পোলাও এবং কষা মাটন।',
        price: 260.00,
        discount_price: 245.00,
        photo_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500',
        is_veg: 0,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 20
      },

      // Items for Royal Indian Biryani (Raidighi) - restaurant_id: 7
      {
        id: 27,
        restaurant_id: 7,
        category: 'Rice',
        category_bn: 'বিরিয়ানি',
        name: 'Royal Special Chicken Dum Biryani',
        name_bn: 'রয়্যাল স্পেশাল চিকেন দম বিরিয়ানি',
        description: 'Saffron infused fragrant basmati rice with large chicken piece, juicy alu & boiled egg.',
        description_bn: 'জাফরান চাল, বড় চিকেন পিস, আলু ও ডিম সহ রয়্যাল স্পেশাল বিরিয়ানি।',
        price: 170.00,
        discount_price: 155.00,
        photo_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500',
        is_veg: 0,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 15
      },
      {
        id: 28,
        restaurant_id: 7,
        category: 'Rice',
        category_bn: 'মাটন বিরিয়ানি',
        name: 'Royal Special Mutton Dum Biryani',
        name_bn: 'রয়্যাল মাটন দম বিরিয়ানি',
        description: 'Melt-in-mouth tender mutton piece cooked with fragrant aromatic basmati rice.',
        description_bn: 'তুলতুলে মাটন, বড় আলু ও ডিম দেওয়া খাঁটি রয়্যাল বিরিয়ানি।',
        price: 250.00,
        discount_price: 235.00,
        photo_url: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500',
        is_veg: 0,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 20
      },
      {
        id: 29,
        restaurant_id: 7,
        category: 'Starters',
        category_bn: 'চিকেন চাপ',
        name: 'Mughlai Shahi Chicken Chaap',
        name_bn: 'মুঘলাই শাহী চিকেন চাপ',
        description: 'Aromatic rich gravy with roasted spices, poppy paste and tender leg piece.',
        description_bn: 'পোস্ত, বাদাম ও ঘিয়ের সুবাস যুক্ত শাহী চিকেন চাপ।',
        price: 135.00,
        discount_price: 125.00,
        photo_url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500',
        is_veg: 0,
        is_available: 1,
        is_recommended: 1,
        preparation_minutes: 15
      }
    ],

    delivery_partners: [
      {
        id: 1,
        user_id: 5,
        service_area_id: 1,
        name: 'Rahul Sen',
        phone: '+919800000005',
        vehicle_type: 'bike',
        vehicle_number: 'WB-01-BK-4589',
        driving_license_number: 'DL-WB-2022-00918',
        status: 'approved',
        is_online: 1,
        current_lat: 22.5401,
        current_lng: 88.3610,
        last_location_updated_at: new Date().toISOString(),
        total_deliveries: 348,
        rating: 4.85,
        wallet_balance: 840.00,
        payment_method: 'upi',
        upi_id: 'rahul.sen@okaxis',
        upi_qr_photo: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400',
        bank_name: 'State Bank of India',
        bank_account_no: '20491820491',
        bank_account_holder: 'Rahul Sen',
        bank_ifsc: 'SBIN0002341',
        bank_passbook_photo: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400'
      },
      {
        id: 2,
        user_id: 6,
        service_area_id: 1,
        name: 'Subhash Roy',
        phone: '+919800000006',
        vehicle_type: 'scooter',
        vehicle_number: 'WB-02-SC-8812',
        driving_license_number: 'DL-WB-2021-00445',
        status: 'approved',
        is_online: 1,
        current_lat: 22.5220,
        current_lng: 88.3490,
        last_location_updated_at: new Date().toISOString(),
        total_deliveries: 215,
        rating: 4.90,
        wallet_balance: 620.00,
        payment_method: 'bank',
        upi_id: 'subhashroy@paytm',
        upi_qr_photo: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400',
        bank_name: 'HDFC Bank',
        bank_account_no: '501002381948',
        bank_account_holder: 'Subhash Roy',
        bank_ifsc: 'HDFC0000123',
        bank_passbook_photo: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400'
      },
      {
        id: 3,
        user_id: 10,
        service_area_id: 1,
        name: 'Amit Mondal',
        phone: '+919800000010',
        vehicle_type: 'bike',
        vehicle_number: 'WB-04-AB-7721',
        driving_license_number: 'DL-WB-2023-09881',
        status: 'pending', // Pending approval by Admin
        is_online: 0,
        current_lat: null,
        current_lng: null,
        last_location_updated_at: null,
        total_deliveries: 0,
        rating: 5.0,
        wallet_balance: 0.00,
        payment_method: 'upi',
        upi_id: 'amitmondal@ybl',
        upi_qr_photo: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400',
        bank_name: 'Bandhan Bank',
        bank_account_no: '101900481920',
        bank_account_holder: 'Amit Mondal',
        bank_ifsc: 'BDBL0001402',
        bank_passbook_photo: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400'
      }
    ],


    addresses: [
      {
        id: 1,
        user_id: 7,
        type: 'home',
        label: 'Home (বাড়ি)',
        address_line: 'Flat 3B, Sunshine Heights, 14 Ballygunge Circular Road, Kolkata 700019',
        landmark: 'Near Ballygunge Post Office',
        latitude: 22.5292,
        longitude: 88.3612,
        is_default: 1
      },
      {
        id: 2,
        user_id: 7,
        type: 'work',
        label: 'Office (অফিস)',
        address_line: 'Tech Hub Tower, Sector V, Salt Lake, Kolkata 700091',
        landmark: 'Opposite College More',
        latitude: 22.5726,
        longitude: 88.4312,
        is_default: 0
      }
    ],

    coupons: [
      {
        id: 1,
        code: 'PROTHOM50',
        description: 'Get 50% OFF up to ₹100 on your first food order',
        description_bn: 'প্রথম অর্ডারে ৫০% ছাড় (সর্বোচ্চ ১০০ টাকা)',
        discount_type: 'percentage',
        discount_value: 50.00,
        max_discount: 100.00,
        min_order_amount: 150.00,
        is_active: 1
      },
      {
        id: 2,
        code: 'AHARLOCAL',
        description: 'Flat ₹40 OFF on local favorite meals above ₹199',
        description_bn: '১৯৯ টাকার ওপর অর্ডারে সোজা ৪০ টাকা ছাড়',
        discount_type: 'fixed',
        discount_value: 40.00,
        max_discount: 40.00,
        min_order_amount: 199.00,
        is_active: 1
      },
      {
        id: 3,
        code: 'ANANDA20',
        description: '20% OFF on all Bengali sweet and snacks orders',
        description_bn: 'মিষ্টি ও স্ন্যাক্স অর্ডারে ২০% ছাড়',
        discount_type: 'percentage',
        discount_value: 20.00,
        max_discount: 60.00,
        min_order_amount: 100.00,
        is_active: 1
      }
    ],

    orders: [
      {
        id: 1,
        order_number: 'ORD-2026-8801',
        customer_id: 7,
        customer_name: 'Bikram Das',
        customer_phone: '+919800000007',
        restaurant_id: 1,
        restaurant_name: 'Kolkata Royal Biryani House',
        restaurant_phone: '+919800000002',
        restaurant_address: '42/A Park Circus Crossing, Kolkata 700017',
        restaurant_lat: 22.5429,
        restaurant_lng: 88.3653,
        delivery_partner_id: 1,
        delivery_partner_name: 'Rahul Sen',
        delivery_partner_phone: '+919800000005',
        delivery_partner_lat: 22.5385,
        delivery_partner_lng: 88.3630,
        service_area_id: 1,
        status: 'on_the_way',
        delivery_address: 'Flat 3B, Sunshine Heights, 14 Ballygunge Circular Road, Kolkata 700019',
        delivery_landmark: 'Near Ballygunge Post Office',
        delivery_lat: 22.5292,
        delivery_lng: 88.3612,
        items: [
          { food_id: 1, food_name: 'Kolkata Special Chicken Biryani', price: 160.00, quantity: 1, total_price: 160.00 },
          { food_id: 3, food_name: 'Shahi Chicken Chaap', price: 140.00, quantity: 1, total_price: 140.00 }
        ],
        subtotal: 300.00,
        delivery_fee: 25.00,
        discount: 40.00,
        tax: 15.00,
        grand_total: 300.00,
        payment_method: 'cod',
        payment_status: 'cod',
        preparation_minutes: 20,
        estimated_delivery_time: '15 mins',
        customer_notes: 'Please bring extra salad and spoons',
        placed_at: new Date(Date.now() - 25 * 60000).toISOString(),
        accepted_at: new Date(Date.now() - 20 * 60000).toISOString(),
        picked_up_at: new Date(Date.now() - 5 * 60000).toISOString()
      },
      {
        id: 2,
        order_number: 'ORD-2026-8802',
        customer_id: 7,
        customer_name: 'Bikram Das',
        customer_phone: '+919800000007',
        restaurant_id: 2,
        restaurant_name: 'Maa Tara Mishtanna Bhandar',
        restaurant_phone: '+919800000003',
        restaurant_address: '18 Kalighat Temple Road, Kolkata 700026',
        restaurant_lat: 22.5204,
        restaurant_lng: 88.3448,
        delivery_partner_id: null,
        delivery_partner_name: null,
        delivery_partner_phone: null,
        delivery_partner_lat: null,
        delivery_partner_lng: null,
        service_area_id: 1,
        status: 'delivered',
        delivery_address: 'Flat 3B, Sunshine Heights, 14 Ballygunge Circular Road, Kolkata 700019',
        delivery_landmark: 'Near Ballygunge Post Office',
        delivery_lat: 22.5292,
        delivery_lng: 88.3612,
        items: [
          { food_id: 4, food_name: 'Baked Rosogolla (2 Pcs)', price: 50.00, quantity: 2, total_price: 100.00 },
          { food_id: 5, food_name: 'Kolkata Special Mishti Doi (Cup)', price: 55.00, quantity: 1, total_price: 55.00 }
        ],
        subtotal: 155.00,
        delivery_fee: 25.00,
        discount: 0.00,
        tax: 7.75,
        grand_total: 187.75,
        payment_method: 'upi',
        payment_status: 'paid',
        escrow_status: 'holding',
        holding_until: new Date(Date.now() + 21 * 3600000).toISOString(), // ~21 hours remaining
        net_restaurant_amount: 136.40,
        preparation_minutes: 10,
        estimated_delivery_time: null,
        customer_notes: 'Fresh sweets please',
        placed_at: new Date(Date.now() - 180 * 60000).toISOString(),
        delivered_at: new Date(Date.now() - 145 * 60000).toISOString()
      },
      {
        id: 3,
        order_number: 'ORD-2026-8803',
        customer_id: 7,
        customer_name: 'Bikram Das',
        customer_phone: '+919800000007',
        restaurant_id: 1,
        restaurant_name: 'Kolkata Royal Biryani House',
        restaurant_phone: '+919800000002',
        restaurant_address: '42/A Park Circus Crossing, Kolkata 700017',
        restaurant_lat: 22.5429,
        restaurant_lng: 88.3653,
        delivery_partner_id: 1,
        delivery_partner_name: 'Rahul Sen',
        delivery_partner_phone: '+919800000005',
        delivery_partner_lat: 22.5292,
        delivery_partner_lng: 88.3612,
        service_area_id: 1,
        status: 'delivered',
        delivery_address: 'Flat 3B, Sunshine Heights, 14 Ballygunge Circular Road, Kolkata 700019',
        delivery_landmark: 'Near Ballygunge Post Office',
        delivery_lat: 22.5292,
        delivery_lng: 88.3612,
        items: [
          { food_id: 2, food_name: 'Kolkata Royal Mutton Biryani', price: 240.00, quantity: 1, total_price: 240.00 }
        ],
        subtotal: 240.00,
        delivery_fee: 25.00,
        discount: 25.00,
        tax: 12.00,
        grand_total: 252.00,
        payment_method: 'upi',
        payment_status: 'paid',
        escrow_status: 'matured', // 24 hours passed, ready for admin payout
        holding_until: new Date(Date.now() - 2 * 3600000).toISOString(),
        net_restaurant_amount: 204.00,
        preparation_minutes: 20,
        estimated_delivery_time: null,
        placed_at: new Date(Date.now() - 26 * 3600000).toISOString(),
        delivered_at: new Date(Date.now() - 25 * 3600000).toISOString()
      },
      {
        id: 4,
        order_number: 'ORD-2026-8804',
        customer_id: 9,
        customer_name: 'Priyanka Sen (VIP Customer)',
        customer_phone: '+919800000009',
        restaurant_id: 3,
        restaurant_name: 'Banglar Rannaghor & Thali',
        restaurant_phone: '+919800000004',
        restaurant_address: '78 Gariahat Road, Kolkata 700019',
        restaurant_lat: 22.5186,
        restaurant_lng: 88.3664,
        delivery_partner_id: 2,
        delivery_partner_name: 'Subhash Roy',
        delivery_partner_phone: '+919800000006',
        delivery_partner_lat: 22.5220,
        delivery_partner_lng: 88.3490,
        service_area_id: 1,
        status: 'delivered',
        delivery_address: 'Southern Avenue, Lake Market, Kolkata 700029',
        delivery_landmark: 'Opposite Lake Stadium',
        delivery_lat: 22.5150,
        delivery_lng: 88.3580,
        items: [
          { food_id: 7, food_name: 'Sholoana Bangali Veg Thali', price: 125.00, quantity: 1, total_price: 125.00 }
        ],
        subtotal: 125.00,
        delivery_fee: 25.00,
        discount: 0.00,
        tax: 6.25,
        grand_total: 156.25,
        payment_method: 'upi',
        payment_status: 'paid',
        escrow_status: 'disputed', // Customer dispute logged
        holding_until: new Date(Date.now() + 8 * 3600000).toISOString(),
        dispute_reason: 'Customer reported container was unsealed upon arrival. Requested immediate refund.',
        net_restaurant_amount: 107.50,
        preparation_minutes: 15,
        estimated_delivery_time: null,
        placed_at: new Date(Date.now() - 16 * 3600000).toISOString(),
        delivered_at: new Date(Date.now() - 15 * 3600000).toISOString()
      }
    ],

    notifications: [
      {
        id: 1,
        user_id: 7,
        role: 'customer',
        title: 'Order On The Way!',
        title_bn: 'অর্ডার রাস্তায় আছে!',
        message: 'Your Biryani order #ORD-2026-8801 is picked up by Rahul Sen and will arrive in 15 mins.',
        message_bn: 'আপনার বিরিয়ানি অর্ডার ডেলিভারি বয় রাহুল সেন তুলে নিয়েছেন এবং ১৫ মিনিটে পৌঁছে যাবে।',
        type: 'order_status',
        is_read: 0,
        created_at: new Date(Date.now() - 5 * 60000).toISOString()
      },
      {
        id: 2,
        user_id: 2,
        role: 'restaurant',
        title: 'New Order Received',
        title_bn: 'নতুন অর্ডার এসেছে',
        message: 'Order #ORD-2026-8801 is active for Kolkata Royal Biryani.',
        message_bn: 'আপনার রেস্তোরাঁর জন্য অর্ডার এসেছে।',
        type: 'new_order',
        is_read: 1,
        created_at: new Date(Date.now() - 25 * 60000).toISOString()
      },
      {
        id: 3,
        user_id: 5,
        role: 'delivery',
        title: 'Delivery Assigned',
        title_bn: 'নতুন ডেলিভারি পেলেন',
        message: 'Order #ORD-2026-8801 from Kolkata Royal Biryani is assigned to you.',
        message_bn: 'কলকাতা রয়্যাল বিরিয়ানি থেকে ডেলিভারি অর্ডার পেয়েছেন।',
        type: 'assignment',
        is_read: 1,
        created_at: new Date(Date.now() - 15 * 60000).toISOString()
      }
    ],

    wallets: [
      { id: 1, user_id: 2, role: 'restaurant', balance: 4500.00, total_earned: 12400.00, total_withdrawn: 7900.00 },
      { id: 2, user_id: 5, role: 'delivery', balance: 840.00, total_earned: 3200.00, total_withdrawn: 2360.00 }
    ],

    wallet_transactions: [
      { id: 1, wallet_id: 1, amount: 255.00, type: 'credit', reference_type: 'order_earning', reference_id: 1, description: 'Net earning from order #ORD-2026-8801', created_at: new Date().toISOString() },
      { id: 2, wallet_id: 2, amount: 35.00, type: 'credit', reference_type: 'delivery_fee', reference_id: 1, description: 'Delivery fee for order #ORD-2026-8801', created_at: new Date().toISOString() }
    ]
  };
}

initInMemoryStore();

let mysqlPool: mysql.Pool | null = null;
let useMysql = false;

// Hostinger MySQL connection configuration with backward compatibility for DATABASE_* and DB_* env vars
const dbHost = process.env.DB_HOST || process.env.DATABASE_HOST || '';
const dbPort = Number(process.env.DB_PORT || process.env.DATABASE_PORT || process.env.MYSQL_PORT) || 3306;
const dbUser = process.env.DB_USER || process.env.DATABASE_USER || '';
const dbPassword = process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || '';
const dbName = process.env.DB_NAME || process.env.DATABASE_NAME || 'u691798054_aharlocal_db';

const isProduction = process.env.NODE_ENV === 'production';

if (dbHost && dbUser) {
  try {
    mysqlPool = mysql.createPool({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
      charset: 'utf8mb4'
    });
    useMysql = true;
    console.log(`[Database] MySQL pool initialized successfully for host: ${dbHost}, database: ${dbName}`);
  } catch (err: any) {
    console.error('[Database] Failed to initialize MySQL connection pool:', err.message);
    if (isProduction) {
      throw new Error(`CRITICAL: Failed to initialize MySQL connection pool in production: ${err.message}`);
    }
  }
} else {
  if (isProduction) {
    throw new Error('CRITICAL: Missing required MySQL environment variables (DB_HOST, DB_USER, DB_NAME, DB_PASSWORD) in production environment.');
  } else {
    console.warn('[Database] MySQL credentials not provided. Running in memory-fallback mode for development/testing.');
  }
}

/**
 * Test database connectivity and return status details.
 */
export async function testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  if (!mysqlPool) {
    return { success: false, message: 'MySQL pool is not initialized or configured.' };
  }
  try {
    const connection = await mysqlPool.getConnection();
    const [rows]: any = await connection.query('SELECT DATABASE() as current_db, NOW() as server_time');
    connection.release();
    return {
      success: true,
      message: `Successfully connected to MySQL database: ${rows[0]?.current_db}`,
      details: rows[0]
    };
  } catch (err: any) {
    return {
      success: false,
      message: `MySQL connection test failed: ${err.message}`
    };
  }
}

export const db = {
  getStore() {
    return inMemoryStore;
  },

  getPool() {
    return mysqlPool;
  },

  isUsingMysql() {
    return useMysql;
  },

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    if (useMysql && mysqlPool) {
      try {
        const [rows, fields] = await mysqlPool.execute(sql, params);
        return { rows: rows as T[] };
      } catch (e: any) {
        console.error('[Database] MySQL query failed:', e.message, 'SQL:', sql);
        if (isProduction) {
          throw new Error(`Database query failed in production: ${e.message}`);
        }
        console.warn('[Database] Falling back to memory store for development/testing.');
      }
    }
    // Return empty or memory store handled by high-level services
    return { rows: [] };
  }
};
