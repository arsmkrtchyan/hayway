<?php

namespace App\Http\Controllers\Api\Driverv2;

use App\Http\Controllers\Controller;
use App\Models\{Trip, RideRequest, Rating};
use Illuminate\Http\Request;

class TripShowApiController extends Controller
{
    /**
     * GET /api/driverv2/trip-show/{trip}
     * Доступ: владелец рейса или назначенный водитель.
     */
    public function show(Request $r, Trip $trip)
    {
        $uid = $r->user()->id;
        abort_unless(in_array($uid, array_filter([$trip->user_id, $trip->assigned_driver_id], fn($v)=>!is_null($v))), 403);

        $trip->load([
            'stops:id,trip_id,position,name,addr,lat,lng',
            'vehicle:id,brand,model,plate,color',
        ]);

        // Заявки по рейсу (для таблицы на странице)
        $requests = RideRequest::query()
            ->where('trip_id', $trip->id)
            ->orderByDesc('id')
            ->get(['id','trip_id','user_id','passenger_name','phone','seats','payment','status']);

        // Рейтинги (для скрытия формы оценки уже оценённых пассажиров)
        $ratings = Rating::where('trip_id', $trip->id)
            ->get(['user_id','rating','description'])
            ->keyBy('user_id')
            ->map(fn($r)=>[
                'rating'      => (float)$r->rating,
                'description' => (string)($r->description ?? ''),
            ])
            ->all();

        // KPI (удобно для сайдбара)
        $acceptedSeats = (int) RideRequest::where('trip_id',$trip->id)->where('status','accepted')->sum('seats');
        $pendingSeats  = (int) RideRequest::where('trip_id',$trip->id)->where('status','pending')->sum('seats');
        $freeSeats     = max(0, (int)$trip->seats_total - $acceptedSeats);
        $earningsAMD   = (int)($acceptedSeats * (int)$trip->price_amd);

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
                    'seats_taken'        => (int)$trip->seats_taken,   // «принятые» места
                    'price_amd'          => (int)$trip->price_amd,
                    'pay_methods'        => $trip->pay_methods ?? [],
                    'description'        => (string)($trip->description ?? ''),
                    'vehicle'            => $trip->vehicle?->only(['brand','model','plate','color']),
                    'stops'              => $trip->stops
                        ->sortBy('position')
                        ->values()
                        ->map(fn($s)=>[
                            'position' => (int)$s->position,
                            'name'     => (string)($s->name ?? ''),
                            'addr'     => (string)($s->addr ?? ''),
                            'lat'      => (float)$s->lat,
                            'lng'      => (float)$s->lng,
                        ]),
                ],

                // для списков «pending / accepted / rejected»
                'requests' => $requests->map(fn($r)=>[
                    'id'             => (int)$r->id,
                    'trip_id'        => (int)$r->trip_id,
                    'user_id'        => $r->user_id ? (int)$r->user_id : null,
                    'passenger_name' => (string)$r->passenger_name,
                    'phone'          => (string)($r->phone ?? ''),
                    'seats'          => (int)$r->seats,
                    'payment'        => (string)$r->payment,     // cash|card
                    'status'         => (string)$r->status,      // pending|accepted|rejected|cancelled|deleted
                ]),

                // ключ → user_id
                'ratingsByUserId' => $ratings,

                // KPI для сайдбара
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
