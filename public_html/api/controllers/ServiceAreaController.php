<?php
/**
 * AharLocal - Service Area & Geofencing Controller
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/geo.php';

class ServiceAreaController {
    public static function getAll(): void {
        $db = Database::getConnection();
        $stmt = $db->query('SELECT * FROM service_areas WHERE is_active = 1');
        $areas = $stmt->fetchAll();

        foreach ($areas as &$sa) {
            $sa['id'] = (int)$sa['id'];
            $sa['min_delivery_charge'] = (float)$sa['min_delivery_charge'];
            $sa['per_km_charge'] = (float)$sa['per_km_charge'];
            $sa['is_active'] = (int)$sa['is_active'];

            if (!empty($sa['polygon_json'])) {
                $sa['polygon'] = json_decode($sa['polygon_json'], true) ?: [];
            } else {
                // Fetch from service_area_points if polygon_json empty
                $pStmt = $db->prepare('SELECT latitude as lat, longitude as lng FROM service_area_points WHERE service_area_id = :said ORDER BY sequence_order ASC');
                $pStmt->execute([':said' => $sa['id']]);
                $points = $pStmt->fetchAll();
                foreach ($points as &$p) {
                    $p['lat'] = (float)$p['lat'];
                    $p['lng'] = (float)$p['lng'];
                }
                $sa['polygon'] = $points;
            }
        }
        unset($sa);

        jsonResponse($areas);
    }

    public static function validateLocation(): void {
        $body = getBody();
        $lat = !empty($body['lat']) ? (float)$body['lat'] : null;
        $lng = !empty($body['lng']) ? (float)$body['lng'] : null;

        if ($lat === null || $lng === null) {
            errorResponse('Latitude and Longitude required', 400);
        }

        $db = Database::getConnection();
        $stmt = $db->query('SELECT * FROM service_areas WHERE is_active = 1');
        $areas = $stmt->fetchAll();

        $matchedArea = null;

        foreach ($areas as $sa) {
            $polygon = [];
            if (!empty($sa['polygon_json'])) {
                $polygon = json_decode($sa['polygon_json'], true) ?: [];
            } else {
                $pStmt = $db->prepare('SELECT latitude as lat, longitude as lng FROM service_area_points WHERE service_area_id = :said ORDER BY sequence_order ASC');
                $pStmt->execute([':said' => $sa['id']]);
                $polygon = $pStmt->fetchAll();
            }

            if (GeoHelper::isPointInPolygon(['lat' => $lat, 'lng' => $lng], $polygon)) {
                $matchedArea = $sa;
                $matchedArea['polygon'] = $polygon;
                break;
            }
        }

        $isServiceable = ($matchedArea !== null);

        jsonResponse([
            'isServiceable' => $isServiceable,
            'serviceArea'   => $matchedArea,
            'message'       => $isServiceable
                ? "Delivering in: {$matchedArea['name']} ({$matchedArea['name_bn']})"
                : "Sorry, we do not deliver to this location yet. (দুঃখিত, এই এলাকায় আমাদের ডেলিভারি এখনও চালু হয়নি।)"
        ]);
    }
}
