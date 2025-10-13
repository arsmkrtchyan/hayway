<?php

namespace App\Http\Controllers\Driver;

use App\Http\Controllers\Controller;
use App\Models\{Trip, RideRequest};
use App\Services\Geo\OsrmService;
use Illuminate\Http\Request;

class TripSimController extends Controller
{
    public function preview(Request $http, Trip $trip, RideRequest $rideRequest, OsrmService $osrm)
    {
        // Վարորդի հասանելիության ստուգում
        abort_unless(in_array(auth()->id(), array_filter([$trip->user_id, $trip->assigned_driver_id]), true), 403);
        abort_unless((int)$rideRequest->trip_id === (int)$trip->id, 404);

        // Պետք են pickup/drop կետերը
        $meta = (array)($rideRequest->meta ?? []);
        $toAdd = [];
        foreach (['pickup','drop'] as $k) {
            if (!empty($meta[$k]['lat']) && !empty($meta[$k]['lng'])) {
                $toAdd[] = [
                    'lat' => (float)$meta[$k]['lat'],
                    'lng' => (float)$meta[$k]['lng'],
                    'name'=> $meta[$k]['name'] ?? null,
                    'addr'=> $meta[$k]['addr'] ?? null,
                    '_type'=>'stop',
                ];
            }
        }
        if (!$toAdd) {
            return response()->json(['ok'=>false,'error'=>'NO_POINTS'], 422);
        }

        $from = ['lat'=>(float)$trip->from_lat,'lng'=>(float)$trip->from_lng,'_type'=>'from'];
        $to   = ['lat'=>(float)$trip->to_lat,  'lng'=>(float)$trip->to_lng,  '_type'=>'to'];

        $existing = $trip->stops()->orderBy('position')->get(['lat','lng','name','addr'])
            ->map(fn($s)=>['lat'=>(float)$s->lat,'lng'=>(float)$s->lng,'name'=>$s->name,'addr'=>$s->addr,'_type'=>'stop'])
            ->all();

        // Բազային տևողություն
        $basePoints = array_map(fn($p)=>['lat'=>$p['lat'],'lng'=>$p['lng']], array_merge([$from], $existing, [$to]));
        $baseDur = $osrm->routeDurationSec($basePoints) ?: null;

        // Օպտիմալացում՝ նոր կետերով
        $optimized = $osrm->optimizeBetween($from, array_merge($existing, $toAdd), $to);

        $newStops = [];
        foreach ($optimized as $p) {
            if (($p['_type'] ?? '') === 'stop') {
                $newStops[] = [
                    'lat'=>$p['lat'],
                    'lng'=>$p['lng'],
                    'name'=>$p['name'] ?? null,
                    'addr'=>$p['addr'] ?? null,
                ];
            }
        }
        $newStops = array_slice($newStops, 0, 10);

        $newPoints = array_map(fn($p)=>['lat'=>$p['lat'],'lng'=>$p['lng']], array_merge([$from], $optimized, [$to]));
        $newDur = $osrm->routeDurationSec($newPoints) ?: null;

        // Եկամուտների պրեվյու
        $current = (int) $trip->rideRequests()->where('status','accepted')->sum('price_amd');
        $plus = ($rideRequest->status === 'accepted') ? 0 : (int)($rideRequest->price_amd ?? 0);
        $projected = $current + $plus;

        return response()->json([
            'ok' => true,
            'base_duration_sec' => $baseDur,
            'new_duration_sec'  => $newDur,
            'delta_sec'         => (is_null($baseDur)||is_null($newDur)) ? null : ($newDur - $baseDur),
            'stops'             => $newStops,
            'earnings'          => ['current'=>$current,'plus'=>$plus,'projected'=>$projected],
        ]);
    }
}
