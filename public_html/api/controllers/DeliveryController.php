<?php
/**
 * AharLocal - Delivery Partner Controller
 * Handles rider profile, live location tracking, online toggle, order assignments, earnings & payouts.
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';

class DeliveryController {
    public static function getProfile(): void {
        $user = requireAuth(['delivery', 'admin']);
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM delivery_partners WHERE user_id = :uid LIMIT 1');
        $stmt->execute([':uid' => $user['id']]);
        $dp = $stmt->fetch();

        if (!$dp) {
            // Demo fallback
            $stmt = $db->query('SELECT * FROM delivery_partners ORDER BY id ASC LIMIT 1');
            $dp = $stmt->fetch();
        }

        if (!$dp) {
            errorResponse('Delivery partner profile not found', 404);
        }

        $dp['id'] = (int)$dp['id'];
        $dp['user_id'] = (int)$dp['user_id'];
        $dp['is_online'] = (int)$dp['is_online'];
        $dp['wallet_balance'] = (float)$dp['wallet_balance'];
        $dp['rating'] = (float)$dp['rating'];
        $dp['total_deliveries'] = (int)$dp['total_deliveries'];
        $dp['current_lat'] = $dp['current_lat'] !== null ? (float)$dp['current_lat'] : null;
        $dp['current_lng'] = $dp['current_lng'] !== null ? (float)$dp['current_lng'] : null;

        jsonResponse($dp);
    }

    public static function updateProfile(): void {
        $user = requireAuth(['delivery', 'admin']);
        $body = getBody();
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT id FROM delivery_partners WHERE user_id = :uid LIMIT 1');
        $stmt->execute([':uid' => $user['id']]);
        $dp = $stmt->fetch();

        if (!$dp) {
            errorResponse('Partner profile not found', 404);
        }

        $fields = [
            'name', 'phone', 'address', 'age', 'gender',
            'vehicle_type', 'vehicle_number', 'driving_license_number',
            'aadhaar_number', 'aadhaar_photo', 'passport_photo', 'profile_photo',
            'vehicle_photo', 'payment_method', 'upi_id', 'upi_qr_photo',
            'bank_name', 'bank_account_no', 'bank_account_holder', 'bank_ifsc', 'bank_passbook_photo'
        ];

        $updates = [];
        $params = [':id' => $dp['id']];

        foreach ($fields as $field) {
            if (isset($body[$field])) {
                $updates[] = "`{$field}` = :{$field}";
                $params[":{$field}"] = $body[$field];
            }
        }

        if (!empty($updates)) {
            $sql = 'UPDATE delivery_partners SET ' . implode(', ', $updates) . ' WHERE id = :id';
            $up = $db->prepare($sql);
            $up->execute($params);
        }

        self::getProfile();
    }

    public static function setStatus(): void {
        $user = requireAuth(['delivery', 'admin']);
        $body = getBody();
        $isOnline = !empty($body['is_online']) ? 1 : 0;
        $db = Database::getConnection();

        $stmt = $db->prepare('UPDATE delivery_partners SET is_online = :online WHERE user_id = :uid');
        $stmt->execute([':online' => $isOnline, ':uid' => $user['id']]);

        jsonResponse([
            'is_online' => $isOnline
        ], 200, $isOnline ? 'You are now ONLINE (আপনি এখন অনলাইন আছেন)' : 'You are now OFFLINE (আপনি এখন অফলাইন আছেন)');
    }

    public static function updateLocation(): void {
        $user = requireAuth(['delivery', 'admin']);
        $body = getBody();
        $lat = (float)($body['lat'] ?? $body['latitude'] ?? 0);
        $lng = (float)($body['lng'] ?? $body['longitude'] ?? 0);

        if (!$lat || !$lng) {
            errorResponse('Valid latitude and longitude required', 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('UPDATE delivery_partners SET current_lat = :lat, current_lng = :lng, last_location_updated_at = NOW() WHERE user_id = :uid');
        $stmt->execute([':lat' => $lat, ':lng' => $lng, ':uid' => $user['id']]);

        jsonResponse(['success' => true]);
    }

    public static function acceptOrder(int $id): void {
        $user = requireAuth(['delivery', 'admin']);
        $db = Database::getConnection();

        $dpStmt = $db->prepare('SELECT * FROM delivery_partners WHERE user_id = :uid LIMIT 1');
        $dpStmt->execute([':uid' => $user['id']]);
        $dp = $dpStmt->fetch();

        if (!$dp) {
            errorResponse('Delivery partner profile not found', 404);
        }

        $up = $db->prepare('
            UPDATE orders 
            SET delivery_partner_id = :dpid, 
                delivery_partner_name = :dpname,
                delivery_partner_phone = :dpphone,
                status = "assigned",
                rider_accepted = 1,
                rider_accepted_at = NOW()
            WHERE id = :id
        ');
        $up->execute([
            ':dpid'    => $dp['id'],
            ':dpname'  => $dp['name'],
            ':dpphone' => $dp['phone'],
            ':id'      => $id
        ]);

        jsonResponse(['success' => true], 200, 'Order accepted! Please head to restaurant (অর্ডার গ্রহণ করা হয়েছে)');
    }

    public static function declineOrder(int $id): void {
        requireAuth(['delivery', 'admin']);
        $db = Database::getConnection();

        $up = $db->prepare('UPDATE orders SET delivery_partner_id = NULL, rider_accepted = 0 WHERE id = :id');
        $up->execute([':id' => $id]);

        jsonResponse(['success' => true], 200, 'Order declined');
    }

    public static function getEarnings(): void {
        $user = requireAuth(['delivery', 'admin']);
        $db = Database::getConnection();

        $dpStmt = $db->prepare('SELECT * FROM delivery_partners WHERE user_id = :uid LIMIT 1');
        $dpStmt->execute([':uid' => $user['id']]);
        $dp = $dpStmt->fetch() ?: ['wallet_balance' => 840, 'total_deliveries' => 25];

        $todayDeliveries = 4;
        $todayEarnings = 320.0;
        $weeklyEarnings = 2450.0;

        jsonResponse([
            'wallet_balance'   => (float)$dp['wallet_balance'],
            'total_deliveries' => (int)$dp['total_deliveries'],
            'todayDeliveries'  => $todayDeliveries,
            'todayEarnings'    => $todayEarnings,
            'weeklyEarnings'   => $weeklyEarnings
        ]);
    }

    public static function requestPayout(): void {
        $user = requireAuth(['delivery', 'restaurant', 'admin']);
        $body = getBody();
        $amount = (float)($body['amount'] ?? 0);

        if ($amount <= 0) {
            errorResponse('Valid payout amount required', 400);
        }

        $db = Database::getConnection();
        $ins = $db->prepare('
            INSERT INTO payout_requests (user_id, role, amount, method, upi_id, bank_account_no, bank_ifsc, bank_name, status)
            VALUES (:uid, :role, :amt, :meth, :upi, :ac, :ifsc, :bname, "pending")
        ');

        $ins->execute([
            ':uid'   => $user['id'],
            ':role'  => $user['role'],
            ':amt'   => $amount,
            ':meth'  => $body['method'] ?? 'upi',
            ':upi'   => $body['upi_id'] ?? null,
            ':ac'    => $body['bank_account_no'] ?? null,
            ':ifsc'  => $body['bank_ifsc'] ?? null,
            ':bname' => $body['bank_name'] ?? null
        ]);

        jsonResponse([
            'success'   => true,
            'payout_id' => (int)$db->lastInsertId()
        ], 201, 'Payout request submitted successfully (টাকা উত্তোলনের অনুরোধ জমা পড়েছে)');
    }

    public static function savePayoutMethod(): void {
        $user = requireAuth(['delivery', 'admin']);
        $body = getBody();
        $db = Database::getConnection();

        $stmt = $db->prepare('
            UPDATE delivery_partners
            SET payment_method = :meth, upi_id = :upi, upi_qr_photo = :uqr,
                bank_name = :bname, bank_account_no = :ac, bank_account_holder = :holder,
                bank_ifsc = :ifsc, bank_passbook_photo = :passbook
            WHERE user_id = :uid
        ');

        $stmt->execute([
            ':meth'     => $body['payment_method'] ?? 'upi',
            ':upi'      => $body['upi_id'] ?? null,
            ':uqr'      => $body['upi_qr_photo'] ?? null,
            ':bname'    => $body['bank_name'] ?? null,
            ':ac'       => $body['bank_account_no'] ?? null,
            ':holder'   => $body['bank_account_holder'] ?? null,
            ':ifsc'     => $body['bank_ifsc'] ?? null,
            ':passbook' => $body['bank_passbook_photo'] ?? null,
            ':uid'      => $user['id']
        ]);

        jsonResponse(['success' => true], 200, 'Payout preferences saved (পেমেন্ট তথ্য সেভ হয়েছে)');
    }
}
