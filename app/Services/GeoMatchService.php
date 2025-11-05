<?php
// app/Services/GeoMatchService.php
namespace App\Services;

use App\Models\RiderOrder;
use App\Models\Trip;

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

    /** Расстояние (м) от точки P до отрезка AB в эквирект. проекции */
    public static function distancePointToSegmentMeters(
        float $plat, float $plng,
        float $alat, float $alng,
        float $blat, float $blng
    ): float {
        $lat0 = deg2rad(($alat + $blat + $plat) / 3);
        $kx = 111320 * cos($lat0); // м/град по долготе
        $ky = 110540;              // м/град по широте

        $Ax = $alng * $kx; $Ay = $alat * $ky;
        $Bx = $blng * $kx; $By = $blat * $ky;
        $Px = $plng * $kx; $Py = $plat * $ky;

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

    /** Мин. расстояние (м) до полилинии */
    public static function minDistanceToPolylineMeters(float $lat, float $lng, array $poly): float
    {
        $n = count($poly);
        if ($n < 2) {
            return 1e12;
        }
        $best = 1e12;
        for ($i=0; $i<$n-1; $i++) {
            $a = $poly[$i];   // ['lat'=>..,'lng'=>..]
            $b = $poly[$i+1];
            $d = self::distancePointToSegmentMeters($lat,$lng,$a['lat'],$a['lng'],$b['lat'],$b['lng']);
            if ($d < $best) $best = $d;
        }
        return $best;
    }

    /** Полилиния маршрута: из route_points или из trip_stops, иначе A→B */
    public static function buildPolylineForTrip(Trip $t): array
    {
        if (is_array($t->route_points) && count($t->route_points) >= 2) {
            return array_map(fn($p)=>['lat'=>(float)$p['lat'],'lng'=>(float)$p['lng']], $t->route_points);
        }
        if (method_exists($t,'stops') && $t->relationLoaded('stops')) {
            $pts = [];
            foreach ($t->stops as $s) $pts[] = ['lat'=>(float)$s->lat,'lng'=>(float)$s->lng];
            if (count($pts) >= 2) return $pts;
        }
        if ($t->from_lat && $t->from_lng && $t->to_lat && $t->to_lng) {
            return [
                ['lat'=>(float)$t->from_lat,'lng'=>(float)$t->from_lng],
                ['lat'=>(float)$t->to_lat,'lng'=>(float)$t->to_lng],
            ];
        }
        return [];
    }

    /** Проверка радиуса вокруг точки (км) */
    public static function pointWithinRadiusKm(?float $plat, ?float $plng, float $clat, float $clng, float $radiusKm): bool
    {
        if ($plat === null || $plng === null) return false;
        return self::haversineKm($plat,$plng,$clat,$clng) <= $radiusKm;
    }

    /** Матч радиусами A и B. Совпадения по любой стороне достаточно. */
    public static function matchByRadius(RiderOrder $o, Trip $t, float $radiusA, float $radiusB): array
    {
        $hitA = false; $hitB = false;

        if ($t->from_lat && $t->from_lng) {
            $hitA = self::pointWithinRadiusKm($o->from_lat, $o->from_lng, $t->from_lat, $t->from_lng, $radiusA);
        }
        if ($t->to_lat && $t->to_lng) {
            $hitB = self::pointWithinRadiusKm($o->to_lat, $o->to_lng, $t->to_lat, $t->to_lng, $radiusB);
        }

        // если у заказа только одна из точек — используем её одну
        $match = $hitA || $hitB;
        return ['match'=>$match,'hitA'=>$hitA,'hitB'=>$hitB,'mode'=>'radius'];
    }

    /** Матч коридором вдоль полилинии, ширина corridorKm. Любая точка заказа. */
    public static function matchByCorridor(RiderOrder $o, Trip $t, float $corridorKm): array
    {
        $poly = self::buildPolylineForTrip($t);
        if (count($poly) < 2) {
            return ['match'=>false,'why'=>'no_polyline','mode'=>'corridor'];
        }
        $limM = $corridorKm * 1000.0;

        $hitFrom = false; $hitTo = false;
        if ($o->from_lat && $o->from_lng) {
            $d = self::minDistanceToPolylineMeters($o->from_lat, $o->from_lng, $poly);
            $hitFrom = $d <= $limM;
        }
        if ($o->to_lat && $o->to_lng) {
            $d = self::minDistanceToPolylineMeters($o->to_lat, $o->to_lng, $poly);
            $hitTo = $d <= $limM;
        }
        $match = $hitFrom || $hitTo;
        return ['match'=>$match,'hitFrom'=>$hitFrom,'hitTo'=>$hitTo,'mode'=>'corridor'];
    }
}
