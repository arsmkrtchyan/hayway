<?php
// 
// namespace App\Http\Controllers\Api\Driverv2;
// 
// use App\Http\Controllers\Controller;
// use App\Models\{Trip, RideRequest, Rating};
// use Illuminate\Http\Request;
// 
// class TripShowApiController extends Controller
// {
//     /**
//      * GET /api/driverv2/trip-show/{trip}
//      * Доступ: владелец рейса или назначенный водитель.
//      */
//     public function show(Request $r, Trip $trip)
//     {
//         $uid = $r->user()->id;
//         abort_unless(in_array($uid, array_filter([$trip->user_id, $trip->assigned_driver_id], fn($v)=>!is_null($v))), 403);
// 
//         $trip->load([
//             'stops:id,trip_id,position,name,addr,lat,lng',
//             'vehicle:id,brand,model,plate,color',
//         ]);
// 
//         // Заявки по рейсу (для таблицы на странице)
//         $requests = RideRequest::query()
//             ->where('trip_id', $trip->id)
//             ->orderByDesc('id')
//             ->get(['id','trip_id','user_id','passenger_name','number','seats','payment','status']);
// 
//         // Рейтинги (для скрытия формы оценки уже оценённых пассажиров)
//         $ratings = Rating::where('trip_id', $trip->id)
//             ->get(['user_id','rating','description'])
//             ->keyBy('user_id')
//             ->map(fn($r)=>[
//                 'rating'      => (float)$r->rating,
//                 'description' => (string)($r->description ?? ''),
//             ])
//             ->all();
// 
//         // KPI (удобно для сайдбара)
//         $acceptedSeats = (int) RideRequest::where('trip_id',$trip->id)->where('status','accepted')->sum('seats');
//         $pendingSeats  = (int) RideRequest::where('trip_id',$trip->id)->where('status','pending')->sum('seats');
//         $freeSeats     = max(0, (int)$trip->seats_total - $acceptedSeats);
//         $earningsAMD   = (int)($acceptedSeats * (int)$trip->price_amd);
// 
//         return response()->json([
//             'data' => [
//                 'trip' => [
//                     'id'                 => (int)$trip->id,
//                     'from_addr'          => (string)$trip->from_addr,
//                     'to_addr'            => (string)$trip->to_addr,
//                     'from_lat'           => (float)($trip->from_lat ?? 0),
//                     'from_lng'           => (float)($trip->from_lng ?? 0),
//                     'to_lat'             => (float)($trip->to_lat ?? 0),
//                     'to_lng'             => (float)($trip->to_lng ?? 0),
//                     'departure_at'       => optional($trip->departure_at)->toIso8601String(),
//                     'driver_state'       => (string)($trip->driver_state ?? 'assigned'),
//                     'driver_started_at'  => optional($trip->driver_started_at)->toIso8601String(),
//                     'driver_finished_at' => optional($trip->driver_finished_at)->toIso8601String(),
//                     'seats_total'        => (int)$trip->seats_total,
//                     'seats_taken'        => (int)$trip->seats_taken,   // «принятые» места
//                     'price_amd'          => (int)$trip->price_amd,
//                     'pay_methods'        => $trip->pay_methods ?? [],
//                     'description'        => (string)($trip->description ?? ''),
//                     'vehicle'            => $trip->vehicle?->only(['brand','model','plate','color']),
//                     'stops'              => $trip->stops
//                         ->sortBy('position')
//                         ->values()
//                         ->map(fn($s)=>[
//                             'position' => (int)$s->position,
//                             'name'     => (string)($s->name ?? ''),
//                             'addr'     => (string)($s->addr ?? ''),
//                             'lat'      => (float)$s->lat,
//                             'lng'      => (float)$s->lng,
//                         ]),
//                 ],
// 
//                 // для списков «pending / accepted / rejected»
//                 'requests' => $requests->map(fn($r)=>[
//                     'id'             => (int)$r->id,
//                     'trip_id'        => (int)$r->trip_id,
//                     'user_id'        => $r->user_id ? (int)$r->user_id : null,
//                     'passenger_name' => (string)$r->passenger_name,
//                     'number'          => (string)($r->number ?? ''),
//                     'seats'          => (int)$r->seats,
//                     'payment'        => (string)$r->payment,     // cash|card
//                     'status'         => (string)$r->status,      // pending|accepted|rejected|cancelled|deleted
//                 ]),
// 
//                 // ключ → user_id
//                 'ratingsByUserId' => $ratings,
// 
//                 // KPI для сайдбара
//                 'stats' => [
//                     'accepted_seats'       => $acceptedSeats,
//                     'pending_seats'        => $pendingSeats,
//                     'free_seats'           => $freeSeats,
//                     'expected_earningsAMD' => $earningsAMD,
//                 ],
//             ],
//         ]);
//     }
// }

