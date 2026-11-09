-- ==============================================================================
-- AharLocal (আহার Local) - Hostinger MySQL Database Schema & Seed Script
-- Target Database: u691798054_aharlocal_db
-- Target User:     u691798054_aharlocal_user
-- Host:            localhost (Hostinger Shared Hosting)
-- Charset:         utf8mb4 (Full Bengali and Emoji unicode support)
-- Engine:          InnoDB (ACID transactions, foreign keys & row-level locking)
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `admin_users`;
DROP TABLE IF EXISTS `delivery_assignments`;
DROP TABLE IF EXISTS `location_updates`;
DROP TABLE IF EXISTS `location_rankings`;
DROP TABLE IF EXISTS `commissions`;
DROP TABLE IF EXISTS `payout_requests`;
DROP TABLE IF EXISTS `wallet_transactions`;
DROP TABLE IF EXISTS `wallets`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `restaurant_promocodes`;
DROP TABLE IF EXISTS `coupons`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `addresses`;
DROP TABLE IF EXISTS `delivery_partners`;
DROP TABLE IF EXISTS `restaurant_hours`;
DROP TABLE IF EXISTS `foods`;
DROP TABLE IF EXISTS `restaurant_categories`;
DROP TABLE IF EXISTS `food_categories`;
DROP TABLE IF EXISTS `restaurants`;
DROP TABLE IF EXISTS `service_area_points`;
DROP TABLE IF EXISTS `service_areas`;
DROP TABLE IF EXISTS `platform_settings`;
DROP TABLE IF EXISTS `promotions`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------------------
-- 1. Users Table
-- ------------------------------------------------------------------------------
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(150) UNIQUE NOT NULL,
  `phone` VARCHAR(20) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('customer', 'restaurant', 'delivery', 'admin') NOT NULL DEFAULT 'customer',
  `profile_photo` VARCHAR(255) NULL,
  `passport_photo` VARCHAR(255) NULL,
  `language` VARCHAR(10) NOT NULL DEFAULT 'bn',
  `cod_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `status` ENUM('active', 'blocked') NOT NULL DEFAULT 'active',
  `dob` VARCHAR(30) NULL,
  `gender` VARCHAR(20) NULL,
  `address` TEXT NULL,
  `auth_provider` VARCHAR(30) NOT NULL DEFAULT 'local',
  `payment_method` ENUM('upi', 'bank') NOT NULL DEFAULT 'upi',
  `upi_id` VARCHAR(100) NULL,
  `upi_qr_photo` VARCHAR(255) NULL,
  `bank_name` VARCHAR(150) NULL,
  `bank_account_no` VARCHAR(60) NULL,
  `bank_account_holder` VARCHAR(120) NULL,
  `bank_ifsc` VARCHAR(30) NULL,
  `bank_passbook_photo` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_role` (`role`),
  INDEX `idx_user_phone` (`phone`),
  INDEX `idx_user_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Service Areas Table (Hyperlocal Geofence Boundary)
-- ------------------------------------------------------------------------------
CREATE TABLE `service_areas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `name_bn` VARCHAR(150) NOT NULL,
  `min_delivery_charge` DECIMAL(8,2) NOT NULL DEFAULT 25.00,
  `per_km_charge` DECIMAL(8,2) NOT NULL DEFAULT 8.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `polygon_json` LONGTEXT NULL COMMENT 'Array of {lat, lng} vertices defining polygon',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Service Area Points (Normalized polygon coordinates for GIS queries)
