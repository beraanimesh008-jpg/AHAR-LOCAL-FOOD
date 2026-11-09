-- ==============================================================================
-- AharLocal (আহার Local) - Hostinger MySQL Production Database Schema
-- Target Database: u691798054_aharlocal_db
-- Target User:     u691798054_aharlocal_user
-- Host:            localhost (Hostinger Shared Hosting)
-- Charset:         utf8mb4 (Full Bengali and Emoji Unicode support)
-- Engine:          InnoDB (ACID transactions, foreign keys & row-level locking)
-- Total Tables:    22 Tables (Production-Safe, No Demo Seeds, Re-executable)
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. Users Table (Customers, Restaurant Owners, Delivery Partners, Admins)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
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
-- 2. Service Areas Table (Hyperlocal Geofence Polygon Boundary)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `service_areas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `name_bn` VARCHAR(150) NOT NULL,
  `min_delivery_charge` DECIMAL(8,2) NULL COMMENT 'Base delivery fee (explicitly configured)',
  `per_km_charge` DECIMAL(8,2) NULL COMMENT 'Per kilometer delivery rate (explicitly configured)',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `polygon_json` LONGTEXT NULL COMMENT 'Array of {lat, lng} vertices defining polygon',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_sa_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Service Area Points (Normalized polygon coordinates for GIS queries)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `service_area_points` (
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
CREATE TABLE IF NOT EXISTS `restaurants` (
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
  `commission_rate` DECIMAL(5,2) NULL COMMENT 'Platform commission percentage (explicitly configured)',
  `min_order_amount` DECIMAL(8,2) NULL COMMENT 'Minimum order amount floor (explicitly configured)',
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
  `display_rank` INT NULL DEFAULT NULL,
  `settlements_json` LONGTEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`service_area_id`) REFERENCES `service_areas`(`id`) ON DELETE SET NULL,
  INDEX `idx_rest_user` (`user_id`),
  INDEX `idx_rest_area` (`service_area_id`),
  INDEX `idx_rest_status` (`status`),
  INDEX `idx_rest_open` (`is_open`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Food Categories (Global System Categories)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `food_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `name_bn` VARCHAR(150) NOT NULL,
  `image_url` VARCHAR(255) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_fcat_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Restaurant Categories (Per-restaurant menu categories)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `restaurant_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `restaurant_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `name_bn` VARCHAR(150) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE,
  INDEX `idx_rcat_rest` (`restaurant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Foods Table (Menu items with In-Stock / Out-of-Stock Live Toggle)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `foods` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `restaurant_id` INT NOT NULL,
  `restaurant_category_id` INT NULL,
  `global_category_id` INT NULL,
  `category` VARCHAR(100) NOT NULL,
  `category_bn` VARCHAR(150) NOT NULL,
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
  INDEX `idx_food_rest` (`restaurant_id`),
  INDEX `idx_food_avail` (`is_available`),
  INDEX `idx_food_veg` (`is_veg`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. Restaurant Business Hours
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `restaurant_hours` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `restaurant_id` INT NOT NULL,
  `day_of_week` TINYINT NOT NULL COMMENT '0=Sunday, 1=Monday, ..., 6=Saturday',
  `open_time` TIME NOT NULL DEFAULT '09:00:00',
  `close_time` TIME NOT NULL DEFAULT '22:00:00',
  `is_closed` TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_rest_day` (`restaurant_id`, `day_of_week`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. Delivery Partners (Riders)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `delivery_partners` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `service_area_id` INT NULL,
  `name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `vehicle_type` ENUM('bike', 'scooter', 'cycle') NOT NULL DEFAULT 'bike',
  `vehicle_number` VARCHAR(30) NOT NULL,
  `driving_license_number` VARCHAR(50) NOT NULL,
  `document_photo` VARCHAR(255) NULL,
  `driving_license_photo` VARCHAR(255) NULL,
  `aadhaar_photo` VARCHAR(255) NULL,
  `pan_photo` VARCHAR(255) NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'blocked') NOT NULL DEFAULT 'approved',
  `rejection_reason` TEXT NULL,
  `is_online` TINYINT(1) NOT NULL DEFAULT 0,
  `current_lat` DECIMAL(10, 8) NULL,
  `current_lng` DECIMAL(11, 8) NULL,
  `last_location_updated_at` TIMESTAMP NULL,
  `total_deliveries` INT NOT NULL DEFAULT 0,
  `rating` DECIMAL(3,2) NOT NULL DEFAULT 5.00,
  `wallet_balance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` ENUM('upi', 'bank') NOT NULL DEFAULT 'upi',
  `upi_id` VARCHAR(100) NULL,
  `upi_qr_photo` VARCHAR(255) NULL,
  `bank_name` VARCHAR(150) NULL,
  `bank_account_no` VARCHAR(60) NULL,
  `bank_account_holder` VARCHAR(120) NULL,
  `bank_ifsc` VARCHAR(30) NULL,
  `bank_passbook_photo` VARCHAR(255) NULL,
  `settlements_json` LONGTEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`service_area_id`) REFERENCES `service_areas`(`id`) ON DELETE SET NULL,
  INDEX `idx_dp_user` (`user_id`),
  INDEX `idx_dp_status` (`status`),
  INDEX `idx_dp_online` (`is_online`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. Saved Addresses (Customer delivery addresses)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `addresses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `type` ENUM('home', 'work', 'other') NOT NULL DEFAULT 'home',
  `label` VARCHAR(50) NULL,
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
-- 11. Orders Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_number` VARCHAR(50) UNIQUE NOT NULL,
  `customer_id` INT NOT NULL,
  `customer_name` VARCHAR(120) NOT NULL,
  `customer_phone` VARCHAR(20) NOT NULL,
  `restaurant_id` INT NOT NULL,
  `restaurant_name` VARCHAR(150) NOT NULL,
  `restaurant_phone` VARCHAR(20) NULL,
  `restaurant_address` TEXT NULL,
  `restaurant_lat` DECIMAL(10, 8) NULL,
  `restaurant_lng` DECIMAL(11, 8) NULL,
  `delivery_partner_id` INT NULL,
  `delivery_partner_name` VARCHAR(120) NULL,
  `delivery_partner_phone` VARCHAR(20) NULL,
  `delivery_partner_lat` DECIMAL(10, 8) NULL,
  `delivery_partner_lng` DECIMAL(11, 8) NULL,
  `service_area_id` INT NULL,
  `status` ENUM('placed', 'confirmed', 'preparing', 'ready_for_pickup', 'on_the_way', 'delivered', 'cancelled', 'rejected') NOT NULL DEFAULT 'placed',
  `cancel_reason` TEXT NULL,
  `delivery_address` TEXT NOT NULL,
  `delivery_landmark` VARCHAR(150) NULL,
  `delivery_lat` DECIMAL(10, 8) NOT NULL,
  `delivery_lng` DECIMAL(11, 8) NOT NULL,
  `items_json` LONGTEXT NOT NULL COMMENT 'JSON array of ordered items',
  `distance_km` DECIMAL(6, 2) NOT NULL DEFAULT 1.00,
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
  `payment_method` ENUM('cod', 'online', 'wallet') NOT NULL DEFAULT 'cod',
  `payment_status` ENUM('pending', 'paid', 'failed', 'refunded', 'cod') NOT NULL DEFAULT 'cod',
  `escrow_status` ENUM('holding', 'matured', 'settled', 'refunded', 'disputed') NOT NULL DEFAULT 'holding',
  `holding_until` TIMESTAMP NULL,
  `net_restaurant_amount` DECIMAL(10,2) NULL,
  `restaurant_commission_percent` DECIMAL(5,2) NULL,
  `delivery_partner_commission_percent` DECIMAL(5,2) NULL,
  `preparation_minutes` INT NOT NULL DEFAULT 20,
  `estimated_delivery_time` TIMESTAMP NULL,
  `customer_notes` TEXT NULL,
  `placed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `accepted_at` TIMESTAMP NULL,
  `ready_at` TIMESTAMP NULL,
  `picked_up_at` TIMESTAMP NULL,
  `delivered_at` TIMESTAMP NULL,
  `cancelled_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`delivery_partner_id`) REFERENCES `delivery_partners`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`service_area_id`) REFERENCES `service_areas`(`id`) ON DELETE SET NULL,
  INDEX `idx_order_num` (`order_number`),
  INDEX `idx_order_cust` (`customer_id`),
  INDEX `idx_order_rest` (`restaurant_id`),
  INDEX `idx_order_rider` (`delivery_partner_id`),
  INDEX `idx_order_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 12. Order Items (Normalized relational line items)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `food_id` INT NULL,
  `food_name` VARCHAR(150) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(8,2) NOT NULL,
  `total_price` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON DELETE SET NULL,
  INDEX `idx_oi_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 13. Payments Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `payment_method` ENUM('cod', 'online', 'wallet', 'upi') NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `status` ENUM('initiated', 'successful', 'failed', 'refunded') NOT NULL DEFAULT 'initiated',
  `transaction_id` VARCHAR(100) NULL,
  `gateway` VARCHAR(50) NULL,
  `raw_response` LONGTEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_pay_order` (`order_id`),
  INDEX `idx_pay_tx` (`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 14. Coupons (Global Discount Promo Codes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `coupons` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) UNIQUE NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `description_bn` VARCHAR(255) NOT NULL,
  `discount_type` ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
  `discount_value` DECIMAL(8,2) NOT NULL,
  `max_discount` DECIMAL(8,2) NULL,
  `min_order_amount` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `valid_from` TIMESTAMP NULL,
  `valid_until` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_coupon_code` (`code`),
  INDEX `idx_coupon_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 15. Restaurant Promocodes (Restaurant-specific discounts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `restaurant_promocodes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `restaurant_id` INT NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `discount_type` ENUM('percentage', 'fixed') NOT NULL,
  `discount_value` DECIMAL(8,2) NOT NULL,
  `max_discount` DECIMAL(8,2) NULL,
  `min_order_amount` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_rest_code` (`restaurant_id`, `code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 16. Location Radius Rankings (Admin top 5 ranking per geofence radius)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `location_rankings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `name_bn` VARCHAR(180) NOT NULL,
  `lat` DECIMAL(10, 8) NOT NULL,
  `lng` DECIMAL(11, 8) NOT NULL,
  `radius_km` DECIMAL(6, 2) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `rankings_json` LONGTEXT NOT NULL COMMENT 'JSON array of [{rank, restaurant_id, restaurant_name}]',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_lr_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 17. Wallets Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `wallets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNIQUE NOT NULL,
  `role` ENUM('customer', 'restaurant', 'delivery') NOT NULL,
  `balance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_earned` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_withdrawn` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_wallet_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 18. Wallet Transactions (Ledger Entries)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `wallet_id` INT NOT NULL,
  `type` ENUM('credit', 'debit') NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `balance_after` DECIMAL(10,2) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `reference_id` VARCHAR(100) NULL COMMENT 'Order ID, Payout ID or Payment Ref',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE RESTRICT,
  INDEX `idx_wtx_wallet` (`wallet_id`),
  INDEX `idx_wtx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 19. Payout Requests (Restaurant and Delivery Partner Withdrawals)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payout_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `role` ENUM('restaurant', 'delivery') NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `method` ENUM('upi', 'bank') NOT NULL DEFAULT 'upi',
  `upi_id` VARCHAR(100) NULL,
  `bank_name` VARCHAR(150) NULL,
  `bank_account_no` VARCHAR(60) NULL,
  `bank_ifsc` VARCHAR(30) NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
  `transaction_id` VARCHAR(100) NULL,
  `admin_remarks` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_payout_user` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 20. Notifications Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
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
-- 21. Platform Settings (Dynamic commission, per-km fare, COD toggle)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `platform_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(80) UNIQUE NOT NULL,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255) NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 22. Promotions Table (App Promotional Banners & Carousel)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `promotions` (
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
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_promo_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- DEFAULT SYSTEM METADATA (NON-DESTRUCTIVE - NO DEMO USER SEEDS)
-- NOTE: Platform commission rates and delivery fares are NOT automatically inserted.
-- Operational rates must be configured explicitly by the administrator.
-- ==============================================================================


-- Default Food Categories (Essential system metadata, no fake users)
INSERT IGNORE INTO `food_categories` (`id`, `name`, `name_bn`, `image_url`, `sort_order`) VALUES
(1, 'Biryani & Kebabs', 'বিরিয়ানি ও কাবাব', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200', 1),
(2, 'Bengali Sweets & Mishti', 'মিষ্টি ও দই', 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=200', 2),
(3, 'Traditional Thali', 'বাঙালী থালি ও ভাত', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=200', 3),
(4, 'Rolls & Fast Food', 'কাঠি রোল ও ফাস্ট ফুড', 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=200', 4),
(5, 'Fish & Mutton Curries', 'মাছ ও খাসির মাংস', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200', 5),
(6, 'Evening Snacks & Tea', 'সন্ধ্যার স্ন্যাক্স ও চা', 'https://images.unsplash.com/photo-1601050690187-8e6d2bc4a5b4?w=200', 6);

-- Restore Foreign Key Checks
SET FOREIGN_KEY_CHECKS = 1;
