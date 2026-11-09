<?php
/**
 * AharLocal - Pure PHP JWT (JSON Web Token) Implementation
 * Zero external Composer dependencies - works natively on Hostinger shared hosting.
 */

class JWT {
    private static string $secretKey = 'aharlocal_super_secret_jwt_key_2026_hostinger_secure';

    public static function setSecret(string $key): void {
        self::$secretKey = $key;
    }

    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    public static function generate(array $payload, int $expirySeconds = 2592000): string { // default 30 days
        $header = [
            'typ' => 'JWT',
            'alg' => 'HS256'
        ];

        $payload['iat'] = time();
        $payload['exp'] = time() + $expirySeconds;

        $encodedHeader  = self::base64UrlEncode(json_encode($header));
        $encodedPayload = self::base64UrlEncode(json_encode($payload));

        $signature = hash_hmac('sha256', "{$encodedHeader}.{$encodedPayload}", self::$secretKey, true);
        $encodedSignature = self::base64UrlEncode($signature);

        return "{$encodedHeader}.{$encodedPayload}.{$encodedSignature}";
    }

    public static function verify(string $token): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;

        $expectedSignature = self::base64UrlEncode(
            hash_hmac('sha256', "{$encodedHeader}.{$encodedPayload}", self::$secretKey, true)
        );

        if (!hash_equals($expectedSignature, $encodedSignature)) {
            return null; // Invalid signature
        }

        $payload = json_decode(self::base64UrlDecode($encodedPayload), true);
        if (!$payload || !is_array($payload)) {
            return null;
        }

        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null; // Token expired
        }

        return $payload;
    }
}
