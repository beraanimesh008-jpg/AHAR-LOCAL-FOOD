<?php
/**
 * AharLocal - Hostinger Database Connection & Verification (PDO)
 * 
 * Target Database: u691798054_aharlocal_db
 * Target Username: u691798054_aharlocal_user
 * Host:            localhost
 * 
 * Security: Uses prepared statements (ATTR_EMULATE_PREPARES => false) to prevent SQL injection.
 * Credentials: Read from protected private server file config/db_credentials.php.
 */

class Database {
    private static ?PDO $instance = null;
    public const EXPECTED_DATABASE = 'u691798054_aharlocal_db';
    public const EXPECTED_USERNAME = 'u691798054_aharlocal_user';

    public static function getConfig(): array {
        $config = [
            'host'     => 'localhost',
            'database' => self::EXPECTED_DATABASE,
            'username' => self::EXPECTED_USERNAME,
            'password' => '',
            'charset'  => 'utf8mb4'
        ];

        $credsFile = __DIR__ . '/db_credentials.php';
        if (file_exists($credsFile)) {
            $fileConfig = include $credsFile;
            if (is_array($fileConfig)) {
                $config = array_merge($config, $fileConfig);
            }
        }

        // Environment overrides
        if (getenv('DB_HOST'))     $config['host']     = getenv('DB_HOST');
        if (getenv('DB_NAME'))     $config['database'] = getenv('DB_NAME');
        if (getenv('DB_USER'))     $config['username'] = getenv('DB_USER');
        if (getenv('DB_PASSWORD')) $config['password'] = getenv('DB_PASSWORD');

        return $config;
    }

    public static function getConnection(bool $exitOnError = true): ?PDO {
        if (self::$instance === null) {
            $config = self::getConfig();
            $dsn = "mysql:host={$config['host']};dbname={$config['database']};charset={$config['charset']}";

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false, // Enforce real prepared statements
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$config['charset']} COLLATE utf8mb4_unicode_ci"
            ];

            try {
                self::$instance = new PDO($dsn, $config['username'], $config['password'], $options);
            } catch (PDOException $e) {
                error_log("AharLocal DB Connection Error: " . $e->getMessage());
                if ($exitOnError) {
                    http_response_code(500);
                    header('Content-Type: application/json; charset=UTF-8');
                    echo json_encode([
                        'success' => false,
                        'message' => 'Database connection failed. Please verify credentials in config/db_credentials.php on Hostinger.'
                    ], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                throw $e;
            }
        }

        return self::$instance;
    }

    /**
     * Safe server-side database connection test
     * Verifies:
     * - MySQL PDO connection
     * - Exact database selection matching u691798054_aharlocal_db
     * - Connected user and privileges
     * - Charset and collation
     * - Basic query execution
     */
    public static function testConnection(): array {
        $result = [
            'connected'            => false,
            'database_exact_match' => false,
            'selected_database'    => '',
            'current_user'         => '',
            'charset'              => '',
            'collation'            => '',
            'query_test_passed'    => false,
            'error_message'        => null
        ];

        try {
            $pdo = self::getConnection(false);
            $result['connected'] = true;

            // 1. Verify exact database identity (Requirement 6)
            $dbStmt = $pdo->query('SELECT DATABASE()');
            $dbName = $dbStmt->fetchColumn();
            $result['selected_database'] = (string)$dbName;
            $result['database_exact_match'] = ($dbName === self::EXPECTED_DATABASE);

            // 2. Verify current user
            $userStmt = $pdo->query('SELECT CURRENT_USER()');
            $result['current_user'] = (string)$userStmt->fetchColumn();

            // 3. Verify character set and collation
            $charStmt = $pdo->query('SELECT @@character_set_connection AS cs, @@collation_connection AS col');
            $charRow = $charStmt->fetch(PDO::FETCH_ASSOC);
            $result['charset'] = $charRow['cs'] ?? '';
            $result['collation'] = $charRow['col'] ?? '';

            // 4. Test basic query execution
            $testStmt = $pdo->query('SELECT 1 AS ping');
            $result['query_test_passed'] = ($testStmt && $testStmt->fetchColumn() == 1);

        } catch (Throwable $e) {
            error_log("AharLocal Connection Test Exception: " . $e->getMessage());
            $result['error_message'] = 'Database connection failed. Please verify credentials in config/db_credentials.php on Hostinger.';
        }

        return $result;
    }
}