namespace App\Http\Controllers\Api\Driverv2;

use App\Http\Controllers\Controller;
use App\Models\{Trip, RideRequest, Rating, User};
use Illuminate\Http\Request;

class TripShowApiController extends Controller
{
    public function show(Request $r, Trip $trip)
    {
        $uid = $r->user()->id;

        // доступ только владельцу рейса или назначенному водителю
        abort_unless(
            in_array(
                $uid,
                array_filter([$trip->user_id, $trip->assigned_driver_id], fn($v) => !is_null($v))
            ),
            403
        );

        $trip->load([
            'stops:id,trip_id,position,name,addr,lat,lng,free_km,amd_per_km,max_km',
            'vehicle:id,brand,model,plate,color',
            'amenities:id,name,slug,icon',
            'driver:id,name,number,rating',
            'assignedDriver:id,name,number,rating',
            'company:id,name,rating',
        ]);

        // заявки по рейсу
        $requests = RideRequest::query()
            ->where('trip_id', $trip->id)
            ->orderByDesc('id')
            ->get([
                'id','trip_id','user_id','passenger_name','phone',
                'seats','payment','status','price_amd','meta','description',
                'is_checked_in','checked_in_at','decided_at','decided_by_user_id',
                'created_at','created_by_user_id','order_id',
            ]);

        $requests->load([
            'order:id,client_user_id,from_addr,to_addr,from_lat,from_lng,to_lat,to_lng,when_from,when_to,seats,payment,desired_price_amd,status,meta',
        ]);

        // рейтинги, уже выставленные по user_id
        $ratings = Rating::where('trip_id', $trip->id)
            ->get(['user_id','rating','description'])
            ->keyBy('user_id')
            ->map(fn($r)=>[
                'rating'      => (float)$r->rating,
                'description' => (string)($r->description ?? ''),
            ])
            ->all();

        // KPI по местам
        $acceptedSeats = (int) RideRequest::where('trip_id',$trip->id)
            ->where('status','accepted')
            ->sum('seats');

        $pendingSeats  = (int) RideRequest::where('trip_id',$trip->id)
            ->where('status','pending')
            ->sum('seats');

        $freeSeats     = max(0, (int)$trip->seats_total - $acceptedSeats);
        $earningsAMD   = (int)($acceptedSeats * (int)$trip->price_amd);

        // нормализуем pay_methods => всегда массив
        $payMethods = $trip->pay_methods ?? [];
        if (is_string($payMethods)) {
            $decoded = json_decode($payMethods, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $payMethods = $decoded;
            } else {
                $payMethods = [];
            }
        } elseif (!is_array($payMethods)) {
            $payMethods = [];
        }

        // === НОВОЕ: подтягиваем users по user_id из заявок ===
        $userIds = $requests
            ->pluck('user_id')
            ->filter()        // убираем null
            ->unique()
            ->values();

        $usersById = User::whereIn('id', $userIds)
            ->get(['id','name','number','rating']) // при желании добавь avatar/email и т.д.
            ->keyBy('id')
            ->map(fn($u) => [
                'id'   => (int)$u->id,
                'name' => (string)$u->name,
                'phone'=> (string)($u->number ?? ''),
                'number'=> (string)($u->number ?? ''),
                'rating' => is_numeric($u->rating) ? (float)$u->rating : null,
            ])
            ->all();
        // ==============================================

        $floatVal = fn($value) => is_numeric($value) ? (float)$value : null;
        $intVal   = fn($value) => is_numeric($value) ? (int)$value : null;

        $tariffStart = [
            'free_km'    => $floatVal($trip->start_free_km),
            'amd_per_km' => $floatVal($trip->start_amd_per_km),
            'max_km'     => $floatVal($trip->start_max_km),
        ];

        $tariffEnd = [
            'free_km'    => $floatVal($trip->end_free_km),
            'amd_per_km' => $floatVal($trip->end_amd_per_km),
            'max_km'     => $floatVal($trip->end_max_km),
        ];

        $typeFlags = [
            'type_ab_fixed'   => (bool)$trip->type_ab_fixed,
            'type_pax_to_pax' => (bool)$trip->type_pax_to_pax,
            'type_pax_to_b'   => (bool)$trip->type_pax_to_b,
            'type_a_to_pax'   => (bool)$trip->type_a_to_pax,
        ];

        $driverOwner = $trip->driver ? [
            'id'     => (int)$trip->driver->id,
            'name'   => (string)$trip->driver->name,
            'phone'  => (string)($trip->driver->number ?? ''),
            'number' => (string)($trip->driver->number ?? ''),
            'rating' => is_numeric($trip->driver->rating) ? (float)$trip->driver->rating : null,
        ] : null;

        $assignedDriver = $trip->assignedDriver ? [
            'id'     => (int)$trip->assignedDriver->id,
            'name'   => (string)$trip->assignedDriver->name,
            'phone'  => (string)($trip->assignedDriver->number ?? ''),
            'number' => (string)($trip->assignedDriver->number ?? ''),
            'rating' => is_numeric($trip->assignedDriver->rating) ? (float)$trip->assignedDriver->rating : null,
        ] : null;

        $companyInfo = $trip->company ? [
            'id'     => (int)$trip->company->id,
            'name'   => (string)$trip->company->name,
            'rating' => is_numeric($trip->company->rating) ? (float)$trip->company->rating : null,
        ] : null;

        $amenities = $trip->amenities?->map(fn($a)=>[
            'id'   => (int)$a->id,
            'name' => (string)$a->name,
            'slug' => (string)$a->slug,
            'icon' => (string)($a->icon ?? ''),
        ])->values() ?? collect();

        return response()->json([
            'data' => [
                'trip' => [
                    'id'                 => (int)$trip->id,
                    'status'             => (string)$trip->status,
                    'from_addr'          => (string)$trip->from_addr,
                    'to_addr'            => (string)$trip->to_addr,
                    'from_lat'           => (float)($trip->from_lat ?? 0),
                    'from_lng'           => (float)($trip->from_lng ?? 0),
                    'to_lat'             => (float)($trip->to_lat ?? 0),
                    'to_lng'             => (float)($trip->to_lng ?? 0),
                    'departure_at'       => optional($trip->departure_at)->toIso8601String(),
                    'driver_state'       => (string)($trip->driver_state ?? 'assigned'),
                    'driver_started_at'  => optional($trip->driver_started_at)->toIso8601String(),
                    'driver_finished_at' => optional($trip->driver_finished_at)->toIso8601String(),
                    'seats_total'        => (int)$trip->seats_total,
                    // используем реальное число принятых мест
                    'seats_taken'        => $acceptedSeats,
                    'price_amd'          => (int)$trip->price_amd,
                    'pay_methods'        => array_values($payMethods),
                    'description'        => (string)($trip->description ?? ''),
                    'company_id'         => $trip->company_id ? (int)$trip->company_id : null,
                    'amenity_ids'        => array_values(array_map('intval', (array)($trip->amenity_ids ?? []))),
                    'amenities'          => $amenities,
                    'types'              => $typeFlags,
                    'type_key'           => $trip->typeKey(),
                    'tariffs' => [
                        'start' => $tariffStart,
                        'end'   => $tariffEnd,
                    ],
                    'start_free_km'      => $tariffStart['free_km'],
                    'start_amd_per_km'   => $tariffStart['amd_per_km'],
                    'start_max_km'       => $tariffStart['max_km'],
                    'end_free_km'        => $tariffEnd['free_km'],
                    'end_amd_per_km'     => $tariffEnd['amd_per_km'],
                    'end_max_km'         => $tariffEnd['max_km'],
                    'route_length_km'    => $floatVal($trip->route_length_km),
                    'corridor_km'        => $floatVal($trip->corridor_km),
                    'eta_sec'            => $intVal($trip->eta_sec),
                    'owner'              => $driverOwner,
                    'assigned_driver'    => $assignedDriver,
                    'company'            => $companyInfo,

                    'vehicle' => $trip->vehicle ? [
                        'id'    => (int)$trip->vehicle->id,
                        'brand' => (string)$trip->vehicle->brand,
                        'model' => (string)$trip->vehicle->model,
                        'plate' => (string)$trip->vehicle->plate,
                        'color' => (string)($trip->vehicle->color ?? ''),
                    ] : null,

                    'stops' => $trip->stops
                        ->sortBy('position')
                        ->values()
                        ->map(fn($s)=>[
                            'id'       => (int)$s->id,
                            'position' => (int)$s->position,
                            'name'     => (string)($s->name ?? ''),
                            'addr'     => (string)($s->addr ?? ''),
                            'lat'      => (float)$s->lat,
                            'lng'      => (float)$s->lng,
                            'free_km'      => $floatVal($s->free_km),
                            'amd_per_km'   => $intVal($s->amd_per_km),
                            'max_km'       => $floatVal($s->max_km),
                        ]),
                ],

                'requests' => $requests->map(fn($r)=>[
                    'id'             => (int)$r->id,
                    'trip_id'        => (int)$r->trip_id,
                    'user_id'        => $r->user_id ? (int)$r->user_id : null,
                    'passenger_name' => (string)$r->passenger_name,
                    'phone'          => (string)($r->phone ?? ''),
                    'seats'          => (int)$r->seats,
                    'payment'        => (string)$r->payment,
                    'status'         => (string)$r->status,
                    'description'    => (string)($r->description ?? ''),
                    'price_amd'      => is_numeric($r->price_amd) ? (int)$r->price_amd : null,
                    'meta'           => is_array($r->meta) ? $r->meta : [],
                    'is_checked_in'  => (bool)$r->is_checked_in,
                    'checked_in_at'  => optional($r->checked_in_at)->toIso8601String(),
                    'decided_at'     => optional($r->decided_at)->toIso8601String(),
                    'decided_by_user_id' => $r->decided_by_user_id ? (int)$r->decided_by_user_id : null,
                    'created_at'     => optional($r->created_at)->toIso8601String(),
                    'created_by_user_id' => $r->created_by_user_id ? (int)$r->created_by_user_id : null,
                    'order_id'       => $r->order_id ? (int)$r->order_id : null,
                    'type'           => $r->order_id ? 'order' : 'direct',
                    'order' => $r->order ? [
                        'id'                => (int)$r->order->id,
                        'client_user_id'    => $r->order->client_user_id ? (int)$r->order->client_user_id : null,
                        'from_addr'         => (string)($r->order->from_addr ?? ''),
                        'to_addr'           => (string)($r->order->to_addr ?? ''),
                        'from_lat'          => $floatVal($r->order->from_lat),
                        'from_lng'          => $floatVal($r->order->from_lng),
                        'to_lat'            => $floatVal($r->order->to_lat),
                        'to_lng'            => $floatVal($r->order->to_lng),
                        'when_from'         => optional($r->order->when_from)->toIso8601String(),
                        'when_to'           => optional($r->order->when_to)->toIso8601String(),
                        'seats'             => $intVal($r->order->seats),
                        'payment'           => (string)($r->order->payment ?? ''),
                        'desired_price_amd' => is_numeric($r->order->desired_price_amd) ? (int)$r->order->desired_price_amd : null,
                        'status'            => (string)($r->order->status ?? ''),
                        'meta'              => is_array($r->order->meta) ? $r->order->meta : [],
                    ] : null,
                ]),

                // уже существующая структура
                'ratingsByUserId' => $ratings,

                // НОВОЕ: данные пользователей для выставления рейтингов
                'usersById' => $usersById,

                'stats' => [
                    'accepted_seats'       => $acceptedSeats,
                    'pending_seats'        => $pendingSeats,
                    'free_seats'           => $freeSeats,
                    'expected_earningsAMD' => $earningsAMD,
                ],
            ],
        ]);
    }
}