-- ------------------------------------------------------------------------------
CREATE TABLE `service_area_points` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `service_area_id` INT NOT NULL,
  `latitude` DECIMAL(10, 8) NOT NULL,
  `longitude` DECIMAL(11, 8) NOT NULL,
  `sequence_order` INT NOT NULL DEFAULT 0,
  FOREIGN KEY (`service_area_id`) REFERENCES `service_areas`(`id`) ON DELETE CASCADE,
  INDEX `idx_sa_points` (`service_area_id`, `sequence_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Restaurants Table
-- ------------------------------------------------------------------------------
CREATE TABLE `restaurants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `service_area_id` INT NULL,
  `name` VARCHAR(150) NOT NULL,
  `name_bn` VARCHAR(180) NOT NULL,
  `owner_name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `address` TEXT NOT NULL,
  `latitude` DECIMAL(10, 8) NOT NULL,
  `longitude` DECIMAL(11, 8) NOT NULL,
  `photo_url` VARCHAR(255) NOT NULL,
  `banner_url` VARCHAR(255) NULL,
  `photos_json` TEXT NULL COMMENT 'JSON array of gallery photos',
  `fssai_license` VARCHAR(80) NULL,
  `document_photo` VARCHAR(255) NULL,
  `trade_license` VARCHAR(80) NULL,
  `gst_number` VARCHAR(50) NULL,
  `commission_rate` DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  `min_order_amount` DECIMAL(8,2) NOT NULL DEFAULT 50.00,
  `avg_delivery_minutes` INT NOT NULL DEFAULT 30,
  `rating` DECIMAL(3,2) NOT NULL DEFAULT 4.50,
  `rating_count` INT NOT NULL DEFAULT 0,
  `is_open` TINYINT(1) NOT NULL DEFAULT 1,
  `is_pure_veg` TINYINT(1) NOT NULL DEFAULT 0,
  `self_delivery_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `self_delivery_radius_km` DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `status` ENUM('pending', 'approved', 'rejected', 'blocked') NOT NULL DEFAULT 'approved',
  `rejection_reason` TEXT NULL,
  `cuisine_types_json` TEXT NULL COMMENT 'JSON array of cuisines e.g. ["Biryani", "Bengali"]',
  `payment_method` ENUM('upi', 'bank') NOT NULL DEFAULT 'upi',
  `upi_id` VARCHAR(100) NULL,
  `upi_qr_photo` VARCHAR(255) NULL,
  `bank_name` VARCHAR(150) NULL,
  `bank_account_no` VARCHAR(60) NULL,
  `bank_account_holder` VARCHAR(120) NULL,
  `bank_ifsc` VARCHAR(30) NULL,
  `bank_passbook_photo` VARCHAR(255) NULL,
  `settlements_json` LONGTEXT NULL COMMENT 'JSON history of payouts/settlements',
  `display_rank` INT NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`service_area_id`) REFERENCES `service_areas`(`id`) ON DELETE SET NULL,
  INDEX `idx_rest_status` (`status`, `is_active`),
  INDEX `idx_rest_coords` (`latitude`, `longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Food Categories (Global)
-- ------------------------------------------------------------------------------
CREATE TABLE `food_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `name_bn` VARCHAR(120) NOT NULL,
  `image_url` VARCHAR(255) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Restaurant Categories (Menu sections per restaurant)
-- ------------------------------------------------------------------------------
CREATE TABLE `restaurant_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `restaurant_id` INT NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `name_bn` VARCHAR(150) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE,
  INDEX `idx_rc_rest` (`restaurant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Foods (Dishes & Menu Items with In-Stock / Out-Of-Stock Indicators)
-- ------------------------------------------------------------------------------
CREATE TABLE `foods` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `restaurant_id` INT NOT NULL,
  `restaurant_category_id` INT NULL,
  `global_category_id` INT NULL,
  `category` VARCHAR(100) NOT NULL DEFAULT 'Main Course',
  `category_bn` VARCHAR(120) NOT NULL DEFAULT 'মূল খাবার',
  `name` VARCHAR(150) NOT NULL,
  `name_bn` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `description_bn` TEXT NULL,
  `price` DECIMAL(8,2) NOT NULL,
  `discount_price` DECIMAL(8,2) NULL,
  `photo_url` VARCHAR(255) NOT NULL,
  `is_veg` TINYINT(1) NOT NULL DEFAULT 0,
  `is_available` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = In Stock (Green dot), 0 = Out of Stock (Red dot)',
  `is_recommended` TINYINT(1) NOT NULL DEFAULT 0,
  `preparation_minutes` INT NOT NULL DEFAULT 20,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`restaurant_category_id`) REFERENCES `restaurant_categories`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`global_category_id`) REFERENCES `food_categories`(`id`) ON DELETE SET NULL,
  INDEX `idx_food_rest` (`restaurant_id`, `is_available`),
  INDEX `idx_food_veg` (`is_veg`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. Restaurant Operating Hours
-- ------------------------------------------------------------------------------
CREATE TABLE `restaurant_hours` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `restaurant_id` INT NOT NULL,
  `day_of_week` TINYINT NOT NULL COMMENT '0=Sun, 1=Mon, ..., 6=Sat',
  `open_time` TIME NOT NULL,
  `close_time` TIME NOT NULL,
  `is_closed` TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_rest_day` (`restaurant_id`, `day_of_week`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. Delivery Partners Table
-- ------------------------------------------------------------------------------
CREATE TABLE `delivery_partners` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `service_area_id` INT NULL,
  `name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(150) NULL,
  `address` TEXT NULL,
  `age` VARCHAR(10) NULL,
  `gender` VARCHAR(20) NULL,
  `passport_photo` VARCHAR(255) NULL,
  `profile_photo` VARCHAR(255) NULL,
  `aadhaar_number` VARCHAR(30) NULL,
  `aadhaar_photo` VARCHAR(255) NULL,
  `vehicle_type` ENUM('cycle', 'bike', 'scooter', 'toto', 'ev') NOT NULL DEFAULT 'bike',
  `vehicle_number` VARCHAR(40) NOT NULL,
  `vehicle_photo` VARCHAR(255) NULL,
  `driving_license_number` VARCHAR(60) NOT NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'blocked') NOT NULL DEFAULT 'approved',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_online` TINYINT(1) NOT NULL DEFAULT 0,
  `current_lat` DECIMAL(10, 8) NULL,
  `current_lng` DECIMAL(11, 8) NULL,
  `last_location_updated_at` TIMESTAMP NULL,
  `active_order_id` INT NULL,
  `total_deliveries` INT NOT NULL DEFAULT 0,
  `rating` DECIMAL(3,2) NOT NULL DEFAULT 4.80,
  `wallet_balance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` ENUM('upi', 'bank') NOT NULL DEFAULT 'upi',
  `upi_id` VARCHAR(100) NULL,
  `upi_qr_photo` VARCHAR(255) NULL,
  `bank_name` VARCHAR(150) NULL,
  `bank_account_no` VARCHAR(60) NULL,
  `bank_account_holder` VARCHAR(120) NULL,
  `bank_ifsc` VARCHAR(30) NULL,
  `bank_passbook_photo` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`service_area_id`) REFERENCES `service_areas`(`id`) ON DELETE SET NULL,
  INDEX `idx_dp_online` (`is_online`, `status`),
  INDEX `idx_dp_coords` (`current_lat`, `current_lng`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. Saved Addresses
-- ------------------------------------------------------------------------------
CREATE TABLE `addresses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `type` ENUM('home', 'work', 'other') NOT NULL DEFAULT 'home',
  `label` VARCHAR(60) NULL,
  `address_line` TEXT NOT NULL,
  `landmark` VARCHAR(150) NULL,
  `latitude` DECIMAL(10, 8) NOT NULL,
  `longitude` DECIMAL(11, 8) NOT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_addr_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 11. Orders Table (With Escrow, Self Delivery, Handover, and Disputes)
