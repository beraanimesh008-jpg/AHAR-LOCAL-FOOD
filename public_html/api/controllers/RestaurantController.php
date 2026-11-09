<?php
/**
 * AharLocal - Restaurant Controller
 * Handles restaurant directory, search, ranking by radius/boundary, menu management, and stock status.
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/geo.php';
require_once __DIR__ . '/../middleware/auth.php';

class RestaurantController {
    public static function getAll(): void {
        $db = Database::getConnection();
        $search   = trim($_GET['search'] ?? '');
        $vegOnly  = ($_GET['vegOnly'] ?? '') === 'true' || ($_GET['vegOnly'] ?? '') === '1';
        $reqLat   = !empty($_GET['lat']) ? (float)$_GET['lat'] : null;
        $reqLng   = !empty($_GET['lng']) ? (float)$_GET['lng'] : null;
        $areaId   = !empty($_GET['service_area_id']) ? (int)$_GET['service_area_id'] : null;

        $sql = 'SELECT * FROM restaurants WHERE status = "approved" AND is_active = 1';
        $params = [];

        if ($vegOnly) {
            $sql .= ' AND is_pure_veg = 1';
        }

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $restaurants = $stmt->fetchAll();

        // Decode JSON fields
        foreach ($restaurants as &$r) {
            $r['id'] = (int)$r['id'];
            $r['latitude'] = (float)$r['latitude'];
            $r['longitude'] = (float)$r['longitude'];
            $r['rating'] = (float)$r['rating'];
            $r['rating_count'] = (int)$r['rating_count'];
            $r['is_open'] = (int)$r['is_open'];
            $r['is_pure_veg'] = (int)$r['is_pure_veg'];
            $r['self_delivery_enabled'] = (int)$r['self_delivery_enabled'];
            $r['commission_rate'] = (float)$r['commission_rate'];
            $r['min_order_amount'] = (float)$r['min_order_amount'];
            $r['avg_delivery_minutes'] = (int)$r['avg_delivery_minutes'];

            if (!empty($r['cuisine_types_json'])) {
                $r['cuisine_types'] = json_decode($r['cuisine_types_json'], true) ?: [];
            } else {
                $r['cuisine_types'] = ['Bengali', 'Biryani'];
            }

            if (!empty($r['photos_json'])) {
                $r['photos'] = json_decode($r['photos_json'], true) ?: [];
            } else {
                $r['photos'] = array_filter([$r['banner_url'], $r['photo_url']]);
            }
        }
        unset($r);

        // Filter by search query across restaurant name, cuisines, and food items
        if (!empty($search)) {
            $searchLower = mb_strtolower($search);
            $tokens = preg_split('/\s+/', $searchLower);

            // Fetch all foods for matching
            $foodStmt = $db->query('SELECT restaurant_id, name, name_bn, category, description FROM foods');
            $allFoods = $foodStmt->fetchAll();

            $matchingRestIds = [];
            foreach ($allFoods as $f) {
                $foodText = mb_strtolower($f['name'] . ' ' . $f['name_bn'] . ' ' . $f['category'] . ' ' . ($f['description'] ?? ''));
                foreach ($tokens as $token) {
                    if (str_contains($foodText, $token)) {
                        $matchingRestIds[(int)$f['restaurant_id']] = true;
                        break;
                    }
                }
            }

            $restaurants = array_values(array_filter($restaurants, function($r) use ($tokens, $matchingRestIds) {
                if (isset($matchingRestIds[$r['id']])) {
                    return true;
                }
                $rText = mb_strtolower($r['name'] . ' ' . $r['name_bn'] . ' ' . $r['address'] . ' ' . implode(' ', $r['cuisine_types']));
                foreach ($tokens as $token) {
                    if (str_contains($rText, $token)) {
                        return true;
                    }
                }
                return false;
            }));
        }

        // Apply Location Radius Ranking Rules (Top 1..5)
        $rankMap = [];

        if ($reqLat !== null && $reqLng !== null) {
            $rankStmt = $db->query('SELECT * FROM location_rankings WHERE is_active = 1');
            $rules = $rankStmt->fetchAll();

            $matchedRule = null;
            $closestDist = PHP_FLOAT_MAX;

            foreach ($rules as $rule) {
                $ruleLat = (float)$rule['lat'];
                $ruleLng = (float)$rule['lng'];
                $radius  = (float)$rule['radius_km'];

                $dist = GeoHelper::calculateDistanceKm($reqLat, $reqLng, $ruleLat, $ruleLng);
                if ($dist <= $radius && $dist < $closestDist) {
                    $closestDist = $dist;
                    $matchedRule = $rule;
                }
            }

            if ($matchedRule && !empty($matchedRule['rankings_json'])) {
                $rankings = json_decode($matchedRule['rankings_json'], true) ?: [];
                foreach ($rankings as $rk) {
                    if (!empty($rk['restaurant_id']) && !empty($rk['rank'])) {
                        $rankMap[(int)$rk['restaurant_id']] = (int)$rk['rank'];
                    }
                }
            }
        }

        // Attach display_rank and sort
        foreach ($restaurants as &$r) {
            $r['display_rank'] = $rankMap[$r['id']] ?? null;
        }
        unset($r);

        usort($restaurants, function($a, $b) {
            $rankA = $a['display_rank'] ?? 999;
            $rankB = $b['display_rank'] ?? 999;
            return $rankA <=> $rankB;
        });

        jsonResponse($restaurants);
    }

    public static function getAllFoods(): void {
        $db = Database::getConnection();
        $search  = trim($_GET['search'] ?? '');
        $vegOnly = ($_GET['vegOnly'] ?? '') === 'true' || ($_GET['vegOnly'] ?? '') === '1';

        $sql = '
            SELECT 
                f.*, 
                r.id as r_id, r.name as r_name, r.name_bn as r_name_bn, r.address as r_address,
                r.latitude as r_latitude, r.longitude as r_longitude, r.is_open as r_is_open,
                r.rating as r_rating, r.rating_count as r_rating_count, r.photo_url as r_photo_url
            FROM foods f
            JOIN restaurants r ON f.restaurant_id = r.id
            WHERE r.status = "approved" AND r.is_active = 1
        ';

        if ($vegOnly) {
            $sql .= ' AND f.is_veg = 1';
        }

        $stmt = $db->query($sql);
        $rows = $stmt->fetchAll();

        $results = [];
        foreach ($rows as $row) {
            $food = [
                'id'                  => (int)$row['id'],
                'restaurant_id'       => (int)$row['restaurant_id'],
                'category'            => $row['category'],
                'category_bn'         => $row['category_bn'],
                'name'                => $row['name'],
                'name_bn'             => $row['name_bn'],
                'description'         => $row['description'],
                'description_bn'      => $row['description_bn'],
                'price'               => (float)$row['price'],
                'discount_price'      => $row['discount_price'] !== null ? (float)$row['discount_price'] : null,
                'photo_url'           => $row['photo_url'],
                'is_veg'              => (int)$row['is_veg'],
                'is_available'        => (int)$row['is_available'],
                'is_recommended'      => (int)$row['is_recommended'],
                'preparation_minutes' => (int)$row['preparation_minutes']
            ];

            $restaurant = [
                'id'           => (int)$row['r_id'],
                'name'         => $row['r_name'],
                'name_bn'      => $row['r_name_bn'],
                'address'      => $row['r_address'],
                'latitude'     => (float)$row['r_latitude'],
                'longitude'    => (float)$row['r_longitude'],
                'is_open'      => (int)$row['r_is_open'],
                'rating'       => (float)$row['r_rating'],
                'rating_count' => (int)$row['r_rating_count'],
                'photo_url'    => $row['r_photo_url']
            ];

            if (!empty($search)) {
                $text = mb_strtolower($food['name'] . ' ' . $food['name_bn'] . ' ' . $food['category'] . ' ' . $restaurant['name']);
                if (!str_contains($text, mb_strtolower($search))) {
                    continue;
                }
            }

            $results[] = [
                'food'       => $food,
                'restaurant' => $restaurant
            ];
        }

        jsonResponse($results);
    }

    public static function getById(int $id): void {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM restaurants WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $restaurant = $stmt->fetch();

        if (!$restaurant) {
            errorResponse('Restaurant not found (রেস্তোরাঁ পাওয়া যায়নি)', 404);
        }

        $restaurant['id'] = (int)$restaurant['id'];
        $restaurant['latitude'] = (float)$restaurant['latitude'];
        $restaurant['longitude'] = (float)$restaurant['longitude'];
        $restaurant['rating'] = (float)$restaurant['rating'];
        $restaurant['is_open'] = (int)$restaurant['is_open'];
        $restaurant['is_pure_veg'] = (int)$restaurant['is_pure_veg'];
        $restaurant['self_delivery_enabled'] = (int)$restaurant['self_delivery_enabled'];

        if (!empty($restaurant['photos_json'])) {
            $restaurant['photos'] = json_decode($restaurant['photos_json'], true) ?: [];
        } else {
            $restaurant['photos'] = array_filter([$restaurant['banner_url'], $restaurant['photo_url']]);
        }

        if (!empty($restaurant['cuisine_types_json'])) {
            $restaurant['cuisine_types'] = json_decode($restaurant['cuisine_types_json'], true) ?: [];
        }

        // Fetch Menu Items
        $menuStmt = $db->prepare('SELECT * FROM foods WHERE restaurant_id = :rid ORDER BY id ASC');
        $menuStmt->execute([':rid' => $id]);
        $menu = $menuStmt->fetchAll();

        foreach ($menu as &$item) {
            $item['id'] = (int)$item['id'];
            $item['restaurant_id'] = (int)$item['restaurant_id'];
            $item['price'] = (float)$item['price'];
            $item['discount_price'] = $item['discount_price'] !== null ? (float)$item['discount_price'] : null;
            $item['is_veg'] = (int)$item['is_veg'];
            $item['is_available'] = (int)$item['is_available']; // 1 = In Stock (Green), 0 = Out of Stock (Red)
            $item['is_recommended'] = (int)$item['is_recommended'];
            $item['preparation_minutes'] = (int)$item['preparation_minutes'];
        }
        unset($item);

        $restaurant['menu'] = $menu;
        jsonResponse($restaurant);
    }

    public static function getMyCurrent(): void {
        $user = requireAuth(['restaurant', 'admin']);
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM restaurants WHERE user_id = :uid LIMIT 1');
        $stmt->execute([':uid' => $user['id']]);
        $restaurant = $stmt->fetch();

        if (!$restaurant) {
            // Fallback for admin or demo
            $stmt = $db->query('SELECT * FROM restaurants ORDER BY id ASC LIMIT 1');
            $restaurant = $stmt->fetch();
        }

        if (!$restaurant) {
            errorResponse('No restaurant profile associated with this account', 404);
        }

        self::getById((int)$restaurant['id']);
    }

    public static function update(int $id): void {
        $user = requireAuth(['restaurant', 'admin']);
        $body = getBody();
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM restaurants WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $restaurant = $stmt->fetch();

        if (!$restaurant) {
            errorResponse('Restaurant not found', 404);
        }

        // Verify ownership if role is restaurant
        if ($user['role'] === 'restaurant' && (int)$restaurant['user_id'] !== (int)$user['id']) {
            // allow if it's the only one owned by user
            $userRest = $db->prepare('SELECT id FROM restaurants WHERE user_id = :uid LIMIT 1');
            $userRest->execute([':uid' => $user['id']]);
            $ur = $userRest->fetch();
            if ($ur && (int)$ur['id'] !== $id) {
                errorResponse('Not authorized to edit this restaurant', 403);
            }
        }

        $fields = [
            'name', 'name_bn', 'owner_name', 'phone', 'email', 'address',
            'latitude', 'longitude', 'is_open', 'is_pure_veg', 'avg_delivery_minutes',
            'min_order_amount', 'self_delivery_enabled', 'self_delivery_radius_km',
            'photo_url', 'banner_url', 'payment_method', 'upi_id', 'upi_qr_photo',
            'bank_name', 'bank_account_no', 'bank_account_holder', 'bank_ifsc', 'bank_passbook_photo'
        ];

        $updates = [];
        $params = [':id' => $id];

        foreach ($fields as $field) {
            if (isset($body[$field])) {
                $updates[] = "`{$field}` = :{$field}";
                $val = $body[$field];
                if (in_array($field, ['is_open', 'is_pure_veg', 'self_delivery_enabled'], true)) {
                    $val = !empty($val) ? 1 : 0;
                }
                $params[":{$field}"] = $val;
            }
        }

        if (isset($body['photos']) && is_array($body['photos'])) {
            $updates[] = "`photos_json` = :photos_json";
            $params[':photos_json'] = json_encode($body['photos']);
        }

        if (isset($body['cuisine_types']) && is_array($body['cuisine_types'])) {
            $updates[] = "`cuisine_types_json` = :cuisine_types_json";
            $params[':cuisine_types_json'] = json_encode($body['cuisine_types']);
        }

        if (!empty($updates)) {
            $sql = 'UPDATE restaurants SET ' . implode(', ', $updates) . ' WHERE id = :id';
            $upStmt = $db->prepare($sql);
            $upStmt->execute($params);
        }

        self::getById($id);
    }

    public static function addMenuItem(int $id): void {
        requireAuth(['restaurant', 'admin']);
        $body = getBody();
        $db = Database::getConnection();

        $name = trim($body['name'] ?? '');
        $price = (float)($body['price'] ?? 0);

        if (empty($name) || $price <= 0) {
            errorResponse('Food item name and valid price are required (খাবারের নাম ও দাম আবশ্যক)', 400);
        }

        $ins = $db->prepare('
            INSERT INTO foods (
                restaurant_id, category, category_bn, name, name_bn, description, description_bn,
                price, discount_price, photo_url, is_veg, is_available, is_recommended, preparation_minutes
            ) VALUES (
                :rid, :cat, :cat_bn, :name, :name_bn, :desc, :desc_bn,
                :price, :dprice, :photo, :veg, 1, 0, :prep
            )
        ');

        $ins->execute([
            ':rid'     => $id,
            ':cat'     => $body['category'] ?? 'Main Course',
            ':cat_bn'  => $body['category_bn'] ?? 'মূল খাবার',
            ':name'    => $name,
            ':name_bn' => $body['name_bn'] ?? $name,
            ':desc'    => $body['description'] ?? '',
            ':desc_bn' => $body['description_bn'] ?? '',
            ':price'   => $price,
            ':dprice'  => !empty($body['discount_price']) ? (float)$body['discount_price'] : null,
            ':photo'   => $body['photo_url'] ?? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
            ':veg'     => !empty($body['is_veg']) ? 1 : 0,
            ':prep'    => (int)($body['preparation_minutes'] ?? 15)
        ]);

        $foodId = (int)$db->lastInsertId();
        $fetch = $db->prepare('SELECT * FROM foods WHERE id = :fid');
        $fetch->execute([':fid' => $foodId]);
        $newFood = $fetch->fetch();

        jsonResponse($newFood, 201, 'Food item added successfully (খাবার মেনুতে যোগ করা হয়েছে)');
    }

    public static function updateMenuItem(int $id, int $foodId): void {
        requireAuth(['restaurant', 'admin']);
        $body = getBody();
        $db = Database::getConnection();

        $check = $db->prepare('SELECT * FROM foods WHERE id = :fid AND restaurant_id = :rid');
        $check->execute([':fid' => $foodId, ':rid' => $id]);
        $food = $check->fetch();

        if (!$food) {
            errorResponse('Food item not found', 404);
        }

        $fields = [
            'name', 'name_bn', 'category', 'category_bn', 'description', 'description_bn',
            'price', 'discount_price', 'photo_url', 'is_veg', 'is_available', 'preparation_minutes'
        ];

        $updates = [];
        $params = [':fid' => $foodId, ':rid' => $id];

        foreach ($fields as $field) {
            if (isset($body[$field])) {
                $updates[] = "`{$field}` = :{$field}";
                $val = $body[$field];
                if ($field === 'is_available' || $field === 'is_veg') {
                    $val = !empty($val) ? 1 : 0;
                }
                $params[":{$field}"] = $val;
            }
        }

        if (!empty($updates)) {
            $sql = 'UPDATE foods SET ' . implode(', ', $updates) . ' WHERE id = :fid AND restaurant_id = :rid';
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
        }

        $fetch = $db->prepare('SELECT * FROM foods WHERE id = :fid');
        $fetch->execute([':fid' => $foodId]);
        $updated = $fetch->fetch();

        jsonResponse($updated, 200, 'Food item updated (খাবার আপডেট হয়েছে)');
    }

    public static function deleteMenuItem(int $id, int $foodId): void {
        requireAuth(['restaurant', 'admin']);
        $db = Database::getConnection();

        $stmt = $db->prepare('DELETE FROM foods WHERE id = :fid AND restaurant_id = :rid');
        $stmt->execute([':fid' => $foodId, ':rid' => $id]);

        jsonResponse(['deleted' => true], 200, 'Food item removed (মেনু থেকে মুছে ফেলা হয়েছে)');
    }

    public static function getEarnings(int $id): void {
        requireAuth(['restaurant', 'admin']);
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM restaurants WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $rest = $stmt->fetch();

        if (!$rest) {
            errorResponse('Restaurant not found', 404);
        }

        // Fetch completed orders
        $orderStmt = $db->prepare('SELECT * FROM orders WHERE restaurant_id = :rid AND status != "cancelled"');
        $orderStmt->execute([':rid' => $id]);
        $orders = $orderStmt->fetchAll();

        $grossSales = 0.0;
        $netEarnings = 0.0;
        $commissionRate = (float)$rest['commission_rate'];

        foreach ($orders as $o) {
            $subtotal = (float)$o['subtotal'];
            $grossSales += $subtotal;

            if ($o['status'] === 'delivered') {
                if ($o['net_restaurant_amount'] !== null) {
                    $netEarnings += (float)$o['net_restaurant_amount'];
                } else {
                    $foodNet = $subtotal - ($subtotal * ($commissionRate / 100));
                    $isSelf = !empty($o['is_self_delivery']);
                    $netEarnings += $foodNet + ($isSelf ? (float)$o['delivery_fee'] : 0);
                }
            }
        }

        $platformFee = round($grossSales * ($commissionRate / 100), 2);
        $netEarnings = round($netEarnings, 2);

        // Fetch wallet
        $wStmt = $db->prepare('SELECT * FROM wallets WHERE user_id = :uid LIMIT 1');
        $wStmt->execute([':uid' => $rest['user_id']]);
        $wallet = $wStmt->fetch() ?: [
            'balance'         => $netEarnings,
            'total_earned'    => $netEarnings,
            'total_withdrawn' => 0.0
        ];

        jsonResponse([
            'grossSales'     => round($grossSales, 2),
            'commissionRate' => $commissionRate,
            'platformFee'    => $platformFee,
            'netEarnings'    => $netEarnings,
            'wallet'         => $wallet,
            'totalOrders'    => count($orders)
        ]);
    }
}
