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
//             ->get(['id','trip_id','user_id','passenger_name','phone','seats','payment','status']);
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
//                     'phone'          => (string)($r->phone ?? ''),
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
            'stops:id,trip_id,position,name,addr,lat,lng',
            'vehicle:id,brand,model,plate,color',
        ]);

        // заявки по рейсу
        $requests = RideRequest::query()
            ->where('trip_id', $trip->id)
            ->orderByDesc('id')
            ->get(['id','trip_id','user_id','passenger_name','phone','seats','payment','status']);

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
            ->get(['id','name']) // при желании добавь avatar/email и т.д.
            ->keyBy('id')
            ->map(fn($u) => [
                'id'   => (int)$u->id,
                'name' => (string)$u->name,
                // 'avatar_url' => $u->avatar_url ? (string)$u->avatar_url : null,
            ])
            ->all();
        // ==============================================

        return response()->json([
            'data' => [
                'trip' => [
                    'id'                 => (int)$trip->id,
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
