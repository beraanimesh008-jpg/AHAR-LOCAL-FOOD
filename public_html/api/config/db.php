<?php
/**
 * AharLocal - Hostinger Database Connection (PDO)
 * 
 * Target Database: u691798054_aharlocal_db
 * Target Username: u691798054_aharlocal_user
 * 
 * Security: Uses prepared statements and disabled emulation to prevent SQL injection.
 */

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            // Environment configuration (can also be overridden via Hostinger cPanel / .env)
            $host     = getenv('DB_HOST')     ?: 'localhost';
            $db_name  = getenv('DB_NAME')     ?: 'u691798054_aharlocal_db';
            $username = getenv('DB_USER')     ?: 'u691798054_aharlocal_user';
            $password = getenv('DB_PASSWORD') ?: ''; // Set your Hostinger MySQL user password here or in .env
            $charset  = 'utf8mb4';

            $dsn = "mysql:host={$host};dbname={$db_name};charset={$charset}";

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false, // Enforce real prepared statements
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$charset} COLLATE utf8mb4_unicode_ci"
            ];

            try {
                self::$instance = new PDO($dsn, $username, $password, $options);
            } catch (PDOException $e) {
                http_response_code(500);
                header('Content-Type: application/json; charset=UTF-8');
                echo json_encode([
                    'success' => false,
                    'message' => 'Database connection failed. Please verify credentials on Hostinger.',
                    'error'   => $e->getMessage()
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
        }

        return self::$instance;
    }
}
