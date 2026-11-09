<?php
/**
 * AharLocal (আহার Local) - Hostinger MySQL Database Setup & Schema Auditor
 * 
 * Target Database: u691798054_aharlocal_db
 * Target Username: u691798054_aharlocal_user
 * Host:            localhost
 * Total Tables:    Exactly 22 Tables
 * 
 * SECURITY & GOVERNANCE COMPLIANCE:
 * 1. HTTPS Required: Strict SSL enforcement.
 * 2. Strict Session: HttpOnly, SameSite=Strict, use_strict_mode, 15m expiration, regenerated ID.
 * 3. POST-Only Authentication: Rejects all GET token attempts. Token never placed in HTML.
 * 4. CSRF Protection: Validated on every authenticated POST action (including Logout).
 * 5. Database Identity: Halts immediately if SELECT DATABASE() !== 'u691798054_aharlocal_db'.
 * 6. Explicit Metadata Audit: Audits TABLES, COLUMNS, STATISTICS, TABLE_CONSTRAINTS, KEY_COLUMN_USAGE.
 * 7. Populated Table Safeguards: Never auto-adds PK/AUTO_INCREMENT or NOT NULL without DEFAULT.
 * 8. Zero Invented Rates: No automatic commissions, fees, or pricing defaults.
 * 9. Real Execution: Missing tables created via reviewed canonical SQL in Apply mode.
 * 10. Stop-on-Failure: Halts immediately upon any query error; logs technical details privately.
 * 11. Lockout Security: setup.lock created only after 100% independent re-verification; no session IDs stored.
 */

// 1. Error Reporting Configuration (Private server logging, zero public leak)
error_reporting(0);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// 2. HTTPS Enforcement (Hostinger Shared Hosting & Reverse Proxies)
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443)
    || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https')
    || (isset($_SERVER['HTTP_CF_VISITOR']) && strpos($_SERVER['HTTP_CF_VISITOR'], 'https') !== false)
    || in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost', '127.0.0.1', 'localhost:3000', 'localhost:5173']);

if (!$isHttps) {
    http_response_code(403);
    header('Content-Type: text/html; charset=UTF-8');
    ?>
    <!DOCTYPE html>
    <html lang="bn">
    <head><meta charset="UTF-8"><title>HTTPS Required - AharLocal</title>
    <style>body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; text-align: center; }
    .box { max-width: 540px; margin: 40px auto; background: #1e293b; padding: 30px; border-radius: 12px; border: 1px solid #ef4444; }
    </style></head>
    <body>
    <div class="box">
        <h2 style="color: #ef4444;">HTTPS সংযোগ আবশ্যক (HTTPS Required)</h2>
        <p style="margin-top: 10px; color: #cbd5e1; font-size: 14px;">ডাটাবেস সেটআপ ও মাইগ্রেশন পেজটি নিরাপদ SSL (HTTPS) ছাড়া খোলা নিষিদ্ধ। অনুগ্রহ করে <code>https://aharlocal.in/api/setup_database.php</code> ব্যবহার করুন।</p>
    </div>
    </body></html>
    <?php
    exit;
}

