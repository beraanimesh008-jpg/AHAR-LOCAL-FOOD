<?php
/**
 * AharLocal (আহার Local) - Central REST API Front Controller
 * Target: Hostinger Shared Hosting (https://aharlocal.in/api/...)
 */

// Global Error Reporting (clean JSON on uncaught errors)
error_reporting(E_ALL);
ini_set('display_errors', '0');

set_exception_handler(function(Throwable $e) {
    error_log("AharLocal Uncaught Exception: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    http_response_code(500);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode([
        'success' => false,
        'message' => 'An internal server error occurred'
    ], JSON_UNESCAPED_UNICODE);
    exit;
});

require_once __DIR__ . '/config/cors.php';
handleCors();

require_once __DIR__ . '/helpers/response.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/RestaurantController.php';
require_once __DIR__ . '/controllers/OrderController.php';
require_once __DIR__ . '/controllers/DeliveryController.php';
require_once __DIR__ . '/controllers/ServiceAreaController.php';
require_once __DIR__ . '/controllers/CouponController.php';
require_once __DIR__ . '/controllers/NotificationController.php';
require_once __DIR__ . '/controllers/SettingsController.php';
require_once __DIR__ . '/controllers/AdminController.php';

// Parse Request Method and URI
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

// Strip base paths e.g. /public_html/api, /api, or index.php
$uri = preg_replace('#^.*?/api/?#i', '/', $uri);
$uri = preg_replace('#^/index\.php/?#i', '/', $uri);
$uri = '/' . ltrim($uri, '/');

// ------------------------------------------------------------------------------
// Route Dispatching Table
// ------------------------------------------------------------------------------

// 1. Health check & Diagnostics
if ($uri === '/health' && $method === 'GET') {
    jsonResponse([
        'status'  => 'ok',
        'app'     => 'AharLocal Food Delivery PHP REST API',
        'domain'  => 'https://aharlocal.in',
        'db'      => 'u691798054_aharlocal_db',
        'time'    => date('c')
    ]);
}

if ($uri === '/setup-database' || $uri === '/setup-db') {
    require_once __DIR__ . '/setup_database.php';
    exit;
}

// 2. Platform Settings, Categories, Promotions, Location Fare
if ($uri === '/settings' && $method === 'GET') {
    SettingsController::getSettings();
}
if ($uri === '/categories' && $method === 'GET') {
    SettingsController::getCategories();
}
if ($uri === '/promotions' && $method === 'GET') {
    SettingsController::getPromotions();
}
if ($uri === '/location/calculate-fare' && $method === 'POST') {
    SettingsController::calculateFare();
}

// 3. Auth Routes
if ($uri === '/auth/login' && $method === 'POST') {
    AuthController::login();
}
if ($uri === '/auth/register' && $method === 'POST') {
    AuthController::register();
}
if ($uri === '/auth/me' && $method === 'GET') {
    AuthController::me();
}
if ($uri === '/auth/profile' && $method === 'PUT') {
    AuthController::updateProfile();
}
if ($uri === '/auth/google-auth' && $method === 'POST') {
    AuthController::googleAuth();
}
if ($uri === '/auth/register-role' && $method === 'POST') {
    AuthController::registerRole();
}
if ($uri === '/auth/admin-login' && $method === 'POST') {
    AuthController::adminLogin();
}
if ($uri === '/auth/demo-switch' && $method === 'POST') {
    AuthController::demoSwitch();
}

// 4. Restaurant Routes
if ($uri === '/restaurants' && $method === 'GET') {
    RestaurantController::getAll();
}
if ($uri === '/restaurants/all-foods' && $method === 'GET') {
    RestaurantController::getAllFoods();
}
if ($uri === '/restaurants/my/current' && $method === 'GET') {
    RestaurantController::getMyCurrent();
}
if (preg_match('#^/restaurants/(\d+)$#', $uri, $m)) {
    $id = (int)$m[1];
    if ($method === 'GET')  RestaurantController::getById($id);
    if ($method === 'PUT')  RestaurantController::update($id);
}
if (preg_match('#^/restaurants/(\d+)/menu$#', $uri, $m) && $method === 'POST') {
    RestaurantController::addMenuItem((int)$m[1]);
}
if (preg_match('#^/restaurants/(\d+)/menu/(\d+)$#', $uri, $m)) {
    $restId = (int)$m[1];
    $foodId = (int)$m[2];
    if ($method === 'PUT')    RestaurantController::updateMenuItem($restId, $foodId);
    if ($method === 'DELETE') RestaurantController::deleteMenuItem($restId, $foodId);
}
if (preg_match('#^/restaurants/(\d+)/earnings$#', $uri, $m) && $method === 'GET') {
    RestaurantController::getEarnings((int)$m[1]);
}

