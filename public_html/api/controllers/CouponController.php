<?php
/**
 * AharLocal - Coupon Controller
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';

class CouponController {
    public static function getAll(): void {
        $db = Database::getConnection();
        $stmt = $db->query('SELECT * FROM coupons WHERE is_active = 1 ORDER BY id DESC');
        $coupons = $stmt->fetchAll();

        foreach ($coupons as &$c) {
            $c['id'] = (int)$c['id'];
            $c['discount_value'] = (float)$c['discount_value'];
            $c['max_discount'] = $c['max_discount'] !== null ? (float)$c['max_discount'] : null;
            $c['min_order_amount'] = (float)$c['min_order_amount'];
            $c['is_active'] = (int)$c['is_active'];
        }
        unset($c);

        jsonResponse($coupons);
    }

    public static function apply(): void {
        $body = getBody();
        $code = strtoupper(trim($body['code'] ?? ''));
        $subtotal = (float)($body['subtotal'] ?? 0);
        $restaurantId = !empty($body['restaurant_id']) ? (int)$body['restaurant_id'] : null;

        if (empty($code) || $subtotal <= 0) {
            errorResponse('Coupon code and valid subtotal required', 400);
        }

        $db = Database::getConnection();

        // 1. Check platform coupon
        $stmt = $db->prepare('SELECT * FROM coupons WHERE code = :code AND is_active = 1 LIMIT 1');
        $stmt->execute([':code' => $code]);
        $coupon = $stmt->fetch();

        if ($coupon) {
            if ($subtotal < (float)$coupon['min_order_amount']) {
                errorResponse("Minimum order of ₹{$coupon['min_order_amount']} required for coupon {$code}", 400);
            }

            $discount = 0.0;
            if ($coupon['discount_type'] === 'percentage') {
                $discount = $subtotal * ((float)$coupon['discount_value'] / 100);
                if (!empty($coupon['max_discount'])) {
                    $discount = min($discount, (float)$coupon['max_discount']);
                }
            } else {
                $discount = min($subtotal, (float)$coupon['discount_value']);
            }

            $discount = round($discount, 2);

            jsonResponse([
                'coupon'   => $coupon,
                'discount' => $discount,
                'message'  => "Coupon {$code} applied! Saved ₹{$discount}"
            ]);
        }

        // 2. Check restaurant promocode
        if ($restaurantId) {
            $rStmt = $db->prepare('SELECT * FROM restaurant_promocodes WHERE restaurant_id = :rid AND code = :code AND is_active = 1 LIMIT 1');
            $rStmt->execute([':rid' => $restaurantId, ':code' => $code]);
            $rPromo = $rStmt->fetch();

            if ($rPromo) {
                if ($subtotal < (float)$rPromo['min_order_amount']) {
                    errorResponse("Minimum order of ₹{$rPromo['min_order_amount']} required for {$code}", 400);
                }

                $discount = $subtotal * ((float)$rPromo['discount_percentage'] / 100);
                if (!empty($rPromo['max_discount'])) {
                    $discount = min($discount, (float)$rPromo['max_discount']);
                }
                $discount = round($discount, 2);

                jsonResponse([
                    'coupon'   => $rPromo,
                    'discount' => $discount,
                    'message'  => "Restaurant promo {$code} applied! Saved ₹{$discount}"
                ]);
            }
        }

        errorResponse("Invalid or expired coupon code '{$code}' (কুপনটি সঠিক নয় অথবা মেয়াদ শেষ)", 404);
    }

    public static function createAdminCoupon(): void {
        requireAuth(['admin']);
        $body = getBody();
        $db = Database::getConnection();

        $code = strtoupper(trim($body['code'] ?? ''));
        if (empty($code)) {
            errorResponse('Coupon code required', 400);
        }

        $ins = $db->prepare('
            INSERT INTO coupons (code, description, description_bn, discount_type, discount_value, max_discount, min_order_amount, is_active)
            VALUES (:c, :d, :dbn, :type, :val, :max, :min, 1)
        ');
        $ins->execute([
            ':c'    => $code,
            ':d'    => $body['description'] ?? "Special {$code} discount",
            ':dbn'  => $body['description_bn'] ?? "বিশেষ অফার",
            ':type' => $body['discount_type'] ?? 'percentage',
            ':val'  => (float)($body['discount_value'] ?? 10),
            ':max'  => !empty($body['max_discount']) ? (float)$body['max_discount'] : null,
            ':min'  => (float)($body['min_order_amount'] ?? 100)
        ]);

        jsonResponse(['success' => true], 201, "Coupon {$code} created");
    }

    public static function toggleAdminCoupon(int $id): void {
        requireAuth(['admin']);
        $db = Database::getConnection();

        $stmt = $db->prepare('UPDATE coupons SET is_active = IF(is_active = 1, 0, 1) WHERE id = :id');
        $stmt->execute([':id' => $id]);

        jsonResponse(['success' => true]);
    }

    public static function deleteAdminCoupon(int $id): void {
        requireAuth(['admin']);
        $db = Database::getConnection();

        $stmt = $db->prepare('DELETE FROM coupons WHERE id = :id');
        $stmt->execute([':id' => $id]);

        jsonResponse(['success' => true]);
    }

    public static function createRestaurantPromocode(): void {
        requireAuth(['restaurant', 'admin']);
        $body = getBody();
        $db = Database::getConnection();

        $restId = (int)($body['restaurant_id'] ?? 0);
        $code   = strtoupper(trim($body['code'] ?? ''));

        if (!$restId || empty($code)) {
            errorResponse('Restaurant ID and promo code required', 400);
        }

        $ins = $db->prepare('
            INSERT INTO restaurant_promocodes (restaurant_id, code, discount_percentage, max_discount, min_order_amount, is_active)
            VALUES (:rid, :c, :pct, :max, :min, 1)
            ON DUPLICATE KEY UPDATE discount_percentage = :pct, max_discount = :max, min_order_amount = :min, is_active = 1
        ');
        $ins->execute([
            ':rid' => $restId,
            ':c'   => $code,
            ':pct' => (float)($body['discount_percentage'] ?? 10),
            ':max' => !empty($body['max_discount']) ? (float)$body['max_discount'] : null,
            ':min' => (float)($body['min_order_amount'] ?? 100)
        ]);

        jsonResponse(['success' => true], 201, "Promo code {$code} activated");
    }

    public static function deleteRestaurantPromocode(int $restaurantId, string $code): void {
        requireAuth(['restaurant', 'admin']);
        $db = Database::getConnection();

        $stmt = $db->prepare('DELETE FROM restaurant_promocodes WHERE restaurant_id = :rid AND code = :code');
        $stmt->execute([':rid' => $restaurantId, ':code' => strtoupper($code)]);

        jsonResponse(['success' => true], 200, "Promo code {$code} removed");
    }
}
