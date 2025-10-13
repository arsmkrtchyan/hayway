<?php
// app/Services/Geo/TripEtaService.php
namespace App\Services\Geo;

use App\Models\Trip;

class TripEtaService
{
public function __construct(private OsrmService $osrm) {}

/** Пересчитать и сохранить ETA по текущим from -> stops -> to */
public function recalcAndSave(Trip $trip): ?int
{
$points = [];

$points[] = ['lng'=>(float)$trip->from_lng, 'lat'=>(float)$trip->from_lat];

$stops = $trip->stops()->orderBy('position')->get(['lat','lng']);
foreach ($stops as $s) {
$points[] = ['lng'=>(float)$s->lng, 'lat'=>(float)$s->lat];
}

$points[] = ['lng'=>(float)$trip->to_lng, 'lat'=>(float)$trip->to_lat];

$sec = $this->osrm->routeDurationSec($points);
if ($sec) $trip->update(['eta_sec' => $sec]);

return $sec;
}
}
