<?php
/**
 * AharLocal - Platform Settings, Categories & Location Calculator
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/geo.php';

class SettingsController {
    public static function getSettings(): void {
        $db = Database::getConnection();
        $stmt = $db->query('SELECT setting_key, setting_value FROM platform_settings');
        $rows = $stmt->fetchAll();

        $map = [];
        foreach ($rows as $row) {
            $map[$row['setting_key']] = $row['setting_value'];
        }

        jsonResponse([
            'global_cod_enabled'                  => (int)($map['global_cod_enabled'] ?? 1),
            'restaurant_commission_percent'       => (float)($map['restaurant_commission_percent'] ?? 15.0),
            'delivery_partner_commission_percent' => (float)($map['delivery_partner_commission_percent'] ?? 10.0),
            'delivery_base_fare'                  => (float)($map['delivery_base_fare'] ?? 25.0),
            'delivery_base_distance_km'           => (float)($map['delivery_base_distance_km'] ?? 2.0),
            'delivery_per_km_rate'                => (float)($map['delivery_per_km_rate'] ?? 10.0),
            'min_delivery_fare'                   => (float)($map['min_delivery_fare'] ?? 20.0)
        ]);
    }

    public static function getCategories(): void {
        $db = Database::getConnection();
        $stmt = $db->query('SELECT * FROM food_categories WHERE is_active = 1 ORDER BY sort_order ASC');
        $categories = $stmt->fetchAll();

        foreach ($categories as &$cat) {
            $cat['id'] = (int)$cat['id'];
            $cat['sort_order'] = (int)$cat['sort_order'];
            $cat['is_active'] = (int)$cat['is_active'];
        }
        unset($cat);

        jsonResponse($categories);
    }

    public static function getPromotions(): void {
        $db = Database::getConnection();
        $stmt = $db->query('SELECT * FROM promotions WHERE is_active = 1 ORDER BY id ASC');
        $promos = $stmt->fetchAll();

        if (empty($promos)) {
            // Default banners
            $promos = [
                [
                    'id'          => 1,
                    'title'       => 'First Order 50% OFF',
                    'title_bn'    => 'প্রথম অর্ডারে ৫০% ছাড়',
                    'subtitle'    => 'Use code PROTHOM50 on checkout',
                    'subtitle_bn' => 'প্রোমো কোড PROTHOM50 ব্যবহার করুন',
                    'code'        => 'PROTHOM50',
                    'image_url'   => 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800'
                ]
            ];
        }

        jsonResponse($promos);
    }

    public static function calculateFare(): void {
        $body = getBody();
        $custLat = !empty($body['customerLat']) ? (float)$body['customerLat'] : null;
        $custLng = !empty($body['customerLng']) ? (float)$body['customerLng'] : null;

        if ($custLat === null || $custLng === null) {
            errorResponse('Customer coordinates required', 400);
        }

        $db = Database::getConnection();
        $restLat = !empty($body['restaurantLat']) ? (float)$body['restaurantLat'] : null;
        $restLng = !empty($body['restaurantLng']) ? (float)$body['restaurantLng'] : null;
        $restName = 'Restaurant';

        if (!empty($body['restaurantId'])) {
            $stmt = $db->prepare('SELECT name, latitude, longitude FROM restaurants WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => (int)$body['restaurantId']]);
            $rest = $stmt->fetch();
            if ($rest) {
                $restLat = (float)$rest['latitude'];
                $restLng = (float)$rest['longitude'];
                $restName = $rest['name'];
            }
        }

        if ($restLat === null || $restLng === null) {
            errorResponse('Restaurant coordinates required', 400);
        }

        $distanceKm = GeoHelper::calculateDistanceKm($restLat, $restLng, $custLat, $custLng);

        // Fetch settings
        $sStmt = $db->query('SELECT setting_key, setting_value FROM platform_settings');
        $sRows = $sStmt->fetchAll();
        $settings = [];
        foreach ($sRows as $sr) {
            $settings[$sr['setting_key']] = $sr['setting_value'];
        }

        $breakdown = GeoHelper::calculateDeliveryFee($distanceKm, $settings);

        jsonResponse(array_merge([
            'restaurantName' => $restName,
            'restaurantLat'  => $restLat,
            'restaurantLng'  => $restLng,
            'customerLat'    => $custLat,
            'customerLng'    => $custLng
        ], $breakdown));
    }
}
