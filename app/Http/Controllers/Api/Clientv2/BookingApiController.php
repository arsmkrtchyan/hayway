<?php

namespace App\Http\Controllers\Api\Clientv2;

use App\Http\Controllers\Controller;
use App\Models\{Trip, RideRequest};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class BookingApiController extends Controller
{
//    public function store(Request $r, Trip $trip)
//    {
//        if ($trip->status !== 'published') {
//            return response()->json(['error'=>'trip_not_published'], 404);
//        }
//        if (!is_null($trip->driver_finished_at)) {
//            return response()->json(['error'=>'trip_already_finished'], 403);
//        }
//
//        $data = $r->validate([
//            'description' => ['required','string'],
//            'seats' => ['required','integer','min:1','max:3'],
//            'payment' => ['required','in:cash,card'],
//        ]);
//
//        $user = $r->user();
//        $free = max(0, (int)$trip->seats_total - (int)$trip->seats_taken);
//        $delta = (int)$data['seats'];
//        $maxPerUser = 3;
//
//        $existing = RideRequest::query()
//            ->where('trip_id',$trip->id)
//            ->where('user_id',$user->id)
//            ->whereIn('status',['pending','accepted'])
//            ->latest('id')->first();
//
//        if ($existing) {
//            if (($existing->seats + $delta) > $maxPerUser) {
//                return response()->json(['error'=>'seats_limit_per_user','limit'=>$maxPerUser], 422);
//            }
//            if ($free < $delta) {
//                return response()->json(['error'=>'not_enough_seats','free'=>$free], 422);
//            }
//
//            $existing->seats += $delta;
//            $existing->payment = $data['payment'];
//            $existing->description = trim(($existing->description ? ($existing->description."\n") : '').$data['description']);
//            $existing->save();
//
//            return response()->json(['data'=>['id'=>$existing->id,'status'=>'updated']], 200);
//        }
//
//        if ($free < $delta) {
//            return response()->json(['error'=>'not_enough_seats','free'=>$free], 422);
//        }
//
//        $req = RideRequest::create([
//            'trip_id'        => $trip->id,
//            'user_id'        => $user->id,
//            'passenger_name' => $user->name,
//            'phone'          => $user->number,
//            'description'    => $data['description'],
//            'seats'          => $delta,
//            'payment'        => $data['payment'],
//            'status'         => 'pending',
//        ]);
//
//        return response()->json(['data'=>['id'=>$req->id,'status'=>'created']], 201);
//    }
//    public function store(Request $r, Trip $trip)
//    {
//        if ($trip->status !== 'published') {
//            return response()->json(['error'=>'trip_not_published'], 404);
//        }
//        if (!is_null($trip->driver_finished_at)) {
//            return response()->json(['error'=>'trip_already_finished'], 403);
//        }
//
//        $data = $r->validate([
//            'description' => ['required','string'],
//            'seats'       => ['required','integer','min:1','max:3'],
//            'payment'     => ['required','in:cash,card'],
//        ]);
//
//        $user       = $r->user();
//        $delta      = (int)$data['seats'];
//        $maxPerUser = 3;
//
//        // текущее свободное место по принятым местам
//        $free = max(0, (int)$trip->seats_total - (int)$trip->seats_taken);
//
//        $existing = RideRequest::query()
//            ->where('trip_id',$trip->id)
//            ->where('user_id',$user->id)
//            ->whereIn('status',['pending','accepted'])
//            ->latest('id')
//            ->first();
//
//        if ($existing) {
//            // лимит на пользователя
//            if (($existing->seats + $delta) > $maxPerUser) {
//                return response()->json(['error'=>'seats_limit_per_user','limit'=>$maxPerUser], 422);
//            }
//            // проверка на доступность именно дополнительной дельты
//            if ($free < $delta) {
//                return response()->json(['error'=>'not_enough_seats','free'=>$free], 422);
//            }
//
//            DB::transaction(function () use ($existing, $delta, $data, $trip) {
//                // если заявка уже была принята — сразу увеличиваем seats_taken на ДЕЛЬТУ
//                if ($existing->status === 'accepted') {
//                    // блокируем строку trips от гонок
//                    $t = \App\Models\Trip::where('id', $trip->id)->lockForUpdate()->first();
//                    if (($t->seats_taken + $delta) > $t->seats_total) {
//                        abort(response()->json(['error'=>'not_enough_seats','free'=>max(0,$t->seats_total - $t->seats_taken)], 422));
//                    }
//                    $t->increment('seats_taken', $delta);
//                }
//
//                // апдейтим саму заявку
//                $existing->seats       += $delta;
//                $existing->payment      = $data['payment'];
//                $existing->description  = trim(($existing->description ? ($existing->description."\n") : '').$data['description']);
//                $existing->save();
//            });
//
//            return response()->json(['data'=>['id'=>$existing->id,'status'=>'updated']], 200);
//        }
//
//        // создаём новую pending-заявку — места в trip увеличим только при accept
//        if ($free < $delta) {
//            return response()->json(['error'=>'not_enough_seats','free'=>$free], 422);
//        }
//
//        $req = RideRequest::create([
//            'trip_id'        => $trip->id,
//            'user_id'        => $user->id,
//            'passenger_name' => $user->name,
//            'phone'          => $user->number,
//            'description'    => $data['description'],
//            'seats'          => $delta,
//            'payment'        => $data['payment'],
//            'status'         => 'pending',
//        ]);
//
//        return response()->json(['data'=>['id'=>$req->id,'status'=>'created']], 201);
//    }
    public function store(Request $r, Trip $trip)
    {
        if ($trip->status !== 'published') {
            return response()->json(['error'=>'trip_not_published'], 404);
        }
        if (!is_null($trip->driver_finished_at)) {
            return response()->json(['error'=>'trip_already_finished'], 403);
        }

        $data = $r->validate([
            'description' => ['required','string'],
            'seats'       => ['required','integer','min:1'], // убран max
            'payment'     => ['required','in:cash,card'],
        ]);

        $user  = $r->user();
        $delta = (int)$data['seats'];

        // свободные места по принятым
        $free = max(0, (int)$trip->seats_total - (int)$trip->seats_taken);

        $existing = RideRequest::query()
            ->where('trip_id',$trip->id)
            ->where('user_id',$user->id)
            ->whereIn('status',['pending','accepted'])
            ->latest('id')
            ->first();

        if ($existing) {
            // проверка доступности ДЕЛЬТЫ
            if ($free < $delta) {
                return response()->json(['error'=>'not_enough_seats','free'=>$free], 422);
            }

            DB::transaction(function () use ($existing, $delta, $data, $trip) {
                // если уже accepted — резервируем сразу
                if ($existing->status === 'accepted') {
                    $t = \App\Models\Trip::where('id', $trip->id)->lockForUpdate()->first();
                    if (($t->seats_taken + $delta) > $t->seats_total) {
                        abort(response()->json([
                            'error'=>'not_enough_seats',
                            'free'=>max(0,$t->seats_total - $t->seats_taken)
                        ], 422));
                    }
                    $t->increment('seats_taken', $delta);
                }

                $existing->seats      += $delta;
                $existing->payment     = $data['payment'];
                $existing->description = trim(($existing->description ? ($existing->description."\n") : '').$data['description']);
                $existing->save();
            });

            return response()->json(['data'=>['id'=>$existing->id,'status'=>'updated']], 200);
        }

        // новая заявка
        if ($free < $delta) {
            return response()->json(['error'=>'not_enough_seats','free'=>$free], 422);
        }

        // если трип компании — сразу accept + резерв
        $isCompanyOwned = !is_null($trip->company_id ?? ($trip->company?->id ?? null));

        if ($isCompanyOwned) {
            $reqId = DB::transaction(function () use ($trip, $user, $data, $delta) {
                $t = \App\Models\Trip::where('id',$trip->id)->lockForUpdate()->first();
                $freeNow = max(0, (int)$t->seats_total - (int)$t->seats_taken);
                if ($freeNow < $delta) {
                    abort(response()->json(['error'=>'not_enough_seats','free'=>$freeNow], 422));
                }
                $t->increment('seats_taken', $delta);

                $req = RideRequest::create([
                    'trip_id'        => $t->id,
                    'user_id'        => $user->id,
                    'passenger_name' => $user->name,
                    'phone'          => $user->number,
                    'description'    => $data['description'],
                    'seats'          => $delta,
                    'payment'        => $data['payment'],
                    'status'         => 'accepted',
                ]);

                return $req->id;
            });

            return response()->json(['data'=>['id'=>$reqId,'status'=>'created_accepted']], 201);
        }

        // по умолчанию — pending, резерв при accept
        $req = RideRequest::create([
            'trip_id'        => $trip->id,
            'user_id'        => $user->id,
            'passenger_name' => $user->name,
            'phone'          => $user->number,
            'description'    => $data['description'],
            'seats'          => $delta,
            'payment'        => $data['payment'],
            'status'         => 'pending',
        ]);

        return response()->json(['data'=>['id'=>$req->id,'status'=>'created']], 201);
    }

    public function show(Request $r, $id)
    {
        $req = RideRequest::where('id',$id)
            ->where('user_id',$r->user()->id)
            ->firstOrFail();

        if ($req->status === 'deleted') {
            return response()->json(['error'=>'deleted'], 410);
        }

        $trip = Trip::query()
            ->with([
                'stops:id,trip_id,lat,lng,position,name,addr',
                'vehicle:id,brand,model,plate,color',
                'amenities:id,amenity_category_id,name,slug,icon',
                'driver:id,name,number,rating',
                'assignedDriver:id,name,number,rating',
            ])
            ->findOrFail($req->trip_id);

        // кто фактический водитель для клиента
        $driverUser = $trip->assignedDriver ?: $trip->driver;

        $freeAvailable = max(0, (int)$trip->seats_total - (int)$trip->seats_taken);

        return response()->json([
            'data' => [
                'id'         => (int)$req->id,
                'code'       => 'TX-' . $req->id,
                'status'     => (string)$req->status,
                'seats'      => (int)$req->seats,
                'payment'    => (string)$req->payment,
                'created_at' => optional($req->created_at)->toIso8601String(),

                // ← ЗДЕСЬ ТЕПЕРЬ ИНФО О ВОДИТЕЛЕ
                'driver' => $driverUser ? [
                    'id'     => (int)$driverUser->id,
                    'name'   => (string)$driverUser->name,
                    'phone'  => (string)($driverUser->number ?? ''),
                    'rating' => (float)($driverUser->rating ?? 5),
                    'type'   => $trip->assigned_driver_id ? 'assigned' : 'owner',
                ] : null,

                'trip' => [
                    'id'                 => (int)$trip->id,
                    'from'               => (string)$trip->from_addr,
                    'to'                 => (string)$trip->to_addr,
                    'from_lat'           => (float)($trip->from_lat ?? 0),
                    'from_lng'           => (float)($trip->from_lng ?? 0),
                    'to_lat'             => (float)($trip->to_lat ?? 0),
                    'to_lng'             => (float)($trip->to_lng ?? 0),
                    'departure_at'       => optional($trip->departure_at)->toIso8601String(),
                    'driver_finished_at' => optional($trip->driver_finished_at)->toIso8601String(),
                    'price_amd'          => (int)$trip->price_amd,
                    'seats_total'        => (int)$trip->seats_total,
                    'seats_taken'        => (int)$trip->seats_taken,
                    'free_available'     => (int)$freeAvailable,

                    'vehicle' => [
                        'brand' => $trip->vehicle->brand ?? null,
                        'model' => $trip->vehicle->model ?? null,
                        'plate' => $trip->vehicle->plate ?? null,
                        'color' => $trip->vehicle->color ?? null,
                    ],

                    'stops' => $trip->stops->sortBy('position')->values()->map(fn($s) => [
                        'position' => (int)$s->position,
                        'lat'      => (float)$s->lat,
                        'lng'      => (float)$s->lng,
                        'name'     => (string)($s->name ?? ''),
                        'addr'     => (string)($s->addr ?? ''),
                    ]),

                    'amenity_ids' => $trip->amenity_ids,
                    'amenities'   => $trip->amenities->map(fn($a)=>[
                        'id'          => $a->id,
                        'category_id' => $a->amenity_category_id,
                        'name'        => $a->name,
                        'slug'        => $a->slug,
                        'icon'        => $a->icon,
                    ])->values(),

                    'policy' => ['cancelMinBefore'=>30],
                ],
            ],
        ]);
    }

}
