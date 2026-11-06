-- ==============================================================================
-- AharLocal (আহার Local) - Seed Data
-- ==============================================================================

-- 1. Users (passwords hashed for 'password123' / 'admin123')
INSERT INTO users (id, name, email, phone, password_hash, role, profile_photo, language, is_active) VALUES
(1, 'AharLocal Operations', 'admin@aharlocal.com', '+919800000001', '$2a$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m', 'admin', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'bn', 1),
(2, 'Subrata Ghosh', 'kolkatabiryani@aharlocal.com', '+919800000002', '$2a$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m', 'restaurant', 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150', 'bn', 1),
(3, 'Debabrata Modak', 'maatarasweets@aharlocal.com', '+919800000003', '$2a$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m', 'restaurant', 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=150', 'bn', 1),
(4, 'Soma Mukherjee', 'banglarrannaghor@aharlocal.com', '+919800000004', '$2a$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m', 'restaurant', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'bn', 1),
(5, 'Rahul Sen', 'rahul.delivery@aharlocal.com', '+919800000005', '$2a$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m', 'delivery', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'bn', 1),
(6, 'Subhash Roy', 'subhash.delivery@aharlocal.com', '+919800000006', '$2a$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m', 'delivery', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'bn', 1),
(7, 'Bikram Das', 'customer@aharlocal.com', '+919800000007', '$2a$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m', 'customer', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'bn', 1),
(8, 'Tanmoy Nandi', 'newrest@aharlocal.com', '+919800000008', '$2a$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m', 'restaurant', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'bn', 1);

-- 2. Service Areas
INSERT INTO service_areas (id, name, name_bn, min_delivery_charge, per_km_charge, is_active) VALUES
(1, 'Central & South Kolkata Service Zone', 'সেন্ট্রাল ও সাউথ কলকাতা সার্ভিস এরিয়া', 25.00, 8.00, 1),
(2, 'Salt Lake & New Town Delivery Zone', 'সল্টলেক ও নিউ টাউন ডেলিভারি এরিয়া', 30.00, 9.00, 1);

-- 3. Service Area Points (Coordinates defining the polygon geofence)
INSERT INTO service_area_points (id, service_area_id, latitude, longitude, sequence_order) VALUES
(1, 1, 22.5850, 88.3300, 1),
(2, 1, 22.5850, 88.3850, 2),
(3, 1, 22.5100, 88.3900, 3),
(4, 1, 22.5050, 88.3350, 4),
(5, 1, 22.5400, 88.3200, 5),
(6, 2, 22.6000, 88.4000, 1),
(7, 2, 22.6000, 88.4700, 2),
(8, 2, 22.5400, 88.4750, 3),
(9, 2, 22.5400, 88.4050, 4);

-- 4. Restaurants
INSERT INTO restaurants (id, user_id, service_area_id, name, name_bn, owner_name, phone, email, address, latitude, longitude, photo_url, banner_url, fssai_license, commission_rate, min_order_amount, avg_delivery_minutes, rating, rating_count, is_open, is_pure_veg, status) VALUES
(1, 2, 1, 'Kolkata Royal Biryani House', 'কলকাতা রয়্যাল বিরিয়ানি হাউস', 'Subrata Ghosh', '+919800000002', 'kolkatabiryani@aharlocal.com', '42/A Park Circus Crossing, Kolkata 700017', 22.5429, 88.3653, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600', 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=1200', 'FSSAI-12821019000123', 15.00, 99.00, 25, 4.8, 420, 1, 0, 'approved'),
(2, 3, 1, 'Maa Tara Mishtanna Bhandar', 'মা তারা মিষ্টান্ন ভাণ্ডার', 'Debabrata Modak', '+919800000003', 'maatarasweets@aharlocal.com', '18 Kalighat Temple Road, Kolkata 700026', 22.5204, 88.3448, 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600', 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=1200', 'FSSAI-12821019000456', 12.00, 50.00, 20, 4.9, 850, 1, 1, 'approved'),
(3, 4, 1, 'Banglar Rannaghor & Thali', 'বাংলার রান্নাঘর ও থালি', 'Soma Mukherjee', '+919800000004', 'banglarrannaghor@aharlocal.com', '78 Gariahat Road, Kolkata 700019', 22.5186, 88.3664, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=1200', 'FSSAI-12821019000789', 14.00, 80.00, 30, 4.6, 310, 1, 0, 'approved'),
(4, 8, 1, 'Hindusthan Roll Corner', 'হিন্দুস্থান রোল কর্নার', 'Tanmoy Nandi', '+919800000008', 'newrest@aharlocal.com', '12 Shyambazar 5-Point Crossing', 22.6001, 88.3712, 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=600', 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1200', 'FSSAI-12821019000999', 15.00, 60.00, 20, 4.2, 45, 1, 0, 'pending');

-- 5. Food Categories
INSERT INTO food_categories (id, name, name_bn, image_url, sort_order) VALUES
(1, 'Biryani & Kebabs', 'বিরিয়ানি ও কাবাব', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200', 1),
(2, 'Bengali Sweets & Mishti', 'মিষ্টি ও দই', 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=200', 2),
(3, 'Traditional Thali', 'বাঙালী থালি ও ভাত', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=200', 3),
(4, 'Rolls & Fast Food', 'কাঠি রোল ও ফাস্ট ফুড', 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=200', 4),
(5, 'Fish & Mutton Curries', 'মাছ ও খাসির মাংস', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200', 5),
(6, 'Evening Snacks & Tea', 'সন্ধ্যার স্ন্যাক্স ও চা', 'https://images.unsplash.com/photo-1601050690187-8e6d2bc4a5b4?w=200', 6);

-- 6. Restaurant Menu Categories
INSERT INTO restaurant_categories (id, restaurant_id, name, name_bn, sort_order) VALUES
(1, 1, 'Special Kolkata Biryani', 'স্পেশাল কলকাতা বিরিয়ানি', 1),
(2, 1, 'Chaap & Gravies', 'চিকেন/মাটন চাপ', 2),
(3, 2, 'Authentic Bengal Mishti', 'খাঁটি বাংলা মিষ্টি', 1),
(4, 2, 'Kachori & Singara', 'হিঙের কচুরি ও গরম সিঙাড়া', 2),
(5, 3, 'Authentic Bengali Thalis', 'স্পেশাল বাঙালী থালি', 1),
(6, 3, 'Fish Delicacies', 'ইলিশ ও ভেটকি', 2);

-- 7. Foods / Dishes
INSERT INTO foods (id, restaurant_id, restaurant_category_id, global_category_id, name, name_bn, description, description_bn, price, discount_price, photo_url, is_veg, is_available, is_recommended, preparation_minutes) VALUES
(1, 1, 1, 1, 'Kolkata Special Chicken Biryani', 'কলকাতা স্পেশাল চিকেন বিরিয়ানি', 'Fragrant basmati rice served with tender chicken piece, golden potato (alu), and egg.', 'সুগন্ধি বাসমতী চাল, নরম চিকেন, মশলাদার আলু এবং ডিম সহযোগে খাঁটি কলকাতার বিরিয়ানি।', 180.00, 160.00, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500', 0, 1, 1, 15),
(2, 1, 1, 1, 'Kolkata Royal Mutton Biryani', 'কলকাতা রয়্যাল মাটন বিরিয়ানি', 'Slow-cooked aged mutton with melt-in-mouth potato and basmati rice infused with saffron.', 'সুস্বাদু মাটন পিস, সুগন্ধি চাল ও জাফরান গন্ধযুক্ত সেরা স্বাদের মাটন বিরিয়ানি।', 260.00, 240.00, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500', 0, 1, 1, 20),
(3, 1, 2, 1, 'Shahi Chicken Chaap', 'শাহী চিকেন চাপ', 'Rich and aromatic slow-cooked chicken gravy with cashew and poppy paste.', 'পোস্ত ও কাজুবাদাম বাটা দিয়ে তৈরি সুস্বাদু ও ঘন চিকেন চাপ।', 140.00, NULL, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500', 0, 1, 1, 15),
(4, 2, 3, 2, 'Baked Rosogolla (2 Pcs)', 'বেকড রসগোল্লা (২ পিস)', 'Warm caramelised cottage cheese dumplings baked in thick rabri.', 'ঘন রাবড়িতে বেক করা নরম তুলতুলে সুস্বাদু বেকড রসগোল্লা।', 60.00, 50.00, 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500', 1, 1, 1, 5),
(5, 2, 3, 2, 'Kolkata Special Mishti Doi (Cup)', 'কলকাতার স্পেশাল মিষ্টি দই', 'Traditional earthen pot sweetened curd with rich creamy texture.', 'খাঁটি মাটির ভাঁড়ে পাতা ঘন ও খাঁটি মিষ্টি দই।', 55.00, NULL, 'https://images.unsplash.com/photo-1571217664816-953e98f0fa3b?w=500', 1, 1, 1, 2),
(6, 2, 4, 6, 'Hing Kochuri with Chholar Dal (4 Pcs)', 'হিঙের কচুরি ও ছোলার ডাল', 'Crispy asafoetida kachori served with sweet-spicy coconut chholar dal.', 'গরম মুচমুচে হিঙের কচুরি এবং নারকেল কুচি দেওয়া সুস্বাদু ছোলার ডাল।', 40.00, NULL, 'https://images.unsplash.com/photo-1601050690187-8e6d2bc4a5b4?w=500', 1, 1, 1, 10),
(7, 3, 5, 3, 'Sholoana Bangali Veg Thali', 'ষোলোআনা বাঙালী নিরামিষ থালি', 'Steamed rice, Jhuri alubhaja, Sukto, Sonamug dal, Dhokar dalna, Chutney & Papad.', 'ভাত, ঝুরি আলুভাজা, শুক্তো, সোনামুগ ডাল, ধোঁকার ডালনা, চাটনি ও পাঁপড়।', 140.00, 125.00, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500', 1, 1, 1, 15),
(8, 3, 6, 5, 'Bhetki Macher Paturi', 'ভেটকি মাছের পাতুরি', 'Boneless bhetki fish fillet marinated in mustard-coconut paste wrapped in banana leaf.', 'কলাপাতা মোড়া সর্ষে-নারকেল বাটায় খাঁটি ভেটকি মাছের পাতুরি।', 190.00, NULL, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500', 0, 1, 1, 20);

-- 8. Delivery Partners
INSERT INTO delivery_partners (id, user_id, service_area_id, vehicle_type, vehicle_number, driving_license_number, status, is_online, current_lat, current_lng, last_location_updated_at, total_deliveries, rating, wallet_balance) VALUES
(1, 5, 1, 'bike', 'WB-01-BK-4589', 'DL-WB-2022-00918', 'approved', 1, 22.5401, 88.3610, NOW(), 348, 4.85, 840.00),
(2, 6, 1, 'scooter', 'WB-02-SC-8812', 'DL-WB-2021-00445', 'approved', 1, 22.5220, 88.3490, NOW(), 215, 4.90, 620.00);

-- 9. Customer Addresses
INSERT INTO addresses (id, user_id, type, label, address_line, landmark, latitude, longitude, is_default) VALUES
(1, 7, 'home', 'Home (বাড়ি)', 'Flat 3B, Sunshine Heights, 14 Ballygunge Circular Road, Kolkata 700019', 'Near Ballygunge Post Office', 22.5292, 88.3612, 1),
(2, 7, 'work', 'Office (অফিস)', 'Tech Hub Tower, Sector V, Salt Lake, Kolkata 700091', 'Opposite College More', 22.5726, 88.4312, 0);

-- 10. Coupons
INSERT INTO coupons (id, code, description, description_bn, discount_type, discount_value, max_discount, min_order_amount, is_active) VALUES
(1, 'PROTHOM50', 'Get 50% OFF up to ₹100 on your first food order', 'প্রথম অর্ডারে ৫০% ছাড় (সর্বোচ্চ ১০০ টাকা)', 'percentage', 50.00, 100.00, 150.00, 1),
(2, 'AHARLOCAL', 'Flat ₹40 OFF on local favorite meals above ₹199', '১৯৯ টাকার ওপর অর্ডারে সোজা ৪০ টাকা ছাড়', 'fixed', 40.00, 40.00, 199.00, 1),
(3, 'ANANDA20', '20% OFF on all Bengali sweet and snacks orders', 'মিষ্টি ও স্ন্যাক্স অর্ডারে ২০% ছাড়', 'percentage', 20.00, 60.00, 100.00, 1);

-- 11. Sample Orders
INSERT INTO orders (id, order_number, customer_id, restaurant_id, delivery_partner_id, service_area_id, status, delivery_address, delivery_landmark, delivery_lat, delivery_lng, subtotal, delivery_fee, discount, tax, grand_total, payment_method, payment_status, preparation_minutes, estimated_delivery_time, customer_notes, placed_at, accepted_at) VALUES
(1, 'ORD-2026-8801', 7, 1, 1, 1, 'on_the_way', 'Flat 3B, Sunshine Heights, 14 Ballygunge Circular Road, Kolkata 700019', 'Near Ballygunge Post Office', 22.5292, 88.3612, 300.00, 25.00, 40.00, 15.00, 300.00, 'cod', 'cod', 20, DATE_ADD(NOW(), INTERVAL 15 MINUTE), 'Please deliver with extra salad and spoons', DATE_SUB(NOW(), INTERVAL 25 MINUTE), DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
(2, 'ORD-2026-8802', 7, 2, NULL, 1, 'delivered', 'Flat 3B, Sunshine Heights, 14 Ballygunge Circular Road, Kolkata 700019', 'Near Ballygunge Post Office', 22.5292, 88.3612, 150.00, 25.00, 0.00, 7.50, 182.50, 'cod', 'paid', 10, NULL, 'Fresh sweets please', DATE_SUB(NOW(), INTERVAL 3 HOUR), DATE_SUB(NOW(), INTERVAL 3 HOUR));

-- 12. Order Items
INSERT INTO order_items (id, order_id, food_id, food_name, price, quantity, total_price) VALUES
(1, 1, 1, 'Kolkata Special Chicken Biryani', 160.00, 1, 160.00),
(2, 1, 3, 'Shahi Chicken Chaap', 140.00, 1, 140.00),
(3, 2, 4, 'Baked Rosogolla (2 Pcs)', 50.00, 2, 100.00),
(4, 2, 5, 'Kolkata Special Mishti Doi (Cup)', 55.00, 1, 55.00);

-- 13. Notifications
INSERT INTO notifications (id, user_id, role, title, title_bn, message, message_bn, type, is_read) VALUES
(1, 7, 'customer', 'Order On The Way!', 'অর্ডার রাস্তায় আছে!', 'Your Biryani order #ORD-2026-8801 is picked up by Rahul Sen and will arrive in 15 mins.', 'আপনার বিরিয়ানি অর্ডার ডেলিভারি বয় রাহুল সেন তুলে নিয়েছেন এবং ১৫ মিনিটে পৌঁছে যাবে।', 'order_status', 0),
(2, 2, 'restaurant', 'New Order Received', 'নতুন অর্ডার এসেছে', 'You have an active order #ORD-2026-8801 for Kolkata Royal Biryani.', 'আপনার রেস্তোরাঁর জন্য নতুন অর্ডার এসেছে।', 'new_order', 1),
(3, 5, 'delivery', 'Delivery Assigned', 'নতুন ডেলিভারি পেলেন', 'Order #ORD-2026-8801 from Kolkata Royal Biryani is assigned to you.', 'কলকাতা রয়্যাল বিরিয়ানি থেকে ডেলিভারি অর্ডার পেয়েছেন।', 'assignment', 1);

-- 14. Admin Users
INSERT INTO admin_users (id, user_id, role, permissions) VALUES
(1, 1, 'super_admin', '{"can_manage_restaurants": true, "can_manage_partners": true, "can_manage_orders": true, "can_manage_service_areas": true}');

-- 15. Wallets
INSERT INTO wallets (id, user_id, role, balance, total_earned, total_withdrawn) VALUES
(1, 2, 'restaurant', 4500.00, 12400.00, 7900.00),
(2, 5, 'delivery', 840.00, 3200.00, 2360.00);
