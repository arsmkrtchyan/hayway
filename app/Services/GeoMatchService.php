<?php

namespace App\Services;

use App\Models\RiderOrder;
use App\Models\Trip;
use Illuminate\Support\Collection;

class GeoMatchService
{
    /** Хаверсин: расстояние между двумя точками (км) */
    public static function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R = 6371; // km
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lng2 - $lng1);
        $a = sin($dLat/2)**2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon/2)**2;
        return 2 * $R * asin(min(1, sqrt($a)));
    }

    /**
     * Плоская эвклидова проекция (equirectangular) в окрестности lat0.
     * Возвращает расстояние (м) от точки P до отрезка AB.
     */
    public static function distancePointToSegmentMeters(float $plat, float $plng, float $alat, float $alng, float $blat, float $blng): float
    {
        $lat0 = deg2rad(($alat + $blat + $plat) / 3);
        $kx = 111320 * cos($lat0); // м/град по долготе
        $ky = 110540;              // м/град по широте (среднее)

        $Ax = ($alng) * $kx; $Ay = ($alat) * $ky;
        $Bx = ($blng) * $kx; $By = ($blat) * $ky;
        $Px = ($plng) * $kx; $Py = ($plat) * $ky;

        $ABx = $Bx - $Ax; $ABy = $By - $Ay;
        $APx = $Px - $Ax; $APy = $Py - $Ay;
        $ab2 = $ABx*$ABx + $ABy*$ABy;
        if ($ab2 <= 1e-6) {
            $dx = $Px - $Ax; $dy = $Py - $Ay;
            return sqrt($dx*$dx + $dy*$dy);
        }
        $t = max(0, min(1, ($APx*$ABx + $APy*$ABy)/$ab2));
        $Cx = $Ax + $t*$ABx; $Cy = $Ay + $t*$ABy;
        $dx = $Px - $Cx; $dy = $Py - $Cy;
        return sqrt($dx*$dx + $dy*$dy);
    }

    /** true, если точка (lat,lng) находится в «коридоре» ширины corridorKm вокруг polyline */
    public static function inCorridor(array $routePoints, float $lat, float $lng, float $corridorKm): bool
    {
        if (empty($routePoints) || count($routePoints) < 2) return false;
        $limit = $corridorKm * 1000.0;
        $min = INF;
        for ($i=0; $i < count($routePoints)-1; $i++) {
            $a = $routePoints[$i];
            $b = $routePoints[$i+1];
            if (!isset($a['lat'],$a['lng'],$b['lat'],$b['lng'])) continue;
            $d = self::distancePointToSegmentMeters($lat,$lng,(float)$a['lat'],(float)$a['lng'],(float)$b['lat'],(float)$b['lng']);
            if ($d < $min) $min = $d;
            if ($min <= $limit) return true;
        }
        return $min <= $limit;
    }

    /**
     * Отфильтровать заказы под трип по режиму:
     * - mode=radius: обе точки (или имеющиеся) в радиусе R от соответствующих from/to трипа
     * - mode=corridor: точки попадают в коридор вдоль route_points
     */
    public function filterOrdersForTrip(Trip $trip, Collection $orders, string $mode='radius', float $radiusKm=5, ?float $corridorKm=null): Collection
    {
        $corridor = $corridorKm ?? (float)($trip->corridor_km ?? 5);
        $rp = $trip->route_points ?? [];

        return $orders->filter(function(RiderOrder $o) use ($trip,$mode,$radiusKm,$corridor,$rp) {
            $hasFrom = is_numeric($o->from_lat) && is_numeric($o->from_lng);
            $hasTo   = is_numeric($o->to_lat)   && is_numeric($o->to_lng);

            if (!$hasFrom && !$hasTo) return false;

            if ($mode === 'corridor' && !empty($rp)) {
                // точка(и) в коридоре
                $okFrom = !$hasFrom || self::inCorridor($rp,(float)$o->from_lat,(float)$o->from_lng,$corridor);
                $okTo   = !$hasTo   || self::inCorridor($rp,(float)$o->to_lat,(float)$o->to_lng,$corridor);
                return $okFrom && $okTo;
            }

            // радиус от from/to трипа
            $okFrom = true; $okTo = true;
            if ($hasFrom && is_numeric($trip->from_lat) && is_numeric($trip->from_lng)) {
                $okFrom = self::haversineKm((float)$o->from_lat,(float)$o->from_lng,(float)$trip->from_lat,(float)$trip->from_lng) <= $radiusKm;
            }
            if ($hasTo && is_numeric($trip->to_lat) && is_numeric($trip->to_lng)) {
                $okTo = self::haversineKm((float)$o->to_lat,(float)$o->to_lng,(float)$trip->to_lat,(float)$trip->to_lng) <= $radiusKm;
            }
            return $okFrom && $okTo;
        })->values();
    }
}
