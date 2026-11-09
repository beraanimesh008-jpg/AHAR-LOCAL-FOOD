<?php
/**
 * AharLocal - CORS Configuration
 * Configures Cross-Origin Resource Sharing for https://aharlocal.in
 */

function handleCors(): void {
    $allowedOrigins = [
        'https://aharlocal.in',
        'https://www.aharlocal.in',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173'
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (in_array($origin, $allowedOrigins, true)) {
        header("Access-Control-Allow-Origin: {$origin}");
    } else if (empty($origin)) {
        // Direct or same-origin request
        header("Access-Control-Allow-Origin: https://aharlocal.in");
    } else {
        // Fallback for subdomains or staging
        if (str_ends_with($origin, 'aharlocal.in')) {
            header("Access-Control-Allow-Origin: {$origin}");
        }
    }

    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin");
    header("Access-Control-Max-Age: 86400"); // Cache preflight for 24h

    // Handle OPTIONS Preflight request immediately
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}
