<?php
// app/Services/Geo/OsrmService.php

namespace App\Services\Geo;

use Illuminate\Support\Facades\Http;

class OsrmService
{
    private string $base;

    public function __construct(?string $base = null)
    {
        $this->base = rtrim($base ?: 'https://router.project-osrm.org', '/');
    }

    /**
     * Подсчёт суммарной длительности (сек) для прямого маршрута по точкам.
     * $points = [['lng'=>..., 'lat'=>...], ...]
     */
    public function routeDurationSec(array $points, string $profile = 'driving'): ?int
    {
        $coords = collect($points)
            ->filter(fn($p)=>is_finite($p['lng']??null) && is_finite($p['lat']??null))
            ->map(fn($p)=>$p['lng'].','.$p['lat'])->implode(';');

        if ($coords === '' || substr_count($coords,';') < 1) return null;

        $url = "{$this->base}/route/v1/{$profile}/{$coords}?overview=false&steps=false&annotations=duration";
        $r = Http::timeout(10)->get($url);
        if (!$r->ok()) return null;
        $data = $r->json();
        $sec = (int) round(($data['routes'][0]['duration'] ?? 0));
        return $sec > 0 ? $sec : null;
    }

    /**
     * Оптимизация порядка остановок между фиксированным стартом и финишем.
     * Возвращает массив точек в новом порядке: [start, ...stops..., end]
     *
     * $from = ['lng'=>..,'lat'=>..,'payload'=>mixed]
     * $stops = [ ['lng'=>..,'lat'=>..,'payload'=>mixed], ... ]
     * $to   = ['lng'=>..,'lat'=>..,'payload'=>mixed]
     */
    public function optimizeBetween(array $from, array $stops, array $to, string $profile = 'driving'): array
    {
        $pts = array_values(array_merge([$from], $stops, [$to]));
        $coords = collect($pts)->map(fn($p)=>$p['lng'].','.$p['lat'])->implode(';');

        // OSRM trip: фиксируем начало и конец, без закольцовки
        $url = "{$this->base}/trip/v1/{$profile}/{$coords}?roundtrip=false&source=first&destination=last&overview=false";
        $r = Http::timeout(12)->get($url);
        if (!$r->ok()) return $pts;

        $data = $r->json();
        $waypoints = $data['waypoints'] ?? [];
        if (!$waypoints || !isset($waypoints[0]['waypoint_index'])) return $pts;

        // waypoints идут в исходном порядке точек; waypoint_index — позиция в оптимальном пути
        $order = [];
        foreach ($waypoints as $i => $wp) {
            $order[(int)$wp['waypoint_index']] = $pts[$i];
        }

        ksort($order);
        return array_values($order);
    }
}
