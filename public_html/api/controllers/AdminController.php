<?php
/**
 * AharLocal - Admin Controller
 * Covers Dashboard Analytics, Restaurant & Partner Approvals, Escrow Settlements,
 * Location Radius Ranking Rules (Admin Pin Radius Top 5), and Geofence Boundaries.
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/geo.php';
require_once __DIR__ . '/../middleware/auth.php';

class AdminController {
    public static function dashboard(): void {
        requireAuth(['admin']);
        $db = Database::getConnection();

        // Customer counts
        $custStmt = $db->query('SELECT COUNT(*) FROM users WHERE role = "customer"');
        $totalCustomers = (int)$custStmt->fetchColumn();

        // Restaurant counts
        $restStmt = $db->query('
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = "approved" THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending
            FROM restaurants
        ');
        $restCounts = $restStmt->fetch();

        // Delivery partner counts
        $dpStmt = $db->query('
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_online = 1 THEN 1 ELSE 0 END) as online,
                SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending
            FROM delivery_partners
        ');
        $dpCounts = $dpStmt->fetch();

        // Orders metrics
        $ordStmt = $db->query('
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status IN ("pending", "accepted", "preparing", "ready", "assigned", "picked_up", "on_the_way") THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = "delivered" THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = "cancelled" THEN 1 ELSE 0 END) as cancelled,
                COALESCE(SUM(subtotal), 0) as gross_sales,
                COALESCE(SUM(grand_total), 0) as total_revenue
            FROM orders
        ');
        $ordCounts = $ordStmt->fetch();

        // Estimated platform commission
        $grossSales = (float)$ordCounts['gross_sales'];
        $platformCommission = round($grossSales * 0.15, 2);

        // Recent orders
        $recentStmt = $db->query('SELECT * FROM orders ORDER BY id DESC LIMIT 10');
        $recentOrders = $recentStmt->fetchAll();
        foreach ($recentOrders as &$ro) {
            $ro['id'] = (int)$ro['id'];
            $ro['subtotal'] = (float)$ro['subtotal'];
            $ro['grand_total'] = (float)$ro['grand_total'];
            $ro['items'] = json_decode($ro['items_json'], true) ?: [];
        }
        unset($ro);

        // Service areas
        $saStmt = $db->query('SELECT * FROM service_areas ORDER BY id ASC');
        $serviceAreas = $saStmt->fetchAll();
        foreach ($serviceAreas as &$sa) {
            $sa['polygon'] = !empty($sa['polygon_json']) ? json_decode($sa['polygon_json'], true) : [];
        }
        unset($sa);

        jsonResponse([
            'metrics' => [
                'totalCustomers'      => $totalCustomers,
                'totalRestaurants'    => (int)$restCounts['total'],
                'approvedRestaurants' => (int)($restCounts['approved'] ?? 0),
                'pendingRestaurants'  => (int)($restCounts['pending'] ?? 0),
                'totalPartners'       => (int)$dpCounts['total'],
                'onlinePartners'      => (int)($dpCounts['online'] ?? 0),
                'pendingPartners'     => (int)($dpCounts['pending'] ?? 0),
                'totalOrders'         => (int)$ordCounts['total'],
                'activeOrders'        => (int)($ordCounts['active'] ?? 0),
                'completedOrders'     => (int)($ordCounts['completed'] ?? 0),
                'cancelledOrders'     => (int)($ordCounts['cancelled'] ?? 0),
                'grossSales'          => $grossSales,
                'totalRevenue'        => (float)$ordCounts['total_revenue'],
                'platformCommission'  => $platformCommission
            ],
            'recentOrders' => $recentOrders,
            'serviceAreas' => $serviceAreas
        ]);
    }

    public static function getRestaurants(): void {
        requireAuth(['admin']);
        $db = Database::getConnection();

        $sql = '
            SELECT 
                r.*,
                u.name as u_name, u.email as u_email, u.phone as u_phone,
                u.profile_photo as u_photo, u.passport_photo as u_passport
            FROM restaurants r
            LEFT JOIN users u ON r.user_id = u.id
            ORDER BY r.id DESC
        ';
        $stmt = $db->query($sql);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$r) {
            $r['id'] = (int)$r['id'];
            $r['latitude'] = (float)$r['latitude'];
            $r['longitude'] = (float)$r['longitude'];
            $r['rating'] = (float)$r['rating'];
            $r['commission_rate'] = (float)$r['commission_rate'];
            $r['is_open'] = (int)$r['is_open'];
            $r['photos'] = !empty($r['photos_json']) ? json_decode($r['photos_json'], true) : array_filter([$r['banner_url'], $r['photo_url']]);
            $r['cuisine_types'] = !empty($r['cuisine_types_json']) ? json_decode($r['cuisine_types_json'], true) : [];
            $r['settlements'] = !empty($r['settlements_json']) ? json_decode($r['settlements_json'], true) : [];

            // Owner info
            $r['owner_photo'] = $r['u_photo'] ?? $r['u_passport'] ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
            $r['owner_phone'] = $r['phone'] ?: $r['u_phone'];
            $r['owner_email'] = $r['email'] ?: $r['u_email'];

            // Menu count
            $mStmt = $db->prepare('SELECT COUNT(*) FROM foods WHERE restaurant_id = :rid');
            $mStmt->execute([':rid' => $r['id']]);
            $r['menu_count'] = (int)$mStmt->fetchColumn();
        }
        unset($r);

        jsonResponse($rows);
    }

    public static function settleRestaurant(int $id): void {
        requireAuth(['admin']);
        $body = getBody();
        $amount = (float)($body['amount'] ?? 0);

        if ($amount <= 0) {
            errorResponse('Valid settlement amount required', 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM restaurants WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $rest = $stmt->fetch();

        if (!$rest) {
            errorResponse('Restaurant not found', 404);
        }

        $settlements = !empty($rest['settlements_json']) ? json_decode($rest['settlements_json'], true) : [];
        $record = [
            'id'             => count($settlements) + 1,
            'amount'         => $amount,
            'method'         => $body['method'] ?? $rest['payment_method'] ?? 'upi',
            'transaction_id' => $body['transaction_id'] ?? ('SETTLE-REST-' . time()),
            'remarks'        => $body['remarks'] ?? 'Platform payout settlement to restaurant',
            'recipient'      => $rest['name'],
            'upi_id'         => $rest['upi_id'],
            'bank_name'      => $rest['bank_name'],
            'bank_account_no'=> $rest['bank_account_no'],
            'status'         => 'completed',
            'created_at'     => date('Y-m-d H:i:s')
        ];

        array_unshift($settlements, $record);

        $up = $db->prepare('UPDATE restaurants SET settlements_json = :sjson WHERE id = :id');
        $up->execute([':sjson' => json_encode($settlements), ':id' => $id]);

        // Send in-app notification to restaurant
        $notif = $db->prepare('INSERT INTO notifications (user_id, role, title, title_bn, message, message_bn, type) VALUES (:uid, "restaurant", :t, :tb, :m, :mb, "admin_alert")');
        $notif->execute([
            ':uid' => $rest['user_id'],
            ':t'   => 'Payout Settled (টাকা প্রদান সম্পন্ন)',
            ':tb'  => 'রেস্তোরাঁর পেমেন্ট সেটেলমেন্ট সম্পন্ন হয়েছে',
            ':m'   => "Admin has settled ₹{$amount} to your payout account. Ref: {$record['transaction_id']}",
            ':mb'  => "অ্যাডমিন আপনার অ্যাকাউন্টে ₹{$amount} টাকা পাঠিয়েছেন। রেফারেন্স: {$record['transaction_id']}"
        ]);

        jsonResponse($record, 200, "Successfully settled ₹{$amount} to {$rest['name']}");
    }

    public static function updateRestaurantStatus(int $id): void {
        requireAuth(['admin']);
        $body = getBody();
        $db = Database::getConnection();

        $status = $body['status'] ?? null;
        $rate   = isset($body['commission_rate']) ? (float)$body['commission_rate'] : null;

        $updates = [];
        $params = [':id' => $id];

        if ($status) {
            $updates[] = 'status = :st';
            $params[':st'] = $status;
        }

        if ($rate !== null) {
            $updates[] = 'commission_rate = :crate';
            $params[':crate'] = $rate;
        }

        if (!empty($updates)) {
            $sql = 'UPDATE restaurants SET ' . implode(', ', $updates) . ' WHERE id = :id';
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
        }

        jsonResponse(['success' => true], 200, 'Restaurant status updated');
    }

    public static function blockRestaurant(int $id): void {
        requireAuth(['admin']);
        $db = Database::getConnection();

        $stmt = $db->prepare('UPDATE restaurants SET status = IF(status = "blocked", "approved", "blocked") WHERE id = :id');
        $stmt->execute([':id' => $id]);

        jsonResponse(['success' => true]);
    }

    // Delivery Partner operations
    public static function getDeliveryPartners(): void {
        requireAuth(['admin']);
        $db = Database::getConnection();

        $stmt = $db->query('SELECT * FROM delivery_partners ORDER BY id DESC');
        $rows = $stmt->fetchAll();

        foreach ($rows as &$dp) {
            $dp['id'] = (int)$dp['id'];
            $dp['is_online'] = (int)$dp['is_online'];
            $dp['wallet_balance'] = (float)$dp['wallet_balance'];
            $dp['rating'] = (float)$dp['rating'];
            $dp['total_deliveries'] = (int)$dp['total_deliveries'];
        }
        unset($dp);

        jsonResponse($rows);
    }

    public static function updateDeliveryPartnerStatus(int $id): void {
        requireAuth(['admin']);
        $body = getBody();
        $status = $body['status'] ?? 'approved';

        $db = Database::getConnection();
        $stmt = $db->prepare('UPDATE delivery_partners SET status = :st WHERE id = :id');
        $stmt->execute([':st' => $status, ':id' => $id]);

        jsonResponse(['success' => true]);
    }

    public static function blockDeliveryPartner(int $id): void {
        requireAuth(['admin']);
        $db = Database::getConnection();

        $stmt = $db->prepare('UPDATE delivery_partners SET status = IF(status = "blocked", "approved", "blocked") WHERE id = :id');
        $stmt->execute([':id' => $id]);

        jsonResponse(['success' => true]);
    }

    // Customer COD & Account Blocking
    public static function toggleCustomerCod(int $id): void {
        requireAuth(['admin']);
        $body = getBody();
        $db = Database::getConnection();

        $cod = !empty($body['cod_enabled']) ? 1 : 0;
        $stmt = $db->prepare('UPDATE users SET cod_enabled = :cod WHERE id = :id AND role = "customer"');
        $stmt->execute([':cod' => $cod, ':id' => $id]);

        jsonResponse(['success' => true]);
    }

    public static function blockCustomer(int $id): void {
        requireAuth(['admin']);
        $db = Database::getConnection();

        $stmt = $db->prepare('UPDATE users SET status = IF(status = "blocked", "active", "blocked") WHERE id = :id');
        $stmt->execute([':id' => $id]);

        jsonResponse(['success' => true]);
    }

    // Rates & Platform Settings
    public static function updateRates(): void {
        requireAuth(['admin']);
        $body = getBody();
        $db = Database::getConnection();

        $keys = [
            'restaurant_commission_percent',
            'delivery_partner_commission_percent',
            'delivery_base_fare',
            'delivery_base_distance_km',
            'delivery_per_km_rate',
            'min_delivery_fare'
        ];

        $ins = $db->prepare('
            INSERT INTO platform_settings (setting_key, setting_value)
            VALUES (:k, :v)
            ON DUPLICATE KEY UPDATE setting_value = :v
        ');

        foreach ($keys as $key) {
            if (isset($body[$key])) {
                $ins->execute([':k' => $key, ':v' => (string)$body[$key]]);
            }
        }

        jsonResponse(['success' => true], 200, 'Rates updated successfully');
    }

    public static function toggleGlobalCod(): void {
        requireAuth(['admin']);
        $body = getBody();
        $enabled = !empty($body['global_cod_enabled']) ? '1' : '0';

        $db = Database::getConnection();
        $stmt = $db->prepare('
            INSERT INTO platform_settings (setting_key, setting_value)
            VALUES ("global_cod_enabled", :val)
            ON DUPLICATE KEY UPDATE setting_value = :val
        ');
        $stmt->execute([':val' => $enabled]);

        jsonResponse(['success' => true]);
    }

    // Escrow Management
    public static function escrowSettle(int $orderId): void {
        requireAuth(['admin']);
        $db = Database::getConnection();

        $stmt = $db->prepare('UPDATE orders SET escrow_status = "settled", settled_at = NOW() WHERE id = :id');
        $stmt->execute([':id' => $orderId]);

        jsonResponse(['success' => true], 200, "Order #{$orderId} escrow settled");
    }

    public static function escrowSettleAll(): void {
        requireAuth(['admin']);
        $db = Database::getConnection();

        $stmt = $db->query('
            UPDATE orders 
            SET escrow_status = "settled", settled_at = NOW() 
            WHERE escrow_status IN ("holding", "matured") AND status = "delivered"
        ');

        jsonResponse(['success' => true], 200, 'All matured orders settled');
    }

    public static function escrowRefund(int $orderId): void {
        requireAuth(['admin']);
        $body = getBody();
        $reason = $body['reason'] ?? 'Admin refund';
        $amount = (float)($body['amount'] ?? 0);

        $db = Database::getConnection();
        $stmt = $db->prepare('
            UPDATE orders 
            SET escrow_status = "refunded", refunded_at = NOW(), refund_amount = :amt, refund_reason = :reason, payment_status = "refunded"
            WHERE id = :id
        ');
        $stmt->execute([':amt' => $amount, ':reason' => $reason, ':id' => $orderId]);

        jsonResponse(['success' => true], 200, "Order #{$orderId} refunded");
    }

    public static function escrowDispute(int $orderId): void {
        requireAuth(['admin']);
        $body = getBody();
        $action = $body['action'] ?? 'resolve';

        $db = Database::getConnection();
        if ($action === 'refund') {
            self::escrowRefund($orderId);
            return;
        }

        $stmt = $db->prepare('UPDATE orders SET escrow_status = "settled", settled_at = NOW() WHERE id = :id');
        $stmt->execute([':id' => $orderId]);

        jsonResponse(['success' => true], 200, "Dispute resolved and funds released");
    }

    // Location Radius Ranking Rules (Admin Pin Radius Top 5 Rankings)
    public static function getLocationRankings(): void {
        requireAuth(['admin']);
        $db = Database::getConnection();

        $stmt = $db->query('SELECT * FROM location_rankings ORDER BY id DESC');
        $rows = $stmt->fetchAll();

        foreach ($rows as &$r) {
            $r['id'] = (int)$r['id'];
            $r['lat'] = (float)$r['lat'];
            $r['lng'] = (float)$r['lng'];
            $r['radius_km'] = (float)$r['radius_km'];
            $r['is_active'] = (int)$r['is_active'];
            $r['rankings'] = !empty($r['rankings_json']) ? json_decode($r['rankings_json'], true) : [];
        }
        unset($r);

        jsonResponse($rows);
    }

    public static function saveLocationRanking(): void {
        requireAuth(['admin']);
        $body = getBody();
        $db = Database::getConnection();

        $id       = !empty($body['id']) ? (int)$body['id'] : null;
        $name     = trim($body['name'] ?? 'Custom Ranking Area');
        $nameBn   = trim($body['name_bn'] ?? $name);
        $lat      = (float)($body['lat'] ?? 22.5400);
        $lng      = (float)($body['lng'] ?? 88.3600);
        $radiusKm = (float)($body['radius_km'] ?? 2.5);
        $isActive = isset($body['is_active']) ? (!empty($body['is_active']) ? 1 : 0) : 1;
        $rankings = $body['rankings'] ?? [];

        $rankingsJson = json_encode($rankings);

        if ($id) {
            // Update
            $stmt = $db->prepare('
                UPDATE location_rankings
                SET name = :name, name_bn = :nbn, lat = :lat, lng = :lng, radius_km = :rad, is_active = :act, rankings_json = :rjson
                WHERE id = :id
            ');
            $stmt->execute([
                ':name' => $name,
                ':nbn'  => $nameBn,
                ':lat'  => $lat,
                ':lng'  => $lng,
                ':rad'  => $radiusKm,
                ':act'  => $isActive,
                ':rjson'=> $rankingsJson,
                ':id'   => $id
            ]);
            $savedId = $id;
        } else {
            // Insert
            $stmt = $db->prepare('
                INSERT INTO location_rankings (name, name_bn, lat, lng, radius_km, is_active, rankings_json)
                VALUES (:name, :nbn, :lat, :lng, :rad, :act, :rjson)
            ');
            $stmt->execute([
                ':name' => $name,
                ':nbn'  => $nameBn,
                ':lat'  => $lat,
                ':lng'  => $lng,
                ':rad'  => $radiusKm,
                ':act'  => $isActive,
                ':rjson'=> $rankingsJson
            ]);
            $savedId = (int)$db->lastInsertId();
        }

        $fetch = $db->prepare('SELECT * FROM location_rankings WHERE id = :id');
        $fetch->execute([':id' => $savedId]);
        $rule = $fetch->fetch();
        $rule['id'] = (int)$rule['id'];
        $rule['lat'] = (float)$rule['lat'];
        $rule['lng'] = (float)$rule['lng'];
        $rule['radius_km'] = (float)$rule['radius_km'];
        $rule['is_active'] = (int)$rule['is_active'];
        $rule['rankings'] = json_decode($rule['rankings_json'], true) ?: [];

        jsonResponse($rule, 200, "Location radius ranking rule '{$rule['name']}' saved successfully!");
    }

    public static function deleteLocationRanking(int $id): void {
        requireAuth(['admin']);
        $db = Database::getConnection();

        $stmt = $db->prepare('DELETE FROM location_rankings WHERE id = :id');
        $stmt->execute([':id' => $id]);

        jsonResponse(['success' => true], 200, 'Location radius ranking rule deleted successfully');
    }

    public static function toggleLocationRanking(int $id): void {
        requireAuth(['admin']);
        $db = Database::getConnection();

        $stmt = $db->prepare('UPDATE location_rankings SET is_active = IF(is_active = 1, 0, 1) WHERE id = :id');
        $stmt->execute([':id' => $id]);

        jsonResponse(['success' => true]);
    }

    // Service Area Geofence Polygon CRUD
    public static function saveServiceArea(): void {
        requireAuth(['admin']);
        $body = getBody();
        $db = Database::getConnection();

        $id          = !empty($body['id']) ? (int)$body['id'] : null;
        $name        = trim($body['name'] ?? 'New Service Zone');
        $nameBn      = trim($body['name_bn'] ?? $name);
        $minDelivery = (float)($body['min_delivery_charge'] ?? 25.0);
        $perKm       = (float)($body['per_km_charge'] ?? 8.0);
        $polygon     = $body['polygon'] ?? [];
        $polygonJson = json_encode($polygon);

        if ($id) {
            $stmt = $db->prepare('
                UPDATE service_areas
                SET name = :name, name_bn = :nbn, min_delivery_charge = :min, per_km_charge = :pkm, polygon_json = :poly
                WHERE id = :id
            ');
            $stmt->execute([
                ':name' => $name,
                ':nbn'  => $nameBn,
                ':min'  => $minDelivery,
                ':pkm'  => $perKm,
                ':poly' => $polygonJson,
                ':id'   => $id
            ]);
            $savedId = $id;
        } else {
            $stmt = $db->prepare('
                INSERT INTO service_areas (name, name_bn, min_delivery_charge, per_km_charge, is_active, polygon_json)
                VALUES (:name, :nbn, :min, :pkm, 1, :poly)
            ');
            $stmt->execute([
                ':name' => $name,
                ':nbn'  => $nameBn,
                ':min'  => $minDelivery,
                ':pkm'  => $perKm,
                ':poly' => $polygonJson
            ]);
            $savedId = (int)$db->lastInsertId();
        }

        jsonResponse(['id' => $savedId, 'name' => $name, 'polygon' => $polygon], 200, 'Service area geofence boundary saved');
    }

    public static function toggleServiceArea(int $id): void {
        requireAuth(['admin']);
        $db = Database::getConnection();

        $stmt = $db->prepare('UPDATE service_areas SET is_active = IF(is_active = 1, 0, 1) WHERE id = :id');
        $stmt->execute([':id' => $id]);

        jsonResponse(['success' => true]);
    }

    public static function deleteServiceArea(int $id): void {
        requireAuth(['admin']);
        $db = Database::getConnection();

        $stmt = $db->prepare('DELETE FROM service_areas WHERE id = :id');
        $stmt->execute([':id' => $id]);

        jsonResponse(['success' => true]);
    }
}