// 5. Order Routes
if ($uri === '/orders') {
    if ($method === 'GET')  OrderController::getAll();
    if ($method === 'POST') OrderController::create();
}
if (preg_match('#^/orders/(\d+)$#', $uri, $m) && $method === 'GET') {
    OrderController::getById((int)$m[1]);
}
if (preg_match('#^/orders/(\d+)/status$#', $uri, $m) && $method === 'PUT') {
    OrderController::updateStatus((int)$m[1]);
}
if (preg_match('#^/orders/(\d+)/request-rider$#', $uri, $m) && $method === 'POST') {
    OrderController::requestRider((int)$m[1]);
}
if (preg_match('#^/orders/(\d+)/handover-to-rider$#', $uri, $m) && $method === 'POST') {
    OrderController::handoverToRider((int)$m[1]);
}
if (preg_match('#^/orders/(\d+)/dispute$#', $uri, $m) && $method === 'POST') {
    OrderController::dispute((int)$m[1]);
}

// 6. Delivery Partner Routes
if ($uri === '/delivery/profile') {
    if ($method === 'GET') DeliveryController::getProfile();
    if ($method === 'PUT') DeliveryController::updateProfile();
}
if ($uri === '/delivery/status' && $method === 'POST') {
    DeliveryController::setStatus();
}
if ($uri === '/delivery/location' && $method === 'POST') {
    DeliveryController::updateLocation();
}
if (preg_match('#^/delivery/orders/(\d+)/accept$#', $uri, $m) && $method === 'POST') {
    DeliveryController::acceptOrder((int)$m[1]);
}
if (preg_match('#^/delivery/orders/(\d+)/decline$#', $uri, $m) && $method === 'POST') {
    DeliveryController::declineOrder((int)$m[1]);
}
if ($uri === '/delivery/earnings' && $method === 'GET') {
    DeliveryController::getEarnings();
}
if ($uri === '/delivery/payout-request' && $method === 'POST') {
    DeliveryController::requestPayout();
}
if ($uri === '/delivery/payout-method' && $method === 'POST') {
    DeliveryController::savePayoutMethod();
}

// 7. Service Areas
if ($uri === '/service-areas' && $method === 'GET') {
    ServiceAreaController::getAll();
}
if ($uri === '/service-areas/validate-location' && $method === 'POST') {
    ServiceAreaController::validateLocation();
}

// 8. Coupons
if ($uri === '/coupons' && $method === 'GET') {
    CouponController::getAll();
}
if ($uri === '/coupons/apply' && $method === 'POST') {
    CouponController::apply();
}
if ($uri === '/coupons/admin' && $method === 'POST') {
    CouponController::createAdminCoupon();
}
if (preg_match('#^/coupons/admin/(\d+)/toggle$#', $uri, $m) && $method === 'PUT') {
    CouponController::toggleAdminCoupon((int)$m[1]);
}
if (preg_match('#^/coupons/admin/(\d+)$#', $uri, $m) && $method === 'DELETE') {
    CouponController::deleteAdminCoupon((int)$m[1]);
}
if ($uri === '/coupons/restaurant' && $method === 'POST') {
    CouponController::createRestaurantPromocode();
}
if (preg_match('#^/coupons/restaurant/(\d+)/([^/]+)$#', $uri, $m) && $method === 'DELETE') {
    CouponController::deleteRestaurantPromocode((int)$m[1], $m[2]);
}

// 9. Notifications
if ($uri === '/notifications' && $method === 'GET') {
    NotificationController::getAll();
}
if (preg_match('#^/notifications/(\d+)/read$#', $uri, $m) && $method === 'PUT') {
    NotificationController::markRead((int)$m[1]);
}

