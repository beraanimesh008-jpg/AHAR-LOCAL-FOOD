<?php
/**
 * AharLocal - Notification Controller
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';

class NotificationController {
    public static function getAll(): void {
        $user = requireAuth();
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM notifications WHERE user_id = :uid ORDER BY id DESC LIMIT 50');
        $stmt->execute([':uid' => $user['id']]);
        $notifications = $stmt->fetchAll();

        foreach ($notifications as &$n) {
            $n['id'] = (int)$n['id'];
            $n['user_id'] = (int)$n['user_id'];
            $n['is_read'] = (int)$n['is_read'];
            if (!empty($n['data_json'])) {
                $n['data'] = json_decode($n['data_json'], true);
            }
        }
        unset($n);

        jsonResponse($notifications);
    }

    public static function markRead(int $id): void {
        $user = requireAuth();
        $db = Database::getConnection();

        $stmt = $db->prepare('UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :uid');
        $stmt->execute([':id' => $id, ':uid' => $user['id']]);

        jsonResponse(['success' => true]);
    }
}
