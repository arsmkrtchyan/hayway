<?php
// app/Services/Geo/DistanceService.php
namespace App\Services\Geo;

class DistanceService
{
    // км по прямой (fallback). Для OSRM подключишь здесь.
    public function distanceKm(float $lat1,float $lng1,float $lat2,float $lng2): float
    {
        $R = 6371; // km
        $dLat = deg2rad($lat2-$lat1);
        $dLon = deg2rad($lng2-$lng1);
        $a = sin($dLat/2)**2 + cos(deg2rad($lat1))*cos(deg2rad($lat2))*sin($dLon/2)**2;
        $c = 2*atan2(sqrt($a), sqrt(1-$a));
        return $R*$c;
    }
}
