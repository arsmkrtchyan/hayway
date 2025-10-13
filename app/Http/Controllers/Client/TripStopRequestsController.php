<?php
// app/Http/Controllers/Client/TripStopRequestsController.php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\{Trip, TripStopRequest};
use App\Services\Geo\OsrmService;
use Illuminate\Http\Request;

class TripStopRequestsController extends Controller
{
    /**
     * Создать запрос на добавление новой остановки в маршрут (без брони мест).
     * В meta/preview ничего не храним — просто сохраняем черновик с оценками длительности.
     */
    public function store(Request $r, Trip $trip, OsrmService $osrm)
    {
        abort_if($trip->status !== 'published', 404);
        abort_if(!is_null($trip->driver_finished_at), 403);

        $data = $r->validate([
            'name' => ['nullable','string','max:120'],
            'addr' => ['nullable','string','max:255'],
            'lat'  => ['required','numeric','between:-90,90'],
            'lng'  => ['required','numeric','between:-180,180'],
        ]);

        // Текущий порядок точек
        $from = ['lat'=>(float)$trip->from_lat, 'lng'=>(float)$trip->from_lng, 'label'=>'from'];
        $to   = ['lat'=>(float)$trip->to_lat,   'lng'=>(float)$trip->to_lng,   'label'=>'to'];
        $stops = $trip->stops()->orderBy('position')->get(['lat','lng','name','addr'])
            ->map(fn($s)=>['lat'=>(float)$s->lat,'lng'=>(float)$s->lng,'label'=>'stop','name'=>$s->name,'addr'=>$s->addr])->all();

        $oldPts = array_merge([$from], $stops, [$to]);
        $oldDuration = $osrm->routeDurationSec(array_map(fn($p)=>['lng'=>$p['lng'],'lat'=>$p['lat']], $oldPts)) ?? null;

        // Предпросмотр с новой точкой
        $newStop = ['lat'=>(float)$data['lat'],'lng'=>(float)$data['lng'],'label'=>'stop','name'=>$data['name']??null,'addr'=>$data['addr']??null];
        $optimized = $osrm->optimizeBetween($from, array_merge($stops, [$newStop]), $to);
        $newDuration = $osrm->routeDurationSec(array_map(fn($p)=>['lng'=>$p['lng'],'lat'=>$p['lat']], $optimized)) ?? null;

        $req = TripStopRequest::create([
            'conversation_id' => null, // можно подставить существующий чат, если есть
            'trip_id'   => $trip->id,
            'requester_id' => $r->user()->id,
            'status'    => 'pending',
            'name'      => $data['name'] ?? null,
            'addr'      => $data['addr'] ?? null,
            'lat'       => (float)$data['lat'],
            'lng'       => (float)$data['lng'],
            'old_duration_sec' => $oldDuration,
            'new_duration_sec' => $newDuration,
            'old_order' => $oldPts,
            'new_order' => $optimized,
        ]);

        return back()->with('ok','stop_request_sent')->with('trip_stop_request_id', $req->id);
    }
}
