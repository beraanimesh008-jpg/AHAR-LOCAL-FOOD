<?php
/**
 * AharLocal - Standardized JSON Response Helpers
 * Matching React frontend expectation: { success: boolean, data: any, message?: string }
 */

function jsonResponse(mixed $data = null, int $statusCode = 200, ?string $message = null): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=UTF-8');

    $response = [
        'success' => true,
        'data'    => $data
    ];

    if ($message !== null) {
        $response['message'] = $message;
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function errorResponse(string $message, int $statusCode = 400, mixed $errors = null): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=UTF-8');

    $response = [
        'success' => false,
        'message' => $message
    ];

    if ($errors !== null) {
        $response['errors'] = $errors;
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function getBody(): array {
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        return $_POST;
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}