-- ------------------------------------------------------------------------------
CREATE TABLE `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_number` VARCHAR(40) UNIQUE NOT NULL,
  `customer_id` INT NOT NULL,
  `customer_name` VARCHAR(120) NOT NULL,
  `customer_phone` VARCHAR(20) NOT NULL,
  `restaurant_id` INT NOT NULL,
  `restaurant_name` VARCHAR(150) NOT NULL,
  `restaurant_phone` VARCHAR(20) NOT NULL,
  `restaurant_address` TEXT NOT NULL,
  `restaurant_lat` DECIMAL(10, 8) NOT NULL,
  `restaurant_lng` DECIMAL(11, 8) NOT NULL,
  `delivery_partner_id` INT NULL,
  `delivery_partner_name` VARCHAR(120) NULL,
  `delivery_partner_phone` VARCHAR(20) NULL,
  `delivery_partner_lat` DECIMAL(10, 8) NULL,
  `delivery_partner_lng` DECIMAL(11, 8) NULL,
  `service_area_id` INT NULL,
  `status` ENUM(
    'pending',
    'accepted',
    'preparing',
    'ready',
    'assigned',
    'picked_up',
    'on_the_way',
    'delivered',
    'cancelled'
  ) NOT NULL DEFAULT 'pending',
  `delivery_address` TEXT NOT NULL,
  `delivery_landmark` VARCHAR(150) NULL,
  `delivery_lat` DECIMAL(10, 8) NOT NULL,
  `delivery_lng` DECIMAL(11, 8) NOT NULL,
  `items_json` LONGTEXT NOT NULL COMMENT 'JSON array of ordered dishes and quantities',
  `distance_km` DECIMAL(6,2) NOT NULL DEFAULT 1.5,
  `is_self_delivery` TINYINT(1) NOT NULL DEFAULT 0,
  `delivery_mode` ENUM('self_delivery', 'platform_rider') NOT NULL DEFAULT 'platform_rider',
  `rider_requested` TINYINT(1) NOT NULL DEFAULT 0,
  `rider_requested_at` TIMESTAMP NULL,
  `rider_accepted` TINYINT(1) NOT NULL DEFAULT 0,
  `rider_accepted_at` TIMESTAMP NULL,
  `is_handed_over` TINYINT(1) NOT NULL DEFAULT 0,
  `handed_over_at` TIMESTAMP NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  `delivery_fee` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  `tax` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(10,2) NOT NULL,
  `payment_method` ENUM('cod', 'cashfree', 'razorpay', 'upi') NOT NULL DEFAULT 'cod',
  `payment_status` ENUM('pending', 'paid', 'failed', 'refunded', 'cod') NOT NULL DEFAULT 'cod',
  `preparation_minutes` INT NOT NULL DEFAULT 25,
  `estimated_delivery_time` TIMESTAMP NULL,
  `customer_notes` TEXT NULL,
  `cancellation_reason` TEXT NULL,
  `escrow_status` ENUM('holding', 'matured', 'settled', 'refunded', 'disputed') NOT NULL DEFAULT 'holding',
  `holding_until` TIMESTAMP NULL,
  `net_restaurant_amount` DECIMAL(10,2) NULL,
  `settled_at` TIMESTAMP NULL,
  `refunded_at` TIMESTAMP NULL,
  `refund_amount` DECIMAL(10,2) NULL,
  `refund_reason` TEXT NULL,
  `dispute_reason` TEXT NULL,
  `disputed_at` TIMESTAMP NULL,
  `placed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `accepted_at` TIMESTAMP NULL,
  `ready_at` TIMESTAMP NULL,
  `picked_up_at` TIMESTAMP NULL,
  `delivered_at` TIMESTAMP NULL,
  `cancelled_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`),
  FOREIGN KEY (`delivery_partner_id`) REFERENCES `delivery_partners`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`service_area_id`) REFERENCES `service_areas`(`id`) ON DELETE SET NULL,
  INDEX `idx_order_status` (`status`),
  INDEX `idx_order_customer` (`customer_id`),
  INDEX `idx_order_restaurant` (`restaurant_id`),
  INDEX `idx_order_partner` (`delivery_partner_id`),
  INDEX `idx_order_escrow` (`escrow_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 12. Order Items
