<?php
namespace App\Http\Controllers\Driver;
use App\Http\Controllers\Controller;
use App\Models\{Trip, RideRequest};
use Illuminate\Http\Request;
use App\Models\{Conversation, ConversationParticipant as CP};
use App\Http\Controllers\Chat\ChatV2Controller as ChatV2;

use Illuminate\Support\Facades\DB;
use App\Services\Geo\OsrmService;
class RideRequestController extends Controller
{


    public function fake(Trip $trip)
    {
        abort_unless(in_array(auth()->id(), array_filter([$trip->user_id, $trip->assigned_driver_id])), 403);

        RideRequest::create([
            'trip_id'        => $trip->id,
            'user_id'        => auth()->id(), // чтобы потом корректно определить клиента
            'passenger_name' => 'Թեստային Ուղևոր',
            'phone'          => '+374 77 00 00 00',
            'seats'          => 1,
            'payment'        => 'cash',
            'status'         => 'pending',
        ]);
        return back();
    }

    /**
     * Создаёт/находит conversation для заявки и добавляет участников.
     */

    public function accept(RideRequest $requestModel, \App\Services\Geo\OsrmService $osrm)
    {
        $trip = $requestModel->trip;
        $allowedIds = array_filter([$trip->user_id, $trip->assigned_driver_id]);
        abort_unless(in_array(auth()->id(), $allowedIds, true), 403);
        if ($requestModel->status !== 'pending') return back();

        DB::transaction(function () use ($requestModel, $trip, $osrm) {
            // 1) Места и статус
            if ($trip->seats_taken + $requestModel->seats <= $trip->seats_total) {
                $trip->increment('seats_taken', $requestModel->seats);
                $requestModel->update([
                    'status' => 'accepted',
                    'decided_by_user_id' => auth()->id(),
                    'decided_at' => now(),
                ]);
            } else {
                return;
            }

            // 2) Подмешиваем точки из meta (pickup/drop) в stops и оптимизируем
            $meta = (array) ($requestModel->meta ?? []);
            $mk = function ($p) {
                if (!is_array($p) || !isset($p['lat'],$p['lng'])) return null;
                return ['lat'=>(float)$p['lat'],'lng'=>(float)$p['lng'],'name'=>$p['name']??null,'addr'=>$p['addr']??null,'_type'=>'stop'];
            };
            $toAdd = [];
            if (!empty($meta['pickup'])) $toAdd[] = $mk($meta['pickup']);
            if (!empty($meta['drop']))   $toAdd[] = $mk($meta['drop']);
            $toAdd = array_values(array_filter($toAdd));

            if ($toAdd) {
                $from = ['lat'=>(float)$trip->from_lat,'lng'=>(float)$trip->from_lng,'_type'=>'from'];
                $to   = ['lat'=>(float)$trip->to_lat,  'lng'=>(float)$trip->to_lng,  '_type'=>'to'];

                $existing = $trip->stops()->orderBy('position')->get(['lat','lng','name','addr'])
                    ->map(fn($s)=>['lat'=>(float)$s->lat,'lng'=>(float)$s->lng,'name'=>$s->name,'addr'=>$s->addr,'_type'=>'stop'])->all();

                $optimized = $osrm->optimizeBetween($from, array_merge($existing,$toAdd), $to);

                $newStops = [];
                foreach ($optimized as $p) {
                    if (($p['_type'] ?? '') === 'stop') {
                        $newStops[] = ['lat'=>$p['lat'],'lng'=>$p['lng'],'name'=>$p['name']??null,'addr'=>$p['addr']??null];
                    }
                }
                $newStops = array_slice($newStops,0,10);

                $trip->stops()->delete();
                foreach ($newStops as $i => $row) {
                    $trip->stops()->create($row + ['position'=>$i+1]);
                }

                // 3) ETA
                $dur = $osrm->routeDurationSec(
                    array_map(fn($p)=>['lat'=>$p['lat'],'lng'=>$p['lng']], array_merge([$from], $optimized, [$to]))
                );
                if ($dur) $trip->update(['eta_sec'=>(int)$dur]);
            }
        });

        // карточка/чат как было
        $conv = $this->ensureConversation($requestModel);
        app(\App\Http\Controllers\Chat\ChatV2Controller::class)->openByRequest(request(), $requestModel);

        return back();
    }

//    public function accept(RideRequest $requestModel, OsrmService $osrm)
//    {
//        $trip = $requestModel->trip;
//        $allowedIds = array_filter([$trip->user_id, $trip->assigned_driver_id]);
//        abort_unless(in_array(auth()->id(), $allowedIds, true), 403);
//
//        if ($requestModel->status !== 'pending') return back();
//
//        DB::transaction(function () use ($requestModel, $trip, $osrm) {
//            // 1) Места и статус
//            if ($trip->seats_taken + $requestModel->seats <= $trip->seats_total) {
//                $trip->increment('seats_taken', $requestModel->seats);
//                $requestModel->update([
//                    'status' => 'accepted',
//                    'decided_by_user_id' => auth()->id(),
//                    'decided_at' => now(),
//                ]);
//            } else {
//                // мест не хватило — просто выходим
//                return;
//            }
//
//            // 2) Подмешиваем точки из meta (pickup/drop) в stops и оптимизируем
//            $meta = (array) ($requestModel->meta ?? []);
//            $type = $meta['type'] ?? null;
//
//            $mk = function ($p) {
//                if (!is_array($p)) return null;
//                if (!isset($p['lat'], $p['lng'])) return null;
//                return [
//                    'lat' => (float) $p['lat'],
//                    'lng' => (float) $p['lng'],
//                    'name'=> $p['name'] ?? null,
//                    'addr'=> $p['addr'] ?? null,
//                    '_type'=>'stop',
//                ];
//            };
//
//            $toAdd = [];
//            if ($type === 'A_PAX'  && !empty($meta['pickup'])) $toAdd[] = $mk($meta['pickup']);
//            if ($type === 'PAX_B'  && !empty($meta['drop']))   $toAdd[] = $mk($meta['drop']);
//            if ($type === 'PAX_PAX'){
//                if (!empty($meta['pickup'])) $toAdd[] = $mk($meta['pickup']);
//                if (!empty($meta['drop']))   $toAdd[] = $mk($meta['drop']);
//            }
//            $toAdd = array_values(array_filter($toAdd)); // убрали null
//
//            if (count($toAdd) > 0) {
//                $from = ['lat'=>(float)$trip->from_lat,'lng'=>(float)$trip->from_lng,'_type'=>'from'];
//                $to   = ['lat'=>(float)$trip->to_lat,  'lng'=>(float)$trip->to_lng,  '_type'=>'to'];
//
//                $existing = $trip->stops()->orderBy('position')->get(['lat','lng','name','addr'])
//                    ->map(fn($s)=>[
//                        'lat'=>(float)$s->lat,'lng'=>(float)$s->lng,
//                        'name'=>$s->name,'addr'=>$s->addr,'_type'=>'stop'
//                    ])->all();
//
//                $optimized = $osrm->optimizeBetween($from, array_merge($existing, $toAdd), $to);
//
//                $newStops = [];
//                foreach ($optimized as $p) {
//                    if (($p['_type'] ?? '') === 'stop') {
//                        $newStops[] = [
//                            'lat'=>$p['lat'],
//                            'lng'=>$p['lng'],
//                            'name'=>$p['name'] ?? null,
//                            'addr'=>$p['addr'] ?? null,
//                        ];
//                    }
//                }
//
//                // ограничение в 10
//                $newStops = array_slice($newStops, 0, 10);
//
//                // перезапись trip_stops (без вызова контроллера и его 403 на assigned_driver)
//                $trip->stops()->delete();
//                foreach ($newStops as $i => $row) {
//                    $trip->stops()->create($row + ['position' => $i+1]);
//                }
//            }
//        });
//
//        // 3) Чат/карточка — вне транзакции
//        $conv = $this->ensureConversation($requestModel);
//        app(ChatV2::class)->openByRequest(request(), $requestModel);
//
//        return back();
//    }