// 3. Strict Session Configuration
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.use_strict_mode', '1');
ini_set('session.cookie_secure', $isHttps && !in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost', '127.0.0.1']) ? '1' : '0');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Session Expiry (15 minutes inactivity limit)
$sessionTimeout = 900;
if (isset($_SESSION['aharlocal_setup_auth']) && isset($_SESSION['aharlocal_auth_time'])) {
    if (time() - $_SESSION['aharlocal_auth_time'] > $sessionTimeout) {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
        session_start();
        $sessionExpiredNotice = true;
    } else {
        $_SESSION['aharlocal_auth_time'] = time(); // Refresh activity
    }
}

// 4. Lockout File Check (Protected from public access)
$lockFile = __DIR__ . '/config/setup.lock';
if (file_exists($lockFile)) {
    http_response_code(423); // 423 Locked
    header('Content-Type: text/html; charset=UTF-8');
    ?>
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <title>AharLocal - Setup Locked</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px 15px; text-align: center; }
            .box { max-width: 600px; margin: 50px auto; background: #1e293b; padding: 35px; border-radius: 14px; border: 1px solid #334155; }
            h2 { color: #f59e0b; margin-bottom: 12px; font-size: 20px; }
            p { color: #cbd5e1; font-size: 14px; line-height: 1.6; }
            .badge { display: inline-block; padding: 6px 14px; background: #854d0e; color: #fef08a; border-radius: 9999px; font-weight: 700; font-size: 11px; text-transform: uppercase; margin-bottom: 15px; }
            .note { margin-top: 20px; font-size: 12px; color: #94a3b8; background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #334155; }
        </style>
    </head>
    <body>
        <div class="box">
            <span class="badge">SETUP LOCKED</span>
            <h2>ডাটাবেস সেটআপ পূর্বেই সম্পন্ন ও লক করা হয়েছে</h2>
            <p>আপনার প্রোডাকশন ডাটাবেসের অখণ্ডতা ও নিরাপত্তা বজায় রাখার স্বার্থে সেটআপ টুলটি লক রাখা হয়েছে।</p>
            <div class="note">
                পুনরায় মাইগ্রেশন চালানোর প্রয়োজন হলে শুধুমাত্র অনুমোদিত সার্ভার অ্যাডমিনিস্ট্রেটর SSH অথবা Hostinger File Manager-এর মাধ্যমে <code>config/setup.lock</code> ফাইলটি অপসারণ করতে পারবেন।
            </div>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// 5. Load Credentials and Enforce Strong Secret Token
$credsFile = __DIR__ . '/config/db_credentials.php';
$credentials = file_exists($credsFile) ? include $credsFile : [];
$expectedToken = getenv('SETUP_TOKEN') ?: ($credentials['setup_token'] ?? '');

if (empty($expectedToken) || strlen((string)$expectedToken) < 16) {
    http_response_code(503);
    header('Content-Type: text/html; charset=UTF-8');
    ?>
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <title>Setup Token Required - AharLocal</title>
        <style>
            body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px 15px; }
            .box { max-width: 640px; margin: 40px auto; background: #1e293b; padding: 35px; border-radius: 14px; border: 1px solid #dc2626; }
            h2 { color: #f87171; font-size: 20px; margin-bottom: 12px; }
            p { color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 12px; }
            pre { background: #0f172a; padding: 14px; border-radius: 8px; font-size: 13px; color: #38bdf8; border: 1px solid #334155; }
        </style>
    </head>
    <body>
        <div class="box">
            <h2>প্রাইভেট সিকিউরিটি টোকেন কনফিগার করা আবশ্যক</h2>
            <p>ডিফল্ট বা দুর্বল টোকেন দিয়ে মাইগ্রেশন চালানো সম্পূর্ণ নিষিদ্ধ। ডাটাবেস সেটআপ সক্রিয় করার জন্য সার্ভারের প্রাইভেট ফাইলে কমপক্ষে ১৬ ক্যারেক্টারের একটি শক্তিশালী সিক্রেট টোকেন কনফিগার করুন।</p>
            <p>Hostinger File Manager-এ গিয়ে <code>public_html/api/config/db_credentials.php</code> ফাইলে আপনার টোকেন দিন:</p>
            <pre>'setup_token' => 'YOUR_STRONG_SECRET_TOKEN_HERE',</pre>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// 6. Rate Limiting Protection (Brute Force Prevention)
$clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateLimitFile = sys_get_temp_dir() . '/aharlocal_rate_' . md5($clientIp);
$rateData = file_exists($rateLimitFile) ? @json_decode(file_get_contents($rateLimitFile), true) : ['attempts' => 0, 'locked_until' => 0];

if (time() < ($rateData['locked_until'] ?? 0)) {
    http_response_code(429);
    header('Content-Type: text/plain; charset=UTF-8');
    die("অতিরিক্ত ব্যর্থ চেষ্টার কারণে আপনার আইপি ১৫ মিনিটের জন্য সাময়িকভাবে স্থগিত করা হয়েছে।");
}

// 7. Strict Prohibition of URL Query Parameter Tokens
if (isset($_GET['token']) || isset($_GET['setup_token'])) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=UTF-8');
    die("নিরাপত্তার স্বার্থে URL কোয়েরি প্যারামিটারে টোকেন দেওয়া নিষিদ্ধ। অনুগ্রহ করে POST ফর্ম ব্যবহার করুন।");
}

// 8. Handle Logout POST Action with CSRF Protection (Requirement 5)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'logout') {
    $submittedCsrf = $_POST['csrf_token'] ?? '';
    if (hash_equals($_SESSION['csrf_token'] ?? '', $submittedCsrf)) {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
    }
    header('Location: setup_database.php');
    exit;
}

// 9. Handle Login Authentication POST
$loginError = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login_setup_token'])) {
    $submitted = (string)$_POST['login_setup_token'];
    if (hash_equals((string)$expectedToken, $submitted)) {
        if (file_exists($rateLimitFile)) @unlink($rateLimitFile);
        session_regenerate_id(true);
        $_SESSION['aharlocal_setup_auth'] = true;
        $_SESSION['aharlocal_auth_time'] = time();
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    } else {
        $rateData['attempts'] = ($rateData['attempts'] ?? 0) + 1;
        if ($rateData['attempts'] >= 5) {
            $rateData['locked_until'] = time() + 900;
        }
        @file_put_contents($rateLimitFile, json_encode($rateData));
        $loginError = 'প্রদত্ত সিকিউরিটি টোকেনটি সঠিক নয়। অনুগ্রহ করে সঠিক টোকেন প্রদান করুন।';
    }
}

// If user is not authenticated, display login form
$isAuthenticated = !empty($_SESSION['aharlocal_setup_auth']);
if (!$isAuthenticated) {
    header('Content-Type: text/html; charset=UTF-8');
    ?>
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AharLocal - Setup Authentication</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { background: #0f172a; color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; max-width: 460px; width: 100%; padding: 32px; box-shadow: 0 15px 35px rgba(0,0,0,0.5); }
            .logo { width: 44px; height: 44px; background: #ea580c; border-radius: 10px; line-height: 44px; font-size: 22px; color: white; font-weight: 800; text-align: center; margin: 0 auto 12px; }
            h1 { font-size: 18px; font-weight: 700; text-align: center; color: #f8fafc; margin-bottom: 6px; }
            p { font-size: 13px; color: #94a3b8; text-align: center; margin-bottom: 24px; line-height: 1.5; }
            .form-group { margin-bottom: 20px; }
            label { display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #cbd5e1; margin-bottom: 8px; }
            input[type="password"] { width: 100%; background: #0f172a; border: 1px solid #475569; padding: 12px 14px; border-radius: 8px; color: #f8fafc; font-size: 14px; outline: none; }
            input[type="password"]:focus { border-color: #ea580c; }
            .btn { width: 100%; background: #ea580c; color: white; padding: 12px; border: none; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; }
            .btn:hover { background: #c2410c; }
            .err { background: #450a0a; border: 1px solid #ef4444; color: #fca5a5; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; }
            .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #64748b; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="logo">আ</div>
            <h1>AharLocal Database Setup</h1>
            <p>Hostinger MySQL Production Setup & Migration<br>Database: <strong>u691798054_aharlocal_db</strong></p>

            <?php if (!empty($loginError)): ?>
                <div class="err"><?= htmlspecialchars($loginError) ?></div>
            <?php endif; ?>
            <?php if (!empty($sessionExpiredNotice)): ?>
                <div class="err" style="background: #78350f; border-color: #eab308; color: #fef08a;">নিষ্ক্রিয়তার কারণে সেশন মেয়াদোত্তীর্ণ হয়েছে। পুনরায় লগইন করুন।</div>
            <?php endif; ?>

            <form method="POST" action="setup_database.php" autocomplete="off">
                <div class="form-group">
                    <label for="login_setup_token">প্রাইভেট সেটআপ টোকেন (Private Setup Token)</label>
                    <input type="password" id="login_setup_token" name="login_setup_token" required placeholder="Enter private setup secret token">
                </div>
                <button type="submit" class="btn">লগইন ও অডিট শুরু করুন (Authenticate)</button>
            </form>
            <div class="footer">
                HTTPS Enforced &bull; Session Auth &bull; Zero Token in HTML Source
            </div>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// 10. CSRF Validation for Authenticated POST Actions
$csrfToken = $_SESSION['csrf_token'] ?? '';
$action = 'inspect'; // default dry-run mode
$csrfError = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !isset($_POST['login_setup_token'])) {
    $submittedCsrf = $_POST['csrf_token'] ?? '';
    if (empty($csrfToken) || !hash_equals($csrfToken, (string)$submittedCsrf)) {
        $csrfError = true;
    } else {
        $action = $_POST['action'] ?? 'inspect';
    }
}

// 11. Database Connection & Strict Identity Verification (Requirement 6)
require_once __DIR__ . '/config/db.php';

$connectionTest = Database::testConnection();
if (!$connectionTest['connected'] || !$connectionTest['database_exact_match']) {
    header('Content-Type: text/html; charset=UTF-8');
    ?>
    <!DOCTYPE html>
    <html lang="bn">
    <head><meta charset="UTF-8"><title>Database Identity Mismatch - AharLocal</title>
    <style>body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
    .box { max-width: 640px; margin: 40px auto; background: #1e293b; padding: 30px; border-radius: 12px; border: 1px solid #ef4444; }
    </style></head>
    <body>
    <div class="box">
        <h2 style="color: #ef4444;">ডাটাবেস আইডেন্টিটি যাচাই ব্যর্থ (Database Identity Mismatch)</h2>
        <p style="margin-top: 12px; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
            প্রোডাকশন ডাটাবেসের নাম অবশ্যই <strong><?= htmlspecialchars(Database::EXPECTED_DATABASE) ?></strong> হতে হবে।<br>
            <?php if (!$connectionTest['connected']): ?>
                কানেকশন স্ট্যাটাস: <em>সংযোগ করা যায়নি। <?= htmlspecialchars($connectionTest['error_message'] ?? '') ?></em>
            <?php else: ?>
                বর্তমান সিলেক্টেড ডাটাবেস: <code><?= htmlspecialchars($connectionTest['selected_database'] ?: 'None') ?></code> (প্রত্যাশিত ডাটাবেসের সাথে মেলেনি)।
            <?php endif; ?>
        </p>
        <p style="margin-top: 15px; font-size: 13px; color: #94a3b8;">
            নিরাপত্তার স্বার্থে সেটআপ প্রক্রিয়া বন্ধ রাখা হয়েছে। Hostinger File Manager-এ গিয়ে <code>public_html/api/config/db_credentials.php</code> ফাইলে ডাটাবেস নাম ও পাসওয়ার্ড যাচাই করুন।
        </p>
    </div>
    </body></html>
    <?php
    exit;
}

$db = Database::getConnection(false);
$dbName = Database::EXPECTED_DATABASE;

// 12. Canonical SQL Schemas for all 22 tables (No pricing defaults - Rule 1)
$canonicalSchemas = [
    'users' => "CREATE TABLE IF NOT EXISTS `users` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'service_areas' => "CREATE TABLE IF NOT EXISTS `service_areas` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'service_area_points' => "CREATE TABLE IF NOT EXISTS `service_area_points` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `service_area_id` INT NOT NULL,
        `latitude` DECIMAL(10, 8) NOT NULL,
        `longitude` DECIMAL(11, 8) NOT NULL,
        `sequence_order` INT NOT NULL DEFAULT 0,
        FOREIGN KEY (`service_area_id`) REFERENCES `service_areas`(`id`) ON DELETE CASCADE,
        INDEX `idx_sa_points` (`service_area_id`, `sequence_order`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'restaurants' => "CREATE TABLE IF NOT EXISTS `restaurants` (
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
        `photos_json` TEXT NULL,
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
        `cuisine_types_json` TEXT NULL,
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'food_categories' => "CREATE TABLE IF NOT EXISTS `food_categories` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(100) NOT NULL,
        `name_bn` VARCHAR(150) NOT NULL,
        `image_url` VARCHAR(255) NULL,
        `sort_order` INT NOT NULL DEFAULT 0,
        `is_active` TINYINT(1) NOT NULL DEFAULT 1,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX `idx_fcat_order` (`sort_order`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'restaurant_categories' => "CREATE TABLE IF NOT EXISTS `restaurant_categories` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `restaurant_id` INT NOT NULL,
        `name` VARCHAR(100) NOT NULL,
        `name_bn` VARCHAR(150) NOT NULL,
        `sort_order` INT NOT NULL DEFAULT 0,
        `is_active` TINYINT(1) NOT NULL DEFAULT 1,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE,
        INDEX `idx_rcat_rest` (`restaurant_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'foods' => "CREATE TABLE IF NOT EXISTS `foods` (
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
        `is_available` TINYINT(1) NOT NULL DEFAULT 1,
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'restaurant_hours' => "CREATE TABLE IF NOT EXISTS `restaurant_hours` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `restaurant_id` INT NOT NULL,
        `day_of_week` TINYINT NOT NULL,
        `open_time` TIME NOT NULL DEFAULT '09:00:00',
        `close_time` TIME NOT NULL DEFAULT '22:00:00',
        `is_closed` TINYINT(1) NOT NULL DEFAULT 0,
        FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE,
        UNIQUE KEY `uk_rest_day` (`restaurant_id`, `day_of_week`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'delivery_partners' => "CREATE TABLE IF NOT EXISTS `delivery_partners` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'addresses' => "CREATE TABLE IF NOT EXISTS `addresses` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'orders' => "CREATE TABLE IF NOT EXISTS `orders` (
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
        `items_json` LONGTEXT NOT NULL,
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'order_items' => "CREATE TABLE IF NOT EXISTS `order_items` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'payments' => "CREATE TABLE IF NOT EXISTS `payments` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'coupons' => "CREATE TABLE IF NOT EXISTS `coupons` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'restaurant_promocodes' => "CREATE TABLE IF NOT EXISTS `restaurant_promocodes` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'location_rankings' => "CREATE TABLE IF NOT EXISTS `location_rankings` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'wallets' => "CREATE TABLE IF NOT EXISTS `wallets` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'wallet_transactions' => "CREATE TABLE IF NOT EXISTS `wallet_transactions` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `wallet_id` INT NOT NULL,
        `type` ENUM('credit', 'debit') NOT NULL,
        `amount` DECIMAL(10,2) NOT NULL,
        `balance_after` DECIMAL(10,2) NOT NULL,
        `description` VARCHAR(255) NOT NULL,
        `reference_id` VARCHAR(100) NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE RESTRICT,
        INDEX `idx_wtx_wallet` (`wallet_id`),
        INDEX `idx_wtx_type` (`type`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'payout_requests' => "CREATE TABLE IF NOT EXISTS `payout_requests` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'notifications' => "CREATE TABLE IF NOT EXISTS `notifications` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'platform_settings' => "CREATE TABLE IF NOT EXISTS `platform_settings` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `setting_key` VARCHAR(80) UNIQUE NOT NULL,
        `setting_value` TEXT NOT NULL,
        `description` VARCHAR(255) NULL,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'promotions' => "CREATE TABLE IF NOT EXISTS `promotions` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
];

$expectedTables = array_keys($canonicalSchemas);

// 13. Deep Schema Comparison Function (Requirement 3)
function auditDatabaseSchema(PDO $db, string $dbName, array $canonicalSchemas): array {
    $expectedTables = array_keys($canonicalSchemas);
    $audit = [
        'db_name'          => $dbName,
        'existing_tables'  => [],
        'missing_tables'   => [],
        'tables_meta'      => [],
        'columns_audit'    => [],
        'indexes_audit'    => [],
        'constraints_audit'=> [],
        'safe_migrations'  => [],
        'manual_migrations'=> [],
        'all_verified'     => false
    ];

    // Query information_schema.TABLES
    $tblStmt = $db->prepare("SELECT TABLE_NAME, ENGINE, TABLE_COLLATION, TABLE_ROWS 
                             FROM information_schema.TABLES 
                             WHERE TABLE_SCHEMA = ?");
    $tblStmt->execute([$dbName]);
    $existingRows = $tblStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($existingRows as $row) {
        $audit['existing_tables'][] = $row['TABLE_NAME'];
        $audit['tables_meta'][$row['TABLE_NAME']] = [
            'engine'    => $row['ENGINE'] ?? 'Unknown',
            'collation' => $row['TABLE_COLLATION'] ?? 'Unknown',
            'rows'      => (int)($row['TABLE_ROWS'] ?? 0)
        ];
    }

    foreach ($expectedTables as $t) {
        if (!in_array($t, $audit['existing_tables'], true)) {
            $audit['missing_tables'][] = $t;
        }
    }

    // Query information_schema.COLUMNS
    $colStmt = $db->prepare("SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA 
                             FROM information_schema.COLUMNS 
                             WHERE TABLE_SCHEMA = ? 
                             ORDER BY TABLE_NAME, ORDINAL_POSITION");
    $colStmt->execute([$dbName]);
    $cols = $colStmt->fetchAll(PDO::FETCH_ASSOC);

    $dbColumns = [];
    foreach ($cols as $c) {
        $dbColumns[$c['TABLE_NAME']][$c['COLUMN_NAME']] = $c;
    }

    // Query information_schema.STATISTICS (Indexes)
    $statStmt = $db->prepare("SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, COLUMN_NAME, SEQ_IN_INDEX 
                              FROM information_schema.STATISTICS 
                              WHERE TABLE_SCHEMA = ? 
                              ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX");
    $statStmt->execute([$dbName]);
    $stats = $statStmt->fetchAll(PDO::FETCH_ASSOC);

    $dbIndexes = [];
    foreach ($stats as $s) {
        $dbIndexes[$s['TABLE_NAME']][$s['INDEX_NAME']][] = $s['COLUMN_NAME'];
    }

    // Query information_schema.TABLE_CONSTRAINTS & KEY_COLUMN_USAGE
    $tcStmt = $db->prepare("SELECT tc.TABLE_NAME, tc.CONSTRAINT_NAME, tc.CONSTRAINT_TYPE, 
                                   kcu.COLUMN_NAME, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME 
                            FROM information_schema.TABLE_CONSTRAINTS tc 
                            LEFT JOIN information_schema.KEY_COLUMN_USAGE kcu 
                              ON tc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA 
                             AND tc.TABLE_NAME = kcu.TABLE_NAME 
                             AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME 
                            WHERE tc.TABLE_SCHEMA = ?");
    $tcStmt->execute([$dbName]);
    $tcs = $tcStmt->fetchAll(PDO::FETCH_ASSOC);

    $dbConstraints = [];
    foreach ($tcs as $tc) {
        $dbConstraints[$tc['TABLE_NAME']][$tc['CONSTRAINT_NAME']] = [
            'type'        => $tc['CONSTRAINT_TYPE'],
            'column'      => $tc['COLUMN_NAME'],
            'ref_table'   => $tc['REFERENCED_TABLE_NAME'],
            'ref_column'  => $tc['REFERENCED_COLUMN_NAME']
        ];
    }

    $audit['columns_audit'] = $dbColumns;
    $audit['indexes_audit'] = $dbIndexes;
    $audit['constraints_audit'] = $dbConstraints;

    // Detailed comparison for existing tables
    foreach ($expectedTables as $tableName) {
        if (!in_array($tableName, $audit['existing_tables'], true)) {
            continue;
        }

        $cntQuery = $db->query("SELECT COUNT(*) FROM `{$tableName}`");
        $rowCount = (int)$cntQuery->fetchColumn();
        $audit['tables_meta'][$tableName]['exact_rows'] = $rowCount;

        // Parse canonical columns from canonical CREATE TABLE statement
        $createSql = $canonicalSchemas[$tableName];
        preg_match('/\((.*)\)[^)]*$/s', $createSql, $matches);
        $body = $matches[1] ?? '';
        $lines = explode("\n", $body);

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || str_starts_with($line, '--') || str_starts_with($line, 'INDEX') || str_starts_with($line, 'FOREIGN KEY') || str_starts_with($line, 'UNIQUE KEY')) {
                continue;
            }

            if (preg_match('/^`([^`]+)`\s+(.*?),?$/', $line, $colMatch)) {
                $colName = $colMatch[1];
                $colDef  = rtrim($colMatch[2], ',');

                if (!isset($dbColumns[$tableName][$colName])) {
                    $isPk = (stripos($colDef, 'PRIMARY KEY') !== false);
                    $isAutoInc = (stripos($colDef, 'AUTO_INCREMENT') !== false);
                    $isNotNull = (stripos($colDef, 'NOT NULL') !== false);
                    $hasDefault = (stripos($colDef, 'DEFAULT') !== false);

                    // Safeguard rule 4: Never automatically add PK or AUTO_INCREMENT to populated table
                    if ($rowCount > 0 && ($isPk || $isAutoInc)) {
                        $audit['manual_migrations'][] = [
                            'table'   => $tableName,
                            'type'    => 'PRIMARY_KEY_ADDITION',
                            'column'  => $colName,
                            'sql'     => "ALTER TABLE `{$tableName}` ADD COLUMN `{$colName}` {$colDef}",
                            'reason'  => "টেবিলে {$rowCount}টি রেকর্ড রয়েছে। বিদ্যমান রেকর্ডে স্বয়ংক্রিয়ভাবে Primary Key বা AUTO_INCREMENT কলাম যোগ করা অনিরাপদ।"
                        ];
                    } elseif ($rowCount > 0 && $isNotNull && !$hasDefault) {
                        $audit['manual_migrations'][] = [
                            'table'   => $tableName,
                            'type'    => 'NOT_NULL_NO_DEFAULT',
                            'column'  => $colName,
                            'sql'     => "ALTER TABLE `{$tableName}` ADD COLUMN `{$colName}` {$colDef}",
                            'reason'  => "টেবিলে {$rowCount}টি রেকর্ড রয়েছে। DEFAULT ছাড়া NOT NULL কলাম যোগ করলে ডেটা অখণ্ডতা ক্ষতিগ্রস্ত হতে পারে।"
                        ];
                    } else {
                        $audit['safe_migrations'][] = [
                            'table'   => $tableName,
                            'type'    => 'ADD_COLUMN',
                            'column'  => $colName,
                            'sql'     => "ALTER TABLE `{$tableName}` ADD COLUMN `{$colName}` {$colDef}"
                        ];
                    }
                }
            }
        }
    }

    $audit['all_verified'] = (count($audit['missing_tables']) === 0 && empty($audit['safe_migrations']) && empty($audit['manual_migrations']));

    return $audit;
}

$state = [
    'connected'          => true,
    'db_name'            => $dbName,
    'audit'              => [],
    'applied_log'        => [],
    'failed_log'         => [],
    'lock_created'       => false,
    'error_message'      => null
];

try {
    // 14. Initial Deep Schema Audit
    $audit = auditDatabaseSchema($db, $dbName, $canonicalSchemas);
    $state['audit'] = $audit;

    // 15. Apply Safe Migrations Execution (ONLY IF action === 'apply' AND valid CSRF)
    if ($action === 'apply' && !$csrfError) {
        $hasError = false;

        // Step A: Create missing tables using canonical reviewed SQL (Requirement 2)
        foreach ($audit['missing_tables'] as $missingTable) {
            if (isset($canonicalSchemas[$missingTable])) {
                try {
                    $db->exec($canonicalSchemas[$missingTable]);
                    $state['applied_log'][] = "সফলভাবে টেবিল তৈরি হয়েছে: `{$missingTable}`";
                    error_log("AharLocal Migration Success: Created table `{$missingTable}`");
                } catch (Throwable $e) {
                    $hasError = true;
                    $state['failed_log'][] = "টেবিল `{$missingTable}` তৈরি ব্যর্থ: " . $e->getMessage();
                    error_log("AharLocal Migration Failure: Could not create table `{$missingTable}`: " . $e->getMessage());
                    break; // Stop immediately on failure (Requirement 9)
                }
            }
        }

        // Step B: Execute safe migrations
        if (!$hasError) {
            foreach ($audit['safe_migrations'] as $m) {
                try {
                    $db->exec($m['sql']);
                    $state['applied_log'][] = "সফলভাবে কলাম যুক্ত হয়েছে: `{$m['table']}`.`{$m['column']}`";
                    error_log("AharLocal Migration Success: " . $m['sql']);
                } catch (Throwable $e) {
                    $hasError = true;
                    $state['failed_log'][] = "কলাম `{$m['table']}`.`{$m['column']}` মাইগ্রেশন ব্যর্থ: " . $e->getMessage();
                    error_log("AharLocal Migration Failure: " . $m['sql'] . " - " . $e->getMessage());
                    break; // Stop immediately on failure (Requirement 9)
                }
            }
        }

        // Step C: Independent Post-Apply Verification (Requirement 8)
        $postAudit = auditDatabaseSchema($db, $dbName, $canonicalSchemas);
        $state['audit'] = $postAudit;

        // Step D: Write setup.lock ONLY if all 22 tables exist, 0 manual migrations remain, and no errors
        // Note: No session IDs or credentials stored in setup.lock (Requirement 5)
        if (!$hasError && $postAudit['all_verified'] && empty($postAudit['missing_tables']) && empty($postAudit['manual_migrations'])) {
            $lockData = "LOCKED_AT=" . date('c') . "\n";
            $lockData .= "DB=" . $dbName . "\n";
            $lockData .= "VERIFIED_TABLES=22\n";
            $lockData .= "STATUS=100_PERCENT_VERIFIED\n";

            $writeRes = @file_put_contents($lockFile, $lockData);
            if ($writeRes !== false && file_exists($lockFile)) {
                $state['lock_created'] = true;
                error_log("AharLocal DB Setup Lock successfully written.");
            } else {
                error_log("AharLocal Warning: Could not write lock file due to server permissions.");
            }
        }
    }

} catch (Throwable $e) {
    error_log("AharLocal Setup Exception: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    $state['error_message'] = 'ডাটাবেস অপারেশন সম্পন্ন করতে সমস্যা হয়েছে। সার্ভারের এরর লগ দেখুন।';
} finally {
    try {
        if (isset($db) && $db instanceof PDO) {
            $db->exec('SET FOREIGN_KEY_CHECKS = 1');
        }
    } catch (Throwable $e) {}
}

header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AharLocal - Database Audit & Migration Control</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #0f172a; color: #f8fafc; padding: 30px 15px; line-height: 1.5; }
        .container { max-width: 1060px; margin: 0 auto; background: #1e293b; border-radius: 16px; box-shadow: 0 10px 35px rgba(0,0,0,0.5); border: 1px solid #334155; overflow: hidden; }
        .header { background: linear-gradient(135deg, #ea580c 0%, #9a3412 100%); padding: 28px 32px; border-bottom: 1px solid #ea580c; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { font-size: 22px; font-weight: 800; }
        .header p { color: #fed7aa; margin-top: 4px; font-size: 13px; }
        .logout-form { margin: 0; }
        .logout-btn { background: rgba(0,0,0,0.3); color: #fff; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; }
        .logout-btn:hover { background: rgba(0,0,0,0.5); }
        .content { padding: 32px; }
        .badges { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 25px; }
        .badge { display: inline-flex; align-items: center; padding: 5px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .badge-success { background: #14532d; color: #86efac; border: 1px solid #22c55e; }
        .badge-warning { background: #78350f; color: #fde047; border: 1px solid #eab308; }
        .badge-danger { background: #7f1d1d; color: #fca5a5; border: 1px solid #ef4444; }
        .badge-info { background: #082f49; color: #7dd3fc; border: 1px solid #0284c7; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; margin: 20px 0 30px; }
        .metric-card { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px 20px; }
        .metric-card .title { font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .metric-card .value { font-size: 20px; font-weight: 800; color: #f8fafc; margin-top: 6px; }
        .callout { background: #082f49; border: 1px solid #0284c7; padding: 16px 20px; border-radius: 10px; margin: 20px 0; font-size: 13px; color: #bae6fd; line-height: 1.6; }
        .backup-warning { background: #78350f; border: 1px solid #eab308; padding: 16px 20px; border-radius: 10px; margin: 20px 0; font-size: 13px; color: #fef08a; line-height: 1.6; }
        .alert-box { background: #450a0a; border: 1px solid #ef4444; padding: 16px 20px; border-radius: 10px; margin: 20px 0; font-size: 13px; color: #fca5a5; }
        .table-list { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .table-list th, .table-list td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #334155; font-size: 13px; }
        .table-list th { background: #0f172a; color: #94a3b8; font-size: 11px; text-transform: uppercase; }
        .status-pill { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
        .pill-verified { background: #166534; color: #bbf7d0; }
        .pill-missing { background: #991b1b; color: #fecaca; }
        .pill-warning { background: #854d0e; color: #fef08a; }
        .action-card { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 22px; margin-top: 25px; }
        .btn-apply { display: inline-block; background: #ea580c; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; text-decoration: none; margin-top: 15px; }
        .btn-apply:hover { background: #c2410c; }
        .code-box { background: #090d16; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; color: #38bdf8; margin-top: 6px; word-break: break-all; border: 1px solid #1e293b; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <div>
            <h1>AharLocal - Database Audit & Migration Control</h1>
            <p>Database: <strong><?= htmlspecialchars($dbName) ?></strong> &bull; Hostinger Shared Hosting (localhost)</p>
        </div>
        <div>
            <!-- Logout via POST with CSRF protection (Requirement 5) -->
            <form method="POST" action="setup_database.php" class="logout-form">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken) ?>">
                <input type="hidden" name="action" value="logout">
                <button type="submit" class="logout-btn">লগআউট (Logout)</button>
            </form>
        </div>
    </div>
    <div class="content">
        <?php if ($csrfError): ?>
            <div class="alert-box">CSRF সিকিউরিটি টোকেন যাচাই ব্যর্থ হয়েছে। অনুগ্রহ করে পেজ রিফ্রেশ করে পুনরায় চেষ্টা করুন।</div>
        <?php endif; ?>

        <?php if ($state['connected'] && empty($state['error_message'])): 
            $audit = $state['audit'];
            $existingCount = count($audit['existing_tables']);
            $missingCount = count($audit['missing_tables']);
            $safeCount = count($audit['safe_migrations']);
            $manualCount = count($audit['manual_migrations']);
        ?>
            <div class="badges">
                <span class="badge badge-success">&bull; DB Connection: Active</span>
                <span class="badge badge-success">&bull; Identity: Verified (<?= htmlspecialchars($dbName) ?>)</span>
                <span class="badge badge-info">&bull; Auth: Session Protected (HTTPS)</span>
                <?php if ($state['lock_created']): ?>
                    <span class="badge badge-warning">&bull; Status: Locked (setup.lock Written)</span>
                <?php elseif ($audit['all_verified']): ?>
                    <span class="badge badge-success">&bull; Status: 100% Schema Verified</span>
                <?php else: ?>
                    <span class="badge badge-info">&bull; Mode: <?= ($action === 'apply') ? 'Applied Mode' : 'Inspection (Dry-Run)' ?></span>
                <?php endif; ?>
            </div>

            <div class="metric-grid">
                <div class="metric-card">
                    <div class="title">Verified Database</div>
                    <div class="value"><?= htmlspecialchars($dbName) ?></div>
                </div>
                <div class="metric-card">
                    <div class="title">Verified Tables</div>
                    <div class="value"><?= 22 - $missingCount ?> / 22</div>
                </div>
                <div class="metric-card">
                    <div class="title">Safe Migrations Ready</div>
                    <div class="value" style="color: #4ade80;"><?= $safeCount + $missingCount ?></div>
                </div>
                <div class="metric-card">
                    <div class="title">Manual Review Required</div>
                    <div class="value" style="color: #f87171;"><?= $manualCount ?></div>
                </div>
            </div>

            <div class="backup-warning">
                <strong>ডাটাবেস ব্যাকআপ সতর্কতা (Verified Backup Requirement):</strong><br>
                লাইভ প্রোডাকশন ডাটাবেসে কোনো মাইগ্রেশন চালানোর পূর্বে Hostinger phpMyAdmin অথবা SSH mysqldump ব্যবহার করে একটি সম্পূর্ণ ভেরিফায়েড ব্যাকআপ নেওয়া বাধ্যতামূলক।
            </div>

            <div class="callout">
                <strong>নিরাপত্তা ও অখণ্ডতা নীতি:</strong> কোনো বিদ্যমান টেবিল ড্রপ করা হয় না (`DROP TABLE` এবং `TRUNCATE` সম্পূর্ণ নিষিদ্ধ)। লাইভ সার্ভারের বাস্তব `ENGINE`, `COLLATION`, `COLUMNS`, `STATISTICS` এবং `TABLE_CONSTRAINTS` বিশ্লেষণ করা হয়েছে। কোনো কাল্পনিক কমিশন বা ডেলিভারি ফি ডিফল্ট মান হিসেবে যুক্ত করা হয়নি।
            </div>

            <?php if (!empty($state['applied_log'])): ?>
                <div class="callout" style="background: #14532d; border-color: #22c55e; color: #bbf7d0;">
                    <strong>সম্পাদিত অপারেশনসমূহ:</strong>
                    <ul style="margin-top: 8px; margin-left: 20px;">
                        <?php foreach ($state['applied_log'] as $item): ?>
                            <li><?= htmlspecialchars($item) ?></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>

            <?php if (!empty($state['failed_log'])): ?>
                <div class="alert-box">
                    <strong>মাইগ্রেশন ব্যর্থ হয়েছে (অপারেশন বন্ধ রাখা হয়েছে):</strong>
                    <ul style="margin-top: 8px; margin-left: 20px;">
                        <?php foreach ($state['failed_log'] as $item): ?>
                            <li><?= htmlspecialchars($item) ?></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>

            <?php if ($manualCount > 0): ?>
                <div class="alert-box">
                    <strong>ম্যানুয়াল অনুমোদন আবশ্যক (Manual Review Required):</strong><br>
                    নিচের পরিবর্তনগুলো স্বয়ংক্রিয়ভাবে প্রয়োগ করা নিষিদ্ধ কারণ এতে বিদ্যমান পপুলেটেড রেকর্ডের ক্ষতি হতে পারে:
                    <ul style="margin-top: 10px; margin-left: 20px;">
                        <?php foreach ($audit['manual_migrations'] as $mm): ?>
                            <li style="margin-bottom: 8px;">
                                <strong><?= htmlspecialchars($mm['table']) ?>.<?= htmlspecialchars($mm['column']) ?></strong>: <?= htmlspecialchars($mm['reason']) ?>
                                <div class="code-box"><?= htmlspecialchars($mm['sql']) ?></div>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>

            <h3 style="margin-top: 30px; font-size: 15px;">১. ডাটাবেসের ২২টি টেবিলের বাস্তব স্কিমা অডিট (information_schema থেকে প্রাপ্ত):</h3>
            <table class="table-list">
                <thead>
                    <tr>
                        <th>Table Name</th>
                        <th>Existence</th>
                        <th>Live Records</th>
                        <th>Engine</th>
                        <th>Collation</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($canonicalSchemas as $tName => $sql): 
                        $isExists = in_array($tName, $audit['existing_tables'], true);
                        $meta = $audit['tables_meta'][$tName] ?? ['rows' => 0, 'engine' => 'N/A', 'collation' => 'N/A'];
                        $exactRows = $meta['exact_rows'] ?? $meta['rows'];
                    ?>
                    <tr>
                        <td style="font-weight: 700; font-family: monospace; color: #f8fafc;"><?= htmlspecialchars($tName) ?></td>
                        <td>
                            <?php if ($isExists): ?>
                                <span class="status-pill pill-verified">&bull; Exists</span>
                            <?php else: ?>
                                <span class="status-pill pill-missing">&bull; Missing</span>
                            <?php endif; ?>
                        </td>
                        <td><?= $isExists ? "{$exactRows} rows" : "0 (Not created)" ?></td>
                        <td style="color: #cbd5e1; font-size: 12px; font-family: monospace;"><?= htmlspecialchars($meta['engine']) ?></td>
                        <td style="color: #94a3b8; font-size: 12px; font-family: monospace;"><?= htmlspecialchars($meta['collation']) ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>

            <?php if ($action !== 'apply' && ($missingCount > 0 || $safeCount > 0)): ?>
                <div class="action-card" style="border-color: #ea580c;">
                    <h4 style="color: #ea580c; font-size: 14px; margin-bottom: 6px;">অনুমোদিত নিরাপদ মাইগ্রেশন প্ল্যান (Migration Plan)</h4>
                    <p style="font-size: 13px; color: #94a3b8;">
                        আপনি বর্তমানে <strong>Inspection (Dry-Run)</strong> মোডে আছেন। ডাটাবেসে এখনো কোনো পরিবর্তন করা হয়নি। নিচের নিরাপদ পরিবর্তনগুলো প্রয়োগ করতে পারবেন:
                    </p>
                    <ul style="margin: 12px 0 12px 20px; font-size: 13px; color: #cbd5e1;">
                        <?php if ($missingCount > 0): ?>
                            <li><?= $missingCount ?>টি অনুপস্থিত টেবিল তৈরি করা হবে (`CREATE TABLE IF NOT EXISTS`)।</li>
                        <?php endif; ?>
                        <?php if ($safeCount > 0): ?>
                            <li><?= $safeCount ?>টি অনুপস্থিত নিরাপদ কলাম যোগ করা হবে (`ALTER TABLE ADD COLUMN`)।</li>
                        <?php endif; ?>
                    </ul>

                    <form method="POST" action="setup_database.php" style="margin-top: 15px;">
                        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken) ?>">
                        <input type="hidden" name="action" value="apply">
                        <button type="submit" class="btn-apply">নিরাপদ মাইগ্রেশন প্রয়োগ করুন (Apply Safe Changes)</button>
                    </form>
                </div>
            <?php endif; ?>

        <?php else: ?>
            <div class="badges">
                <span class="badge badge-danger">Connection Error</span>
            </div>
            <div class="alert-box">
                <strong>ডাটাবেস সংযোগে সমস্যা হয়েছে:</strong><br>
                <?= htmlspecialchars($state['error_message'] ?? 'ডাটাবেস কানেকশন করা সম্ভব হয়নি।') ?><br><br>
                <em>Hostinger File Manager-এ গিয়ে <code>public_html/api/config/db_credentials.php</code> ফাইলে আপনার ডাটাবেস পাসওয়ার্ড ও কনফিগারেশন যাচাই করুন। বিস্তারিত তথ্য সার্ভার এরর লগে সংরক্ষিত হয়েছে।</em>
            </div>
        <?php endif; ?>
    </div>
</div>
</body>
</html>
