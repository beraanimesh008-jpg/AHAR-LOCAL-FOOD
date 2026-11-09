<?php
/**
 * AharLocal - Hostinger Database Configuration
 * 
 * Target Database: u691798054_aharlocal_db
 * Target Username: u691798054_aharlocal_user
 * Host: localhost
 * 
 * This file is executed solely by PHP on the server and is never sent to the browser.
 */

if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    http_response_code(403);
    exit('Access Denied');
}

return [
    'host'     => getenv('DB_HOST')     ?: 'localhost',
    'database' => getenv('DB_NAME')     ?: 'u691798054_aharlocal_db',
    'username'    => getenv('DB_USER')     ?: 'u691798054_aharlocal_user',
    'password'    => getenv('DB_PASSWORD') ?: '', // Set your Hostinger database password here
    'charset'     => 'utf8mb4',
    // Secure one-time database setup token. Must be configured securely on the server.
    // NEVER commit or leave a default fallback token.
    'setup_token' => getenv('SETUP_TOKEN') ?: ''
];