    public function openChat(RideRequest $requestModel)
    {
        $trip = $requestModel->trip;
        $allowedIds = array_filter([$trip->user_id, $trip->assigned_driver_id]);
        abort_unless(in_array(auth()->id(), $allowedIds, true), 403);

        $conv = $this->ensureConversation($requestModel);
        app(ChatV2::class)->openByRequest(request(), $requestModel); // чтобы карточка точно была
        return redirect()->route('chat', ['open' => $conv->id]);
    }

    public function reject(RideRequest $requestModel)
    {
        $trip = $requestModel->trip;
        $allowedIds = array_filter([$trip->user_id, $trip->assigned_driver_id]);
        abort_unless(in_array(auth()->id(), $allowedIds, true), 403);

        // если заявка была уже принята — освободить места
        if ($requestModel->status === 'accepted') {
            $delta = max(0, (int) $requestModel->seats);
            $trip->update(['seats_taken' => max(0, $trip->seats_taken - $delta)]);
        }

        if (in_array($requestModel->status, ['pending','accepted'])) {
            $requestModel->update([
                'status' => 'rejected',
                'decided_by_user_id' => auth()->id(),
                'decided_at' => now(),
            ]);
        }
        return back();
    }


    private function ensureConversation(RideRequest $req)
    {
        $trip = $req->trip()->firstOrFail();
        $driverId = $trip->assigned_driver_id ?: $trip->user_id;
        $clientId = $req->user_id;

        // один диалог на пару driver–client
        $conv = \App\Models\Conversation::updateOrCreate(
            ['driver_user_id' => $driverId, 'client_user_id' => $clientId],
            ['status' => 'open', 'ride_request_id' => $req->id] // можно писать последний request_id
        );

        \App\Models\ConversationParticipant::firstOrCreate(
            ['conversation_id'=>$conv->id,'user_id'=>$driverId],
            ['role'=>'driver']
        );
        if ($clientId) {
            \App\Models\ConversationParticipant::firstOrCreate(
                ['conversation_id'=>$conv->id,'user_id'=>$clientId],
                ['role'=>'client']
            );
        }

        return $conv;
    }

}
