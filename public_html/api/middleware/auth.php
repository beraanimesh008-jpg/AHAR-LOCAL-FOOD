<?php
/**
 * AharLocal - Authentication Middleware
 * Handles Hostinger Apache Authorization header forwarding and role verification.
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/jwt.php';
require_once __DIR__ . '/../helpers/response.php';

function getBearerToken(): ?string {
    $header = null;

    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $header = trim($_SERVER['HTTP_AUTHORIZATION']);
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $header = trim($_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['Authorization'])) {
            $header = trim($headers['Authorization']);
        } elseif (isset($headers['authorization'])) {
            $header = trim($headers['authorization']);
        }
    }

    if ($header && preg_match('/Bearer\s(\S+)/i', $header, $matches)) {
        return $matches[1];
    }

    // Fallback to query parameter if needed
    if (!empty($_GET['token'])) {
        return $_GET['token'];
    }

    return null;
}

function getAuthenticatedUser(): ?array {
    $token = getBearerToken();
    if (!$token) {
        return null;
    }

    $payload = JWT::verify($token);
    if (!$payload || empty($payload['id'])) {
        return null;
    }

    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT id, name, email, phone, role, profile_photo, language, cod_enabled, is_active, status FROM users WHERE id = :id AND is_active = 1 LIMIT 1');
    $stmt->execute([':id' => $payload['id']]);
    $user = $stmt->fetch();

    if (!$user || $user['status'] === 'blocked') {
        return null;
    }

    return $user;
}

function requireAuth(?array $allowedRoles = null): array {
    $user = getAuthenticatedUser();

    if (!$user) {
        errorResponse('Authentication required or session expired (অনুগ্রহ করে পুনরায় লগইন করুন)', 401);
    }

    if ($allowedRoles !== null && !in_array($user['role'], $allowedRoles, true)) {
        errorResponse('Access forbidden: insufficient permissions (অনুমতি নেই)', 403);
    }

    return $user;
}