// 10. Admin Endpoints
if ($uri === '/admin/dashboard' && $method === 'GET') {
    AdminController::dashboard();
}
if ($uri === '/admin/restaurants' && $method === 'GET') {
    AdminController::getRestaurants();
}
if (preg_match('#^/admin/restaurants/(\d+)/status$#', $uri, $m) && $method === 'PUT') {
    AdminController::updateRestaurantStatus((int)$m[1]);
}
if (preg_match('#^/admin/restaurants/(\d+)/settle$#', $uri, $m) && $method === 'POST') {
    AdminController::settleRestaurant((int)$m[1]);
}
if (preg_match('#^/admin/restaurants/(\d+)/block$#', $uri, $m) && $method === 'PUT') {
    AdminController::blockRestaurant((int)$m[1]);
}

// Admin Delivery Partners
if ($uri === '/admin/delivery-partners' && $method === 'GET') {
    AdminController::getDeliveryPartners();
}
if (preg_match('#^/admin/delivery-partners/(\d+)/status$#', $uri, $m) && $method === 'PUT') {
    AdminController::updateDeliveryPartnerStatus((int)$m[1]);
}
if (preg_match('#^/admin/delivery-partners/(\d+)/block$#', $uri, $m) && $method === 'PUT') {
    AdminController::blockDeliveryPartner((int)$m[1]);
}

// Admin Customer Management
if (preg_match('#^/admin/customers/(\d+)/cod$#', $uri, $m) && $method === 'PUT') {
    AdminController::toggleCustomerCod((int)$m[1]);
}
if (preg_match('#^/admin/customers/(\d+)/block$#', $uri, $m) && $method === 'PUT') {
    AdminController::blockCustomer((int)$m[1]);
}

// Admin Settings & Rates
if ($uri === '/admin/settings/rates' && $method === 'POST') {
    AdminController::updateRates();
}
if ($uri === '/admin/settings/cod' && $method === 'POST') {
    AdminController::toggleGlobalCod();
}

// Admin Escrow
if (preg_match('#^/admin/escrow/(\d+)/settle$#', $uri, $m) && $method === 'POST') {
    AdminController::escrowSettle((int)$m[1]);
}
if ($uri === '/admin/escrow/settle-all-matured' && $method === 'POST') {
    AdminController::escrowSettleAll();
}
if (preg_match('#^/admin/escrow/(\d+)/refund$#', $uri, $m) && $method === 'POST') {
    AdminController::escrowRefund((int)$m[1]);
}
if (preg_match('#^/admin/escrow/(\d+)/dispute$#', $uri, $m) && $method === 'POST') {
    AdminController::escrowDispute((int)$m[1]);
}

// Admin Location Radius Ranking Rules
if ($uri === '/admin/location-rankings') {
    if ($method === 'GET')  AdminController::getLocationRankings();
    if ($method === 'POST') AdminController::saveLocationRanking();
}
if (preg_match('#^/admin/location-rankings/(\d+)$#', $uri, $m) && $method === 'DELETE') {
    AdminController::deleteLocationRanking((int)$m[1]);
}
if (preg_match('#^/admin/location-rankings/(\d+)/toggle-status$#', $uri, $m) && $method === 'PUT') {
    AdminController::toggleLocationRanking((int)$m[1]);
}
if ($uri === '/admin/restaurant-rankings') {
    if ($method === 'GET')  AdminController::getLocationRankings();
    if ($method === 'POST') AdminController::saveLocationRanking();
}

// Admin Service Areas
if ($uri === '/admin/service-areas' && $method === 'POST') {
    AdminController::saveServiceArea();
}
if (preg_match('#^/admin/service-areas/(\d+)$#', $uri, $m)) {
    if ($method === 'PUT')    AdminController::saveServiceArea();
    if ($method === 'DELETE') AdminController::deleteServiceArea((int)$m[1]);
}
if (preg_match('#^/admin/service-areas/(\d+)/toggle-status$#', $uri, $m) && $method === 'PUT') {
    AdminController::toggleServiceArea((int)$m[1]);
}

// 404 Catch-All
errorResponse("API endpoint '{$uri}' [{$method}] not found (অনুরোধ করা এন্ডপয়েন্ট পাওয়া যায়নি)", 404);
