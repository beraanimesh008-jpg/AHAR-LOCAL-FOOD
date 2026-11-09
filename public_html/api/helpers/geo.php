<?php
/**
 * AharLocal - Geofencing & Fare Calculation Helpers
 */

class GeoHelper {
    /**
     * Haversine formula to compute distance in km
     */
    public static function calculateDistanceKm(float $lat1, float $lon1, float $lat2, float $lon2): float {
        $earthRadius = 6371; // km
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return round($earthRadius * $c, 2);
    }

    /**
     * Ray-casting algorithm to test if a point is within a polygon
     * $point = ['lat' => 22.5, 'lng' => 88.3]
     * $polygon = [['lat' => ..., 'lng' => ...], ...]
     */
    public static function isPointInPolygon(array $point, array $polygon): boolean|bool {
        if (count($polygon) < 3) {
            return false;
        }

        $inside = false;
        $numPoints = count($polygon);
        $j = $numPoints - 1;

        for ($i = 0; $i < $numPoints; $i++) {
            $xi = (float)$polygon[$i]['lat'];
            $yi = (float)$polygon[$i]['lng'];
            $xj = (float)$polygon[$j]['lat'];
            $yj = (float)$polygon[$j]['lng'];

            $pLat = (float)$point['lat'];
            $pLng = (float)$point['lng'];

            $intersect = (($yi > $pLng) !== ($yj > $pLng)) &&
                ($pLat < ($xj - xi) * ($pLng - $yi) / ($yj - $yi) + $xi);

            if ($intersect) {
                $inside = !$inside;
            }
            $j = $i;
        }

        return $inside;
    }

    /**
     * Calculate delivery fee from distance and platform settings
     */
    public static function calculateDeliveryFee(float $distanceKm, array $settings): array {
        $baseFare       = (float)($settings['delivery_base_fare'] ?? 25.0);
        $baseDistanceKm = (float)($settings['delivery_base_distance_km'] ?? 2.0);
        $perKmRate      = (float)($settings['delivery_per_km_rate'] ?? 10.0);
        $minFare        = (float)($settings['min_delivery_fare'] ?? 20.0);

        if ($distanceKm <= $baseDistanceKm) {
            $totalFee = max($minFare, $baseFare);
            $extraKm = 0.0;
        } else {
            $extraKm = round($distanceKm - $baseDistanceKm, 2);
            $totalFee = max($minFare, round($baseFare + ($extraKm * $perKmRate)));
        }

        return [
            'distanceKm'     => $distanceKm,
            'baseFare'       => $baseFare,
            'baseDistanceKm' => $baseDistanceKm,
            'perKmRate'      => $perKmRate,
            'extraKm'        => $extraKm,
            'minFare'        => $minFare,
            'totalFee'       => $totalFee,
            'formulaText'    => $distanceKm <= $baseDistanceKm
                ? "₹{$baseFare} base fare (up to {$baseDistanceKm} km)"
                : "₹{$baseFare} base ({$baseDistanceKm} km) + {$extraKm} km @ ₹{$perKmRate}/km = ₹{$totalFee}"
        ];
    }
}