-- ------------------------------------------------------------------------------
CREATE TABLE `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `food_id` INT NOT NULL,
  `food_name` VARCHAR(150) NOT NULL,
  `price` DECIMAL(8,2) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `total_price` DECIMAL(10,2) NOT NULL,
  `special_instructions` VARCHAR(255) NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`),
  INDEX `idx_oi_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 13. Payments Record
-- ------------------------------------------------------------------------------
CREATE TABLE `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `method` ENUM('cod', 'gateway_mock', 'cashfree', 'razorpay', 'upi') NOT NULL,
  `provider` VARCHAR(50) NOT NULL DEFAULT 'cod',
  `transaction_id` VARCHAR(100) NULL,
  `status` ENUM('pending', 'paid', 'failed', 'refunded', 'cod') NOT NULL DEFAULT 'pending',
  `metadata_json` LONGTEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  INDEX `idx_pay_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 14. Coupons & Platform Offers
-- ------------------------------------------------------------------------------
CREATE TABLE `coupons` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(30) UNIQUE NOT NULL,
  `description` VARCHAR(200) NOT NULL,
  `description_bn` VARCHAR(220) NOT NULL,
  `discount_type` ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
  `discount_value` DECIMAL(8,2) NOT NULL,
  `max_discount` DECIMAL(8,2) NULL,
  `min_order_amount` DECIMAL(8,2) NOT NULL DEFAULT 100.00,
  `usage_limit` INT NULL,
  `used_count` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `expires_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 15. Restaurant Promo Codes
