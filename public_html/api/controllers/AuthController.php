<?php
/**
 * AharLocal - Auth Controller
 * Handles user authentication, registration, profiles, and demo role switching.
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/jwt.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';

class AuthController {
    public static function login(): void {
        $body = getBody();
        $emailOrPhone = trim($body['email'] ?? $body['phone'] ?? '');
        $password     = (string)($body['password'] ?? '');

        if (empty($emailOrPhone) || empty($password)) {
            errorResponse('Email or phone and password are required', 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM users WHERE (email = :ep OR phone = :ep) AND is_active = 1 LIMIT 1');
        $stmt->execute([':ep' => $emailOrPhone]);
        $user = $stmt->fetch();

        if (!$user) {
            errorResponse('Invalid credentials or account does not exist (ভুল তথ্য দেওয়া হয়েছে)', 401);
        }

        if ($user['status'] === 'blocked') {
            errorResponse('Your account has been deactivated by admin (আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে)', 403);
        }

        // Secure password verification (strict bcrypt hash, no demo bypass)
        $isValid = password_verify($password, $user['password_hash']);

        if (!$isValid) {
            errorResponse('Invalid credentials (পাসওয়ার্ড ভুল)', 401);
        }

        $token = JWT::generate([
            'id'    => $user['id'],
            'email' => $user['email'],
            'role'  => $user['role'],
            'name'  => $user['name']
        ]);

        unset($user['password_hash']);

        jsonResponse([
            'token' => $token,
            'user'  => $user
        ], 200, 'Login successful (লগইন সফল হয়েছে)');
    }

    public static function register(): void {
        $body = getBody();
        $name     = trim($body['name'] ?? '');
        $email    = trim($body['email'] ?? '');
        $phone    = trim($body['phone'] ?? '');
        $password = (string)($body['password'] ?? '');
        $role     = $body['role'] ?? 'customer';

        if (empty($name) || empty($email) || empty($phone) || empty($password)) {
            errorResponse('All fields are required (নাম, ইমেল, ফোন এবং পাসওয়ার্ড আবশ্যক)', 400);
        }

        $allowedRoles = ['customer', 'restaurant', 'delivery', 'admin'];
        if (!in_array($role, $allowedRoles, true)) {
            $role = 'customer';
        }

        $db = Database::getConnection();

        // Check duplicates
        $check = $db->prepare('SELECT id FROM users WHERE email = :e OR phone = :p LIMIT 1');
        $check->execute([':e' => $email, ':p' => $phone]);
        if ($check->fetch()) {
            errorResponse('Email or phone number already registered (এই ইমেল বা ফোন নম্বরটি আগে থেকেই রয়েছে)', 409);
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        $insert = $db->prepare('
            INSERT INTO users (name, email, phone, password_hash, role, language, is_active, status)
            VALUES (:name, :email, :phone, :hash, :role, :lang, 1, "active")
        ');
        $insert->execute([
            ':name' => $name,
            ':email' => $email,
            ':phone' => $phone,
            ':hash'  => $passwordHash,
            ':role'  => $role,
            ':lang'  => $body['language'] ?? 'bn'
        ]);

        $userId = (int)$db->lastInsertId();

        // Initialize wallet for restaurant / rider
        if ($role === 'restaurant' || $role === 'delivery') {
            $w = $db->prepare('INSERT INTO wallets (user_id, role, balance, total_earned, total_withdrawn) VALUES (:uid, :r, 0, 0, 0)');
            $w->execute([':uid' => $userId, ':r' => $role]);
        }

        $stmt = $db->prepare('SELECT id, name, email, phone, role, profile_photo, language, cod_enabled, is_active, status FROM users WHERE id = :id');
        $stmt->execute([':id' => $userId]);
        $user = $stmt->fetch();

        $token = JWT::generate([
            'id'    => $user['id'],
            'email' => $user['email'],
            'role'  => $user['role'],
            'name'  => $user['name']
        ]);

        jsonResponse([
            'token' => $token,
            'user'  => $user
        ], 201, 'Registration successful (অ্যাকাউন্ট তৈরি সম্পন্ন হয়েছে)');
    }

    public static function me(): void {
        $user = requireAuth();
        jsonResponse($user);
    }

    public static function updateProfile(): void {
        $user = requireAuth();
        $body = getBody();

        $db = Database::getConnection();

        $allowedFields = [
            'name', 'phone', 'language', 'dob', 'gender', 'address',
            'profile_photo', 'passport_photo', 'payment_method',
            'upi_id', 'upi_qr_photo', 'bank_name', 'bank_account_no',
            'bank_account_holder', 'bank_ifsc', 'bank_passbook_photo'
        ];

        $updates = [];
        $params = [':id' => $user['id']];

        foreach ($allowedFields as $field) {
            if (isset($body[$field])) {
                $updates[] = "`{$field}` = :{$field}";
                $params[":{$field}"] = $body[$field];
            }
        }

        if (!empty($updates)) {
            $sql = 'UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = :id';
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
        }

        $fetch = $db->prepare('SELECT id, name, email, phone, role, profile_photo, passport_photo, language, dob, gender, address, payment_method, upi_id, upi_qr_photo, bank_name, bank_account_no, bank_account_holder, bank_ifsc, bank_passbook_photo, cod_enabled, is_active, status FROM users WHERE id = :id');
        $fetch->execute([':id' => $user['id']]);
        $updatedUser = $fetch->fetch();

        jsonResponse($updatedUser, 200, 'Profile updated successfully (প্রোফাইল আপডেট হয়েছে)');
    }

    public static function googleAuth(): void {
        $body = getBody();
        $email = trim($body['email'] ?? '');
        $name  = trim($body['name'] ?? 'Google User');
        $photo = $body['photo'] ?? null;

        if (empty($email)) {
            errorResponse('Email required from Google auth', 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM users WHERE email = :e LIMIT 1');
        $stmt->execute([':e' => $email]);
        $user = $stmt->fetch();

        if (!$user) {
            $dummyPhone = '+91' . rand(7000000000, 9999999999);
            $hash = password_hash(bin2hex(random_bytes(8)), PASSWORD_BCRYPT);

            $ins = $db->prepare('
                INSERT INTO users (name, email, phone, password_hash, role, profile_photo, auth_provider, is_active, status)
                VALUES (:name, :email, :phone, :hash, "customer", :photo, "google", 1, "active")
            ');
            $ins->execute([
                ':name' => $name,
                ':email' => $email,
                ':phone' => $dummyPhone,
                ':hash' => $hash,
                ':photo' => $photo
            ]);

            $userId = (int)$db->lastInsertId();
            $fetch = $db->prepare('SELECT id, name, email, phone, role, profile_photo, language, cod_enabled, is_active, status FROM users WHERE id = :id');
            $fetch->execute([':id' => $userId]);
            $user = $fetch->fetch();
        }

        unset($user['password_hash']);
        $token = JWT::generate([
            'id'    => $user['id'],
            'email' => $user['email'],
            'role'  => $user['role'],
            'name'  => $user['name']
        ]);

        jsonResponse([
            'token' => $token,
            'user'  => $user
        ]);
    }

    public static function registerRole(): void {
        $body = getBody();
        $role = $body['role'] ?? 'customer';
        $db = Database::getConnection();

        $name = trim($body['name'] ?? 'Partner User');
        $email = trim($body['email'] ?? ('user_' . time() . '@aharlocal.com'));
        $phone = trim($body['phone'] ?? ('+91' . rand(7000000000, 9999999999)));
        $password = (string)($body['password'] ?? 'password123');

        $hash = password_hash($password, PASSWORD_BCRYPT);

        $stmt = $db->prepare('
            INSERT INTO users (name, email, phone, password_hash, role, is_active, status)
            VALUES (:name, :email, :phone, :hash, :role, 1, "active")
        ');
        $stmt->execute([
            ':name' => $name,
            ':email' => $email,
            ':phone' => $phone,
            ':hash'  => $hash,
            ':role'  => $role
        ]);
        $userId = (int)$db->lastInsertId();

        // If restaurant role, create restaurant record
        if ($role === 'restaurant') {
            $restStmt = $db->prepare('
                INSERT INTO restaurants (user_id, service_area_id, name, name_bn, owner_name, phone, email, address, latitude, longitude, photo_url, status)
                VALUES (:uid, 1, :rname, :rname, :oname, :phone, :email, :addr, 22.5429, 88.3653, "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600", "approved")
            ');
            $restStmt->execute([
                ':uid' => $userId,
                ':rname' => $body['restaurant_name'] ?? ($name . ' Kitchen'),
                ':oname' => $name,
                ':phone' => $phone,
                ':email' => $email,
                ':addr' => $body['address'] ?? 'Kolkata, West Bengal'
            ]);
        }

        // If delivery role, create delivery partner record
        if ($role === 'delivery') {
            $dpStmt = $db->prepare('
                INSERT INTO delivery_partners (user_id, service_area_id, name, phone, email, vehicle_type, vehicle_number, driving_license_number, status, is_online, current_lat, current_lng)
                VALUES (:uid, 1, :name, :phone, :email, :vt, :vn, :dl, "approved", 1, 22.5401, 88.3610)
            ');
            $dpStmt->execute([
                ':uid' => $userId,
                ':name' => $name,
                ':phone' => $phone,
                ':email' => $email,
                ':vt' => $body['vehicle_type'] ?? 'bike',
                ':vn' => $body['vehicle_number'] ?? ('WB-' . rand(10, 99) . '-XX-' . rand(1000, 9999)),
                ':dl' => $body['driving_license_number'] ?? ('DL-' . time())
            ]);
        }

        $userStmt = $db->prepare('SELECT id, name, email, phone, role, profile_photo, language, cod_enabled, is_active, status FROM users WHERE id = :id');
        $userStmt->execute([':id' => $userId]);
        $user = $userStmt->fetch();

        $token = JWT::generate([
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'name' => $user['name']
        ]);

        jsonResponse([
            'token' => $token,
            'user' => $user
        ], 201, 'Registration role registered successfully');
    }

    public static function adminLogin(): void {
        $body = getBody();
        $email = trim($body['email'] ?? '');
        $password = (string)($body['password'] ?? '');

        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM users WHERE email = :e AND role = "admin" LIMIT 1');
        $stmt->execute([':e' => $email]);
        $user = $stmt->fetch();

        if (!$user) {
            errorResponse('Unauthorized Admin Email', 401);
        }

        // Secure password verification (strict bcrypt, no demo bypass)
        $isValid = password_verify($password, $user['password_hash']);
        if (!$isValid) {
            errorResponse('Invalid Admin Password', 401);
        }

        $token = JWT::generate([
            'id'    => $user['id'],
            'email' => $user['email'],
            'role'  => 'admin',
            'name'  => $user['name']
        ]);

        unset($user['password_hash']);
        jsonResponse([
            'token' => $token,
            'user'  => $user
        ], 200, 'Admin authenticated');
    }

    public static function demoSwitch(): void {
        $body = getBody();
        $role = $body['role'] ?? 'customer';

        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM users WHERE role = :r AND is_active = 1 LIMIT 1');
        $stmt->execute([':r' => $role]);
        $user = $stmt->fetch();

        if (!$user) {
            errorResponse('Demo account not found for role ' . $role, 404);
        }

        $token = JWT::generate([
            'id'    => $user['id'],
            'email' => $user['email'],
            'role'  => $user['role'],
            'name'  => $user['name']
        ]);

        unset($user['password_hash']);
        jsonResponse([
            'token' => $token,
            'user'  => $user
        ], 200, 'Switched to demo ' . $role);
    }
}
