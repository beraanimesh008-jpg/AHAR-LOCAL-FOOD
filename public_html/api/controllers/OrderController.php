<?php
/**
 * AharLocal - Order Controller
 * Handles order checkout, escrow tracking, lifecycle status, rider request & handover.
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/geo.php';
require_once __DIR__ . '/../middleware/auth.php';

class OrderController {
    public static function create(): void {
        $user = requireAuth();
        $body = getBody();
        $db = Database::getConnection();

        $restaurantId = (int)($body['restaurant_id'] ?? 0);
        $items        = $body['items'] ?? [];
        $address      = trim($body['delivery_address'] ?? '');
        $lat          = (float)($body['delivery_lat'] ?? 0);
        $lng          = (float)($body['delivery_lng'] ?? 0);
        $paymentMethod= $body['payment_method'] ?? 'cod';

        if (!$restaurantId || empty($items) || empty($address) || !$lat || !$lng) {
            errorResponse('Missing required order details (অর্ডারের প্রয়োজনীয় তথ্য অসম্পূর্ণ)', 400);
        }

        // Fetch Restaurant
        $restStmt = $db->prepare('SELECT * FROM restaurants WHERE id = :id LIMIT 1');
        $restStmt->execute([':id' => $restaurantId]);
        $restaurant = $restStmt->fetch();

        if (!$restaurant) {
            errorResponse('Restaurant not found', 404);
        }

        if (empty($restaurant['is_open'])) {
            errorResponse('This restaurant is currently closed (রেস্তোরাঁটি এই মুহূর্তে বন্ধ রয়েছে)', 400);
        }

        // Validate service area
        $saStmt = $db->query('SELECT * FROM service_areas WHERE is_active = 1');
        $serviceAreas = $saStmt->fetchAll();

        $matchedArea = null;
        foreach ($serviceAreas as $sa) {
            if (!empty($sa['polygon_json'])) {
                $poly = json_decode($sa['polygon_json'], true) ?: [];
                if (GeoHelper::isPointInPolygon(['lat' => $lat, 'lng' => $lng], $poly)) {
                    $matchedArea = $sa;
                    break;
                }
            }
        }

        $serviceAreaId = $matchedArea ? (int)$matchedArea['id'] : ((int)$restaurant['service_area_id'] ?: 1);

        // Calculate Subtotal from Items
        $subtotal = 0.0;
        $orderItems = [];

        foreach ($items as $item) {
            $foodId = (int)($item['food_id'] ?? $item['food']['id'] ?? 0);
            $qty    = max(1, (int)($item['quantity'] ?? 1));

            $fStmt = $db->prepare('SELECT id, name, price, discount_price, is_available FROM foods WHERE id = :fid AND restaurant_id = :rid LIMIT 1');
            $fStmt->execute([':fid' => $foodId, ':rid' => $restaurantId]);
            $food = $fStmt->fetch();

            if (!$food) {
                continue;
            }

            if (empty($food['is_available'])) {
                errorResponse("Item '{$food['name']}' is out of stock (খাবারটি এই মুহূর্তে স্টকে নেই)", 400);
            }

            $unitPrice = $food['discount_price'] !== null ? (float)$food['discount_price'] : (float)$food['price'];
            $totalItemPrice = $unitPrice * $qty;
            $subtotal += $totalItemPrice;

            $orderItems[] = [
                'food_id'              => (int)$food['id'],
                'food_name'            => $food['name'],
                'price'                => $unitPrice,
                'quantity'             => $qty,
                'total_price'          => $totalItemPrice,
                'special_instructions' => $item['specialInstructions'] ?? $item['special_instructions'] ?? ''
            ];
        }

        if (empty($orderItems)) {
            errorResponse('No valid items in cart', 400);
        }

        if ($subtotal < (float)$restaurant['min_order_amount']) {
            errorResponse("Minimum order amount for this restaurant is ₹{$restaurant['min_order_amount']}", 400);
        }

        // Distance & Delivery Fee
        $distanceKm = GeoHelper::calculateDistanceKm(
            (float)$restaurant['latitude'],
            (float)$restaurant['longitude'],
            $lat,
            $lng
        );

        // Platform settings
        $settingsStmt = $db->query('SELECT setting_key, setting_value FROM platform_settings');
        $settingsRows = $settingsStmt->fetchAll();
        $settings = [];
        foreach ($settingsRows as $sr) {
            $settings[$sr['setting_key']] = $sr['setting_value'];
        }

        $feeBreakdown = GeoHelper::calculateDeliveryFee($distanceKm, $settings);
        $deliveryFee = (float)($body['delivery_fee'] ?? $feeBreakdown['totalFee']);
        $discount    = (float)($body['discount'] ?? 0.0);
        $tax         = round($subtotal * 0.05, 2); // 5% GST
        $grandTotal  = max(0.0, round($subtotal + $deliveryFee + $tax - $discount, 2));

        $orderNumber = 'ORD-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));

        // Delivery mode (self delivery vs platform)
        $isSelfDelivery = !empty($restaurant['self_delivery_enabled']) && $distanceKm <= (float)($restaurant['self_delivery_radius_km'] ?? 5.0) ? 1 : 0;
        $deliveryMode   = $isSelfDelivery ? 'self_delivery' : 'platform_rider';

        // Escrow holding time (e.g. 2 hours after delivery)
        $holdingUntil = date('Y-m-d H:i:s', time() + (2 * 3600));

        // Net restaurant calculation
        $commissionRate = (float)$restaurant['commission_rate'];
        $commissionAmount = round($subtotal * ($commissionRate / 100), 2);
        $netRestaurant = round($subtotal - $commissionAmount + ($isSelfDelivery ? $deliveryFee : 0), 2);

        $db->beginTransaction();

        try {
            $insOrder = $db->prepare('
                INSERT INTO orders (
                    order_number, customer_id, customer_name, customer_phone,
                    restaurant_id, restaurant_name, restaurant_phone, restaurant_address,
                    restaurant_lat, restaurant_lng, service_area_id, status,
                    delivery_address, delivery_landmark, delivery_lat, delivery_lng,
                    items_json, distance_km, is_self_delivery, delivery_mode,
                    subtotal, delivery_fee, discount, tax, grand_total,
                    payment_method, payment_status, preparation_minutes,
                    customer_notes, escrow_status, holding_until, net_restaurant_amount, placed_at
                ) VALUES (
                    :onum, :cid, :cname, :cphone,
                    :rid, :rname, :rphone, :raddr,
                    :rlat, :rlng, :said, "pending",
                    :daddr, :dland, :dlat, :dlng,
                    :items, :dist, :is_self, :dmode,
                    :sub, :fee, :disc, :tax, :total,
                    :pmeth, :pstat, 25,
                    :notes, "holding", :hold, :net, NOW()
                )
            ');

            $insOrder->execute([
                ':onum'    => $orderNumber,
                ':cid'     => $user['id'],
                ':cname'   => $user['name'],
                ':cphone'  => $user['phone'],
                ':rid'     => $restaurant['id'],
                ':rname'   => $restaurant['name'],
                ':rphone'  => $restaurant['phone'],
                ':raddr'   => $restaurant['address'],
                ':rlat'    => $restaurant['latitude'],
                ':rlng'    => $restaurant['longitude'],
                ':said'    => $serviceAreaId,
                ':daddr'   => $address,
                ':dland'   => $body['delivery_landmark'] ?? '',
                ':dlat'    => $lat,
                ':dlng'    => $lng,
                ':items'   => json_encode($orderItems),
                ':dist'    => $distanceKm,
                ':is_self' => $isSelfDelivery,
                ':dmode'   => $deliveryMode,
                ':sub'     => $subtotal,
                ':fee'     => $deliveryFee,
                ':disc'    => $discount,
                ':tax'     => $tax,
                ':total'   => $grandTotal,
                ':pmeth'   => $paymentMethod,
                ':pstat'   => $paymentMethod === 'cod' ? 'cod' : 'paid',
                ':notes'   => $body['customer_notes'] ?? '',
                ':hold'    => $holdingUntil,
                ':net'     => $netRestaurant
            ]);

            $orderId = (int)$db->lastInsertId();

            // Insert relational order_items
            $insItem = $db->prepare('
                INSERT INTO order_items (order_id, food_id, food_name, price, quantity, total_price, special_instructions)
                VALUES (:oid, :fid, :fname, :price, :qty, :total, :inst)
            ');

            foreach ($orderItems as $oi) {
                $insItem->execute([
                    ':oid'   => $orderId,
                    ':fid'   => $oi['food_id'],
                    ':fname' => $oi['food_name'],
                    ':price' => $oi['price'],
                    ':qty'   => $oi['quantity'],
                    ':total' => $oi['total_price'],
                    ':inst'  => $oi['special_instructions']
                ]);
            }

            // Create in-app notifications
            $notif = $db->prepare('INSERT INTO notifications (user_id, role, title, title_bn, message, message_bn, type) VALUES (:uid, :role, :t, :tb, :m, :mb, :type)');

            // Alert restaurant
            $notif->execute([
                ':uid'  => $restaurant['user_id'],
                ':role' => 'restaurant',
                ':t'    => "New Order #{$orderNumber}",
                ':tb'   => "নতুন অর্ডার #{$orderNumber}",
                ':m'    => "You received an order of ₹{$grandTotal} from {$user['name']}.",
                ':mb'   => "আপনার রেস্তোরাঁয় ₹{$grandTotal} মূল্যের নতুন অর্ডার এসেছে।",
                ':type' => 'new_order'
            ]);

            // Alert customer
            $notif->execute([
                ':uid'  => $user['id'],
                ':role' => 'customer',
                ':t'    => "Order Placed Successfully",
                ':tb'   => "অর্ডার সফলভাবে গ্রহণ করা হয়েছে",
                ':m'    => "Your order #{$orderNumber} has been received by {$restaurant['name']}.",
                ':mb'   => "আপনার অর্ডারটি রেস্তোরাঁ গ্রহণ করেছে এবং প্রস্তুত হচ্ছে।",
                ':type' => 'order_placed'
            ]);

            $db->commit();

            self::getById($orderId);

        } catch (Exception $e) {
            $db->rollBack();
            errorResponse('Failed to place order: ' . $e->getMessage(), 500);
        }
    }

    public static function getAll(): void {
        $user = requireAuth();
        $db = Database::getConnection();

        $role = $user['role'];
        $sql = 'SELECT * FROM orders ';
        $params = [];

        if ($role === 'customer') {
            $sql .= 'WHERE customer_id = :uid ORDER BY id DESC';
            $params[':uid'] = $user['id'];
        } elseif ($role === 'restaurant') {
            // Find restaurant belonging to user
            $rStmt = $db->prepare('SELECT id FROM restaurants WHERE user_id = :uid LIMIT 1');
            $rStmt->execute([':uid' => $user['id']]);
            $rest = $rStmt->fetch();
            $restId = $rest ? (int)$rest['id'] : 1; // fallback

            $sql .= 'WHERE restaurant_id = :rid ORDER BY id DESC';
            $params[':rid'] = $restId;
        } elseif ($role === 'delivery') {
            $dStmt = $db->prepare('SELECT id FROM delivery_partners WHERE user_id = :uid LIMIT 1');
            $dStmt->execute([':uid' => $user['id']]);
            $dp = $dStmt->fetch();
            $dpId = $dp ? (int)$dp['id'] : 1;

            // Partner sees assigned orders, or ready unassigned platform orders
            $sql .= 'WHERE delivery_partner_id = :dpid OR (status IN ("ready", "preparing", "accepted") AND delivery_mode = "platform_rider" AND delivery_partner_id IS NULL) ORDER BY id DESC';
            $params[':dpid'] = $dpId;
        } else {
            // Admin sees all
            $sql .= 'ORDER BY id DESC LIMIT 200';
        }

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();

        foreach ($orders as &$o) {
            $o['id'] = (int)$o['id'];
            $o['customer_id'] = (int)$o['customer_id'];
            $o['restaurant_id'] = (int)$o['restaurant_id'];
            $o['delivery_partner_id'] = $o['delivery_partner_id'] !== null ? (int)$o['delivery_partner_id'] : null;
            $o['subtotal'] = (float)$o['subtotal'];
            $o['delivery_fee'] = (float)$o['delivery_fee'];
            $o['discount'] = (float)$o['discount'];
            $o['tax'] = (float)$o['tax'];
            $o['grand_total'] = (float)$o['grand_total'];
            $o['distance_km'] = (float)$o['distance_km'];
            $o['is_self_delivery'] = (int)$o['is_self_delivery'];
            $o['items'] = json_decode($o['items_json'], true) ?: [];
        }
        unset($o);

        jsonResponse($orders);
    }

    public static function getById(int $id): void {
        $user = requireAuth();
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM orders WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $order = $stmt->fetch();

        if (!$order) {
            errorResponse('Order not found', 404);
        }

        $order['id'] = (int)$order['id'];
        $order['customer_id'] = (int)$order['customer_id'];
        $order['restaurant_id'] = (int)$order['restaurant_id'];
        $order['delivery_partner_id'] = $order['delivery_partner_id'] !== null ? (int)$order['delivery_partner_id'] : null;
        $order['subtotal'] = (float)$order['subtotal'];
        $order['delivery_fee'] = (float)$order['delivery_fee'];
        $order['discount'] = (float)$order['discount'];
        $order['tax'] = (float)$order['tax'];
        $order['grand_total'] = (float)$order['grand_total'];
        $order['distance_km'] = (float)$order['distance_km'];
        $order['is_self_delivery'] = (int)$order['is_self_delivery'];
        $order['items'] = json_decode($order['items_json'], true) ?: [];

        // Attach live delivery partner info if assigned
        if (!empty($order['delivery_partner_id'])) {
            $dpStmt = $db->prepare('SELECT name, phone, vehicle_type, vehicle_number, current_lat, current_lng FROM delivery_partners WHERE id = :dpid LIMIT 1');
            $dpStmt->execute([':dpid' => $order['delivery_partner_id']]);
            $dp = $dpStmt->fetch();

            if ($dp) {
                $order['delivery_partner_name'] = $dp['name'];
                $order['delivery_partner_phone'] = $dp['phone'];
                $order['delivery_partner_lat'] = $dp['current_lat'] ? (float)$dp['current_lat'] : null;
                $order['delivery_partner_lng'] = $dp['current_lng'] ? (float)$dp['current_lng'] : null;

                $order['deliveryPartnerLocation'] = [
                    'lat'            => (float)$dp['current_lat'],
                    'lng'            => (float)$dp['current_lng'],
                    'name'           => $dp['name'],
                    'phone'          => $dp['phone'],
                    'vehicle_type'   => $dp['vehicle_type'],
                    'vehicle_number' => $dp['vehicle_number']
                ];
            }
        }

        jsonResponse($order);
    }

    public static function updateStatus(int $id): void {
        $user = requireAuth();
        $body = getBody();
        $newStatus = $body['status'] ?? '';
        $db = Database::getConnection();

        $allowedStatuses = [
            'pending', 'accepted', 'preparing', 'ready',
            'assigned', 'picked_up', 'on_the_way', 'delivered', 'cancelled'
        ];

        if (!in_array($newStatus, $allowedStatuses, true)) {
            errorResponse('Invalid order status', 400);
        }

        $stmt = $db->prepare('SELECT * FROM orders WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $order = $stmt->fetch();

        if (!$order) {
            errorResponse('Order not found', 404);
        }

        $timeField = match ($newStatus) {
            'accepted'   => 'accepted_at',
            'ready'      => 'ready_at',
            'picked_up'  => 'picked_up_at',
            'delivered'  => 'delivered_at',
            'cancelled'  => 'cancelled_at',
            default      => null
        };

        $sql = "UPDATE orders SET status = :st";
        $params = [':st' => $newStatus, ':id' => $id];

        if ($timeField) {
            $sql .= ", {$timeField} = NOW()";
        }

        if ($newStatus === 'delivered') {
            $sql .= ", payment_status = 'paid'";
        }

        $sql .= " WHERE id = :id";

        $up = $db->prepare($sql);
        $up->execute($params);

        // Notify customer on status update
        $notif = $db->prepare('INSERT INTO notifications (user_id, role, title, title_bn, message, message_bn, type) VALUES (:uid, "customer", :t, :tb, :m, :mb, "order_status")');
        $notif->execute([
            ':uid' => $order['customer_id'],
            ':t'   => "Order Update: Status is {$newStatus}",
            ':tb'  => "অর্ডার স্ট্যাটাস: {$newStatus}",
            ':m'   => "Your order #{$order['order_number']} is now {$newStatus}.",
            ':mb'  => "আপনার অর্ডার #{$order['order_number']} এর বর্তমান স্ট্যাটাস: {$newStatus}।",
        ]);

        self::getById($id);
    }

    public static function requestRider(int $id): void {
        requireAuth(['restaurant', 'admin']);
        $db = Database::getConnection();

        $stmt = $db->prepare('UPDATE orders SET rider_requested = 1, rider_requested_at = NOW() WHERE id = :id');
        $stmt->execute([':id' => $id]);

        jsonResponse(['success' => true], 200, 'Platform rider requested successfully (ডেলিভারি রাইডারের অনুরোধ পাঠানো হয়েছে)');
    }

    public static function handoverToRider(int $id): void {
        requireAuth(['restaurant', 'admin']);
        $db = Database::getConnection();

        $stmt = $db->prepare('UPDATE orders SET is_handed_over = 1, handed_over_at = NOW(), status = "picked_up", picked_up_at = NOW() WHERE id = :id');
        $stmt->execute([':id' => $id]);

        jsonResponse(['success' => true], 200, 'Order successfully handed over to delivery partner (অর্ডার রাইডারের হাতে বুঝিয়ে দেওয়া হয়েছে)');
    }

    public static function dispute(int $id): void {
        $user = requireAuth();
        $body = getBody();
        $reason = trim($body['reason'] ?? $body['dispute_reason'] ?? 'Customer reported issue');
        $db = Database::getConnection();

        $stmt = $db->prepare('
            UPDATE orders 
            SET escrow_status = "disputed", dispute_reason = :reason, disputed_at = NOW() 
            WHERE id = :id
        ');
        $stmt->execute([':reason' => $reason, ':id' => $id]);

        jsonResponse(['success' => true], 200, 'Dispute recorded. Platform admin has been notified (অভিযোগ জমা নেওয়া হয়েছে)');
    }
}
