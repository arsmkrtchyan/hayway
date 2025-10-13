<?php
// app/Http/Controllers/Driver/TripStopRequestsController.php

namespace App\Http\Controllers\Driver;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Driver\TripStopsController; // для bulk replace
use App\Models\{Trip, TripStopRequest};
use App\Services\Geo\OsrmService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TripStopRequestsController extends Controller
{
    public function index(Trip $trip)
    {
        abort_unless(in_array(auth()->id(), array_filter([$trip->user_id, $trip->assigned_driver_id])), 403);

        $items = TripStopRequest::where('trip_id',$trip->id)->latest()->get();
        return inertia('Driver/TripStopRequests', [
            'trip' => ['id'=>$trip->id, 'from'=>$trip->from_addr, 'to'=>$trip->to_addr],
            'items'=> $items,
        ]);
    }

    public function accept(Request $r, TripStopRequest $tsr, OsrmService $osrm)
    {
        $trip = $tsr->trip;
        abort_unless(in_array(auth()->id(), array_filter([$trip->user_id, $trip->assigned_driver_id])), 403);
        if ($tsr->status !== 'pending') return back();

        DB::transaction(function() use ($trip, $tsr, $osrm) {
            // Пересчёт оптимального порядка (свежий, на всякий случай)
            $from = ['lat'=>(float)$trip->from_lat, 'lng'=>(float)$trip->from_lng,'name'=>null,'addr'=>null,'_type'=>'from'];
            $to   = ['lat'=>(float)$trip->to_lat,   'lng'=>(float)$trip->to_lng,  'name'=>null,'addr'=>null,'_type'=>'to'];
            $stops = $trip->stops()->orderBy('position')->get(['lat','lng','name','addr'])
                ->map(fn($s)=>['lat'=>(float)$s->lat,'lng'=>(float)$s->lng,'name'=>$s->name,'addr'=>$s->addr,'_type'=>'stop'])->all();
            $newStop = ['lat'=>(float)$tsr->lat,'lng'=>(float)$tsr->lng,'name'=>$tsr->name,'addr'=>$tsr->addr,'_type'=>'stop'];

            $optimized = $osrm->optimizeBetween($from, array_merge($stops, [$newStop]), $to);

            // Сформируем payload для TripStopsController::replace
            $newStops = [];
            foreach ($optimized as $p) {
                if (($p['_type'] ?? '') === 'stop') {
                    $newStops[] = [
                        'lat'=>$p['lat'], 'lng'=>$p['lng'],
                        'name'=>$p['name'] ?? null, 'addr'=>$p['addr'] ?? null,
                    ];
                }
            }

            app(TripStopsController::class)->replace(
                new Request(['stops'=>$newStops]),
                $trip
            );

            $tsr->update([
                'status' => 'accepted',
                'decided_by' => auth()->id(),
                'decided_at' => now(),
                'new_order' => $optimized,
                'new_duration_sec' => $osrm->routeDurationSec(array_map(fn($p)=>['lat'=>$p['lat'],'lng'=>$p['lng']], $optimized)),
            ]);
            if (!empty($tsr->new_duration_sec)) {
                $trip->update(['eta_sec' => (int)$tsr->new_duration_sec]);
            }
        });
        app(\App\Services\Geo\TripEtaService::class)->recalcAndSave($trip);
        return back()->with('ok','stop_request_accepted');
    }

    public function decline(TripStopRequest $tsr)
    {
        $trip = $tsr->trip;
        abort_unless(in_array(auth()->id(), array_filter([$trip->user_id, $trip->assigned_driver_id])), 403);
        if ($tsr->status !== 'pending') return back();

        $tsr->update([
            'status' => 'declined',
            'decided_by' => auth()->id(),
            'decided_at' => now(),
        ]);
        return back()->with('ok','stop_request_declined');
    }
}