-- ------------------------------------------------------------------------------
CREATE TABLE `restaurant_promocodes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `restaurant_id` INT NOT NULL,
  `code` VARCHAR(30) NOT NULL,
  `discount_percentage` DECIMAL(5,2) NOT NULL,
  `max_discount` DECIMAL(8,2) NULL,
  `min_order_amount` DECIMAL(8,2) NOT NULL DEFAULT 100.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_rest_code` (`restaurant_id`, `code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 16. Location Radius Ranking Rules (Admin Pin Radius Top 5 Restaurants)
-- ------------------------------------------------------------------------------
CREATE TABLE `location_rankings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `name_bn` VARCHAR(180) NOT NULL,
  `lat` DECIMAL(10, 8) NOT NULL,
  `lng` DECIMAL(11, 8) NOT NULL,
  `radius_km` DECIMAL(6,2) NOT NULL DEFAULT 2.50,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `rankings_json` LONGTEXT NOT NULL COMMENT 'JSON array of [{rank: 1, restaurant_id: 1, restaurant_name: "..."}]',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_loc_ranking_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 17. Wallets & Accounting
-- ------------------------------------------------------------------------------
CREATE TABLE `wallets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNIQUE NOT NULL,
  `role` ENUM('restaurant', 'delivery') NOT NULL,
  `balance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_earned` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_withdrawn` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wallet_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `wallet_id` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `type` ENUM('credit', 'debit') NOT NULL,
  `reference_type` ENUM('order_earning', 'delivery_fee', 'commission_deduction', 'cash_collected', 'payout') NOT NULL,
  `reference_id` INT NULL,
  `description` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE CASCADE,
  INDEX `idx_wt_wallet` (`wallet_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 18. Payout Requests
-- ------------------------------------------------------------------------------
CREATE TABLE `payout_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `role` ENUM('restaurant', 'delivery') NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `method` ENUM('upi', 'bank') NOT NULL,
  `upi_id` VARCHAR(100) NULL,
  `bank_account_no` VARCHAR(60) NULL,
  `bank_ifsc` VARCHAR(30) NULL,
  `bank_name` VARCHAR(150) NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
  `transaction_id` VARCHAR(100) NULL,
  `admin_remarks` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_payout_user` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 19. In-App Notifications
-- ------------------------------------------------------------------------------
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `role` ENUM('customer', 'restaurant', 'delivery', 'admin') NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `title_bn` VARCHAR(180) NOT NULL,
  `message` TEXT NOT NULL,
  `message_bn` TEXT NOT NULL,
  `type` VARCHAR(50) NOT NULL DEFAULT 'order_update',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `data_json` LONGTEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_notif_user` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 20. Platform Settings (Dynamic commission, per-km, COD)
-- ------------------------------------------------------------------------------
CREATE TABLE `platform_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(80) UNIQUE NOT NULL,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255) NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 21. App Promotions / Carousel Banners
-- ------------------------------------------------------------------------------
CREATE TABLE `promotions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(150) NOT NULL,
  `title_bn` VARCHAR(180) NOT NULL,
  `subtitle` VARCHAR(200) NULL,
  `subtitle_bn` VARCHAR(220) NULL,
  `code` VARCHAR(40) NULL,
  `discount_text` VARCHAR(100) NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `badge` VARCHAR(50) NULL,
  `badge_bn` VARCHAR(60) NULL,
  `bg_gradient` VARCHAR(100) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- INITIAL SEED DATA
-- Default Passwords: 'password123' / 'admin123' (bcrypt hashed)
-- ==============================================================================

-- 1. Users
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password_hash`, `role`, `profile_photo`, `language`, `is_active`) VALUES
(1, 'AharLocal Operations', 'admin@aharlocal.com', '+919800000001', '$2y$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m', 'admin', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'bn', 1),
(2, 'Subrata Ghosh', 'kolkatabiryani@aharlocal.com', '+919800000002', '$2y$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m', 'restaurant', 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150', 'bn', 1),
(3, 'Debabrata Modak', 'maatarasweets@aharlocal.com', '+919800000003', '$2y$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m', 'restaurant', 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=150', 'bn', 1),
(4, 'Soma Mukherjee', 'banglarrannaghor@aharlocal.com', '+919800000004', '$2y$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m', 'restaurant', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'bn', 1),
(5, 'Rahul Sen', 'rahul.delivery@aharlocal.com', '+919800000005', '$2y$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m', 'delivery', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'bn', 1),
(6, 'Subhash Roy', 'subhash.delivery@aharlocal.com', '+919800000006', '$2y$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m', 'delivery', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'bn', 1),
(7, 'Bikram Das', 'customer@aharlocal.com', '+919800000007', '$2y$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m', 'customer', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'bn', 1),
(8, 'Tanmoy Nandi', 'newrest@aharlocal.com', '+919800000008', '$2y$10$yN11o6y5RzT45jK5Y8aBquM29Fp/wD7c8mB1X6bFf.G5c87A4F.5m', 'restaurant', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'bn', 1);

-- 2. Service Areas with connected polygon boundary shape
INSERT INTO `service_areas` (`id`, `name`, `name_bn`, `min_delivery_charge`, `per_km_charge`, `is_active`, `polygon_json`) VALUES
(1, 'Central & South Kolkata Service Zone', 'সেন্ট্রাল ও সাউথ কলকাতা সার্ভিস এরিয়া', 25.00, 8.00, 1, '[{"lat":22.5850,"lng":88.3300},{"lat":22.5850,"lng":88.3850},{"lat":22.5100,"lng":88.3900},{"lat":22.5050,"lng":88.3350},{"lat":22.5400,"lng":88.3200}]'),
(2, 'Salt Lake & New Town Delivery Zone', 'সল্টলেক ও নিউ টাউন ডেলিভারি এরিয়া', 30.00, 9.00, 1, '[{"lat":22.6000,"lng":88.4000},{"lat":22.6000,"lng":88.4700},{"lat":22.5400,"lng":88.4750},{"lat":22.5400,"lng":88.4050}]');

-- 3. Restaurants
INSERT INTO `restaurants` (`id`, `user_id`, `service_area_id`, `name`, `name_bn`, `owner_name`, `phone`, `email`, `address`, `latitude`, `longitude`, `photo_url`, `banner_url`, `fssai_license`, `commission_rate`, `min_order_amount`, `avg_delivery_minutes`, `rating`, `rating_count`, `is_open`, `is_pure_veg`, `status`, `cuisine_types_json`, `upi_id`, `bank_name`, `bank_account_no`, `bank_account_holder`, `bank_ifsc`) VALUES
(1, 2, 1, 'Kolkata Royal Biryani House', 'কলকাতা রয়্যাল বিরিয়ানি হাউস', 'Subrata Ghosh', '+919800000002', 'kolkatabiryani@aharlocal.com', '42/A Park Circus Crossing, Kolkata 700017', 22.5429, 88.3653, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600', 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=1200', 'FSSAI-12821019000123', 15.00, 99.00, 25, 4.8, 420, 1, 0, 'approved', '["Biryani", "Mughlai", "North Indian"]', 'kolkatabiryani@okhdfcbank', 'State Bank of India', '38291048291', 'Subrata Ghosh', 'SBIN0001234'),
(2, 3, 1, 'Maa Tara Mishtanna Bhandar', 'মা তারা মিষ্টান্ন ভাণ্ডার', 'Debabrata Modak', '+919800000003', 'maatarasweets@aharlocal.com', '18 Kalighat Temple Road, Kolkata 700026', 22.5204, 88.3448, 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600', 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=1200', 'FSSAI-12821019000456', 12.00, 50.00, 20, 4.9, 850, 1, 1, 'approved', '["Bengali Sweets", "Mishti Doi", "Snacks"]', 'maatarasweets@icici', 'Punjab National Bank', '44910284719', 'Debabrata Modak', 'PUNB0124500'),
(3, 4, 1, 'Banglar Rannaghor & Thali', 'বাংলার রান্নাঘর ও থালি', 'Soma Mukherjee', '+919800000004', 'banglarrannaghor@aharlocal.com', '78 Gariahat Road, Kolkata 700019', 22.5186, 88.3664, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=1200', 'FSSAI-12821019000789', 14.00, 80.00, 30, 4.6, 310, 1, 0, 'approved', '["Traditional Bengali", "Fish Thali", "Rice"]', 'banglarrannaghor@axisbank', 'Axis Bank', '9120200481928', 'Soma Mukherjee', 'UTIB0000451'),
(4, 8, 1, 'Hindusthan Roll Corner', 'হিন্দুস্থান রোল কর্নার', 'Tanmoy Nandi', '+919800000008', 'newrest@aharlocal.com', '12 Shyambazar 5-Point Crossing', 22.6001, 88.3712, 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=600', 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1200', 'FSSAI-12821019000999', 15.00, 60.00, 20, 4.2, 45, 1, 0, 'pending', '["Rolls", "Fast Food"]', 'hindusthanroll@paytm', 'HDFC Bank', '5010048192841', 'Tanmoy Nandi', 'HDFC0001289');

-- 4. Food Categories
INSERT INTO `food_categories` (`id`, `name`, `name_bn`, `image_url`, `sort_order`) VALUES
(1, 'Biryani & Kebabs', 'বিরিয়ানি ও কাবাব', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200', 1),
(2, 'Bengali Sweets & Mishti', 'মিষ্টি ও দই', 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=200', 2),
(3, 'Traditional Thali', 'বাঙালী থালি ও ভাত', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=200', 3),
(4, 'Rolls & Fast Food', 'কাঠি রোল ও ফাস্ট ফুড', 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=200', 4),
(5, 'Fish & Mutton Curries', 'মাছ ও খাসির মাংস', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200', 5),
(6, 'Evening Snacks & Tea', 'সন্ধ্যার স্ন্যাক্স ও চা', 'https://images.unsplash.com/photo-1601050690187-8e6d2bc4a5b4?w=200', 6);

-- 5. Foods (with in-stock is_available=1 [green dot] and out-of-stock [red dot])
INSERT INTO `foods` (`id`, `restaurant_id`, `category`, `category_bn`, `name`, `name_bn`, `description`, `description_bn`, `price`, `discount_price`, `photo_url`, `is_veg`, `is_available`, `is_recommended`, `preparation_minutes`) VALUES
(1, 1, 'Biryani & Kebabs', 'বিরিয়ানি ও কাবাব', 'Kolkata Special Chicken Biryani', 'কলকাতা স্পেশাল চিকেন বিরিয়ানি', 'Fragrant basmati rice served with tender chicken piece, golden potato (alu), and egg.', 'সুগন্ধি বাসমতী চাল, নরম চিকেন, মশলাদার আলু এবং ডিম সহযোগে খাঁটি কলকাতার বিরিয়ানি।', 180.00, 160.00, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500', 0, 1, 1, 15),
(2, 1, 'Biryani & Kebabs', 'বিরিয়ানি ও কাবাব', 'Kolkata Royal Mutton Biryani', 'কলকাতা রয়্যাল মাটন বিরিয়ানি', 'Slow-cooked aged mutton with melt-in-mouth potato and basmati rice infused with saffron.', 'সুস্বাদু মাটন পিস, সুগন্ধি চাল ও জাফরান গন্ধযুক্ত সেরা স্বাদের মাটন বিরিয়ানি।', 260.00, 240.00, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500', 0, 1, 1, 20),
(3, 1, 'Biryani & Kebabs', 'বিরিয়ানি ও কাবাব', 'Shahi Chicken Chaap', 'শাহী চিকেন চাপ', 'Rich and aromatic slow-cooked chicken gravy with cashew and poppy paste.', 'পোস্ত ও কাজুবাদাম বাটা দিয়ে তৈরি সুস্বাদু ও ঘন চিকেন চাপ।', 140.00, NULL, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500', 0, 1, 1, 15),
(4, 2, 'Bengali Sweets & Mishti', 'মিষ্টি ও দই', 'Baked Rosogolla (2 Pcs)', 'বেকড রসগোল্লা (২ পিস)', 'Warm caramelised cottage cheese dumplings baked in thick rabri.', 'ঘন রাবড়িতে বেক করা নরম তুলতুলে সুস্বাদু বেকড রসগোল্লা।', 60.00, 50.00, 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500', 1, 1, 1, 5),
(5, 2, 'Bengali Sweets & Mishti', 'মিষ্টি ও দই', 'Kolkata Special Mishti Doi (Cup)', 'কলকাতার স্পেশাল মিষ্টি দই', 'Traditional earthen pot sweetened curd with rich creamy texture.', 'খাঁটি মাটির ভাঁড়ে পাতা ঘন ও খাঁটি মিষ্টি দই।', 55.00, NULL, 'https://images.unsplash.com/photo-1571217664816-953e98f0fa3b?w=500', 1, 1, 1, 2),
(6, 2, 'Evening Snacks & Tea', 'সন্ধ্যার স্ন্যাক্স ও চা', 'Hing Kochuri with Chholar Dal (4 Pcs)', 'হিঙের কচুরি ও ছোলার ডাল', 'Crispy asafoetida kachori served with sweet-spicy coconut chholar dal.', 'গরম মুচমুচে হিঙের কচুরি এবং নারকেল কুচি দেওয়া সুস্বাদু ছোলার ডাল।', 40.00, NULL, 'https://images.unsplash.com/photo-1601050690187-8e6d2bc4a5b4?w=500', 1, 1, 1, 10),
(7, 3, 'Traditional Thali', 'বাঙালী থালি ও ভাত', 'Sholoana Bangali Veg Thali', 'ষোলোআনা বাঙালী নিরামিষ থালি', 'Steamed rice, Jhuri alubhaja, Sukto, Sonamug dal, Dhokar dalna, Chutney & Papad.', 'ভাত, ঝুরি আলুভাজা, শুক্তো, সোনামুগ ডাল, ধোঁকার ডালনা, চাটনি ও পাঁপড়।', 140.00, 125.00, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500', 1, 1, 1, 15),
(8, 3, 'Fish & Mutton Curries', 'মাছ ও খাসির মাংস', 'Bhetki Macher Paturi', 'ভেটকি মাছের পাতুরি', 'Boneless bhetki fish fillet marinated in mustard-coconut paste wrapped in banana leaf.', 'কলাপাতা মোড়া সর্ষে-নারকেল বাটায় খাঁটি ভেটকি মাছের পাতুরি।', 190.00, NULL, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500', 0, 1, 1, 20);

-- 6. Delivery Partners
INSERT INTO `delivery_partners` (`id`, `user_id`, `service_area_id`, `name`, `phone`, `email`, `vehicle_type`, `vehicle_number`, `driving_license_number`, `status`, `is_online`, `current_lat`, `current_lng`, `last_location_updated_at`, `total_deliveries`, `rating`, `wallet_balance`, `upi_id`, `bank_name`, `bank_account_no`, `bank_account_holder`, `bank_ifsc`) VALUES
(1, 5, 1, 'Rahul Sen', '+919800000005', 'rahul.delivery@aharlocal.com', 'bike', 'WB-01-BK-4589', 'DL-WB-2022-00918', 'approved', 1, 22.5401, 88.3610, NOW(), 348, 4.85, 840.00, 'rahulsen@upi', 'State Bank of India', '39102948192', 'Rahul Sen', 'SBIN0002145'),
(2, 6, 1, 'Subhash Roy', '+919800000006', 'subhash.delivery@aharlocal.com', 'scooter', 'WB-02-SC-8812', 'DL-WB-2021-00445', 'approved', 1, 22.5220, 88.3490, NOW(), 215, 4.90, 620.00, 'subhashroy@okhdfcbank', 'Punjab National Bank', '48192049182', 'Subhash Roy', 'PUNB0182900');

-- 7. Coupons
INSERT INTO `coupons` (`id`, `code`, `description`, `description_bn`, `discount_type`, `discount_value`, `max_discount`, `min_order_amount`, `is_active`) VALUES
(1, 'PROTHOM50', 'Get 50% OFF up to ₹100 on your first food order', 'প্রথম অর্ডারে ৫০% ছাড় (সর্বোচ্চ ১০০ টাকা)', 'percentage', 50.00, 100.00, 150.00, 1),
(2, 'AHARLOCAL', 'Flat ₹40 OFF on local favorite meals above ₹199', '১৯৯ টাকার ওপর অর্ডারে সোজা ৪০ টাকা ছাড়', 'fixed', 40.00, 40.00, 199.00, 1),
(3, 'ANANDA20', '20% OFF on all Bengali sweet and snacks orders', 'মিষ্টি ও স্ন্যাক্স অর্ডারে ২০% ছাড়', 'percentage', 20.00, 60.00, 100.00, 1);

-- 8. Location Radius Ranking Rules (for Top 5 restaurant ranking inside specific radius)
INSERT INTO `location_rankings` (`id`, `name`, `name_bn`, `lat`, `lng`, `radius_km`, `is_active`, `rankings_json`) VALUES
(1, 'Park Circus & Ballygunge Food Hub', 'পার্ক সার্কাস ও বালিগঞ্জ ফুড হাব', 22.5350, 88.3650, 3.50, 1, '[{"rank":1,"restaurant_id":1,"restaurant_name":"Kolkata Royal Biryani House"},{"rank":2,"restaurant_id":2,"restaurant_name":"Maa Tara Mishtanna Bhandar"},{"rank":3,"restaurant_id":3,"restaurant_name":"Banglar Rannaghor & Thali"}]');

-- 9. Platform Settings
INSERT INTO `platform_settings` (`setting_key`, `setting_value`, `description`) VALUES
('global_cod_enabled', '1', 'Global Cash on Delivery toggle (1 = enabled, 0 = disabled)'),
('restaurant_commission_percent', '15.0', 'Default platform commission on restaurant food subtotal'),
('delivery_partner_commission_percent', '10.0', 'Platform cut on delivery charge'),
('delivery_base_fare', '25.0', 'Base delivery fee charged up to base distance'),
('delivery_base_distance_km', '2.0', 'Base distance included in base fare in kilometers'),
('delivery_per_km_rate', '10.0', 'Additional fee per kilometer beyond base distance'),
('min_delivery_fare', '20.0', 'Minimum floor for delivery charge');

-- 10. Sample Orders
INSERT INTO `orders` (`id`, `order_number`, `customer_id`, `customer_name`, `customer_phone`, `restaurant_id`, `restaurant_name`, `restaurant_phone`, `restaurant_address`, `restaurant_lat`, `restaurant_lng`, `delivery_partner_id`, `delivery_partner_name`, `delivery_partner_phone`, `delivery_partner_lat`, `delivery_partner_lng`, `service_area_id`, `status`, `delivery_address`, `delivery_landmark`, `delivery_lat`, `delivery_lng`, `items_json`, `distance_km`, `is_self_delivery`, `delivery_mode`, `subtotal`, `delivery_fee`, `discount`, `tax`, `grand_total`, `payment_method`, `payment_status`, `preparation_minutes`, `estimated_delivery_time`, `customer_notes`, `placed_at`, `accepted_at`) VALUES
(1, 'ORD-2026-8801', 7, 'Bikram Das', '+919800000007', 1, 'Kolkata Royal Biryani House', '+919800000002', '42/A Park Circus Crossing, Kolkata 700017', 22.5429, 88.3653, 1, 'Rahul Sen', '+919800000005', 22.5401, 88.3610, 1, 'on_the_way', 'Flat 3B, Sunshine Heights, 14 Ballygunge Circular Road, Kolkata 700019', 'Near Ballygunge Post Office', 22.5292, 88.3612, '[{"food_id":1,"food_name":"Kolkata Special Chicken Biryani","price":160,"quantity":1,"total_price":160},{"food_id":3,"food_name":"Shahi Chicken Chaap","price":140,"quantity":1,"total_price":140}]', 2.1, 0, 'platform_rider', 300.00, 25.00, 40.00, 15.00, 300.00, 'cod', 'cod', 20, DATE_ADD(NOW(), INTERVAL 15 MINUTE), 'Please deliver with extra salad and spoons', DATE_SUB(NOW(), INTERVAL 25 MINUTE), DATE_SUB(NOW(), INTERVAL 20 MINUTE));

-- 11. Wallets
INSERT INTO `wallets` (`id`, `user_id`, `role`, `balance`, `total_earned`, `total_withdrawn`) VALUES
(1, 2, 'restaurant', 4500.00, 12400.00, 7900.00),
(2, 5, 'delivery', 840.00, 3200.00, 2360.00);
