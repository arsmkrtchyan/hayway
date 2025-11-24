<?php

namespace App\Http\Controllers\Api\Driverv2;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class CompanyJobsApiController extends Controller
{
    /**
     * GET /api/driverv2/company-jobs
     * Доступ: только назначенный водитель (assigned_driver_id = me).
     */
    public function index(Request $request)
    {
        $me = $request->user();

        $trips = Trip::query()
            ->with([
                'company:id,name,rating',
                'vehicle:id,brand,model,plate',
            ])
            ->withCount([
                'rideRequests as pending_requests_count' => fn($q) => $q->where('status', 'pending'),
                'rideRequests as accepted_requests_count' => fn($q) => $q->where('status', 'accepted'),
            ])
            ->where('assigned_driver_id', $me->id)
            ->orderByDesc('departure_at')
            ->get([
                'id', 'company_id', 'vehicle_id', 'assigned_driver_id', 'user_id',
                'from_addr', 'to_addr', 'from_lat', 'from_lng', 'to_lat', 'to_lng',
                'departure_at', 'seats_total', 'seats_taken', 'price_amd', 'pay_methods', 'status',
                'driver_state', 'driver_started_at', 'driver_finished_at',
            ]);

        // такие же группы, как во внутреннем контроллере
        $active = $trips->where('driver_state', 'en_route')->values();
        $upcoming = $trips
            ->filter(fn($t) =>
                in_array($t->status, ['published', 'draft'], true)
                && $t->driver_state === 'assigned'
            )
            ->values();
        $done = $trips->where('driver_state', 'done')->take(50)->values();

        return response()->json([
            'success' => true,
            'data' => [
                'active' => $active->map(fn($t) => $this->mapTrip($t))->all(),
                'upcoming' => $upcoming->map(fn($t) => $this->mapTrip($t))->all(),
                'done' => $done->map(fn($t) => $this->mapTrip($t))->all(),
            ],
            'meta' => [
                'counts' => [
                    'active' => $active->count(),
                    'upcoming' => $upcoming->count(),
                    'done' => $done->count(),
                ],
            ],
        ]);
    }

    /**
     * POST /api/driverv2/company-jobs/{trip}/start
     */
    public function start(Request $request, Trip $trip)
    {
        $me = $request->user();
        if ($trip->assigned_driver_id !== $me->id) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden',
            ], 403);
        }

        if ($trip->driver_state === 'done') {
            return response()->json([
                'success' => false,
                'message' => 'Արդեն ավարտված է',
                'trip' => $this->mapTrip($trip),
            ], 422);
        }

        // один активный рейс на водителя
        $existsActive = Trip::where('assigned_driver_id', $me->id)
            ->where('driver_state', 'en_route')
            ->exists();

        if ($existsActive) {
            return response()->json([
                'success' => false,
                'message' => 'Ակտիվ երթուղի արդեն կա',
            ], 422);
        }

        $trip->forceFill([
            'driver_state' => 'en_route',
            'driver_started_at' => Carbon::now(),
        ])->save();

        // перегружаем связи/счётчики, чтобы отдать обновлённый объект
        $trip->loadMissing([
            'company:id,name,rating',
            'vehicle:id,brand,model,plate',
        ])->loadCount([
            'rideRequests as pending_requests_count' => fn($q) => $q->where('status', 'pending'),
            'rideRequests as accepted_requests_count' => fn($q) => $q->where('status', 'accepted'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Սկսվեց երթուղին',
            'trip' => $this->mapTrip($trip),
        ]);
    }

    /**
     * POST /api/driverv2/company-jobs/{trip}/finish
     */
    public function finish(Request $request, Trip $trip)
    {
        $me = $request->user();
        if ($trip->assigned_driver_id !== $me->id) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden',
            ], 403);
        }

        if ($trip->driver_state !== 'en_route') {
            return response()->json([
                'success' => false,
                'message' => 'Նախ պետք է սկսել երթուղին',
            ], 422);
        }

        $trip->forceFill([
            'driver_state' => 'done',
            'driver_finished_at' => Carbon::now(),
        ])->save();

        $trip->loadMissing([
            'company:id,name,rating',
            'vehicle:id,brand,model,plate',
        ])->loadCount([
            'rideRequests as pending_requests_count' => fn($q) => $q->where('status', 'pending'),
            'rideRequests as accepted_requests_count' => fn($q) => $q->where('status', 'accepted'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Երթուղին ավարտվեց',
            'trip' => $this->mapTrip($trip),
        ]);
    }

    /**
     * Общая “крутая” JSON-структура для одного рейса.
     */
    private function mapTrip(Trip $t): array
    {
        $pending = (int)($t->pending_requests_count ?? 0);
        $accepted = (int)($t->accepted_requests_count ?? 0);
        $totalRequests = $pending + $accepted;

        return [
            'id' => (int)$t->id,

            'company' => $t->company ? [
                'id' => (int)$t->company->id,
                'name' => $t->company->name,
                'rating' => $t->company->rating,
            ] : null,

            'vehicle' => $t->vehicle ? [
                'id' => (int)$t->vehicle->id,
                'brand' => $t->vehicle->brand,
                'model' => $t->vehicle->model,
                'plate' => $t->vehicle->plate,
            ] : null,

            'route' => [
                'from' => [
                    'addr' => $t->from_addr,
                    'lat' => $t->from_lat,
                    'lng' => $t->from_lng,
                ],
                'to' => [
                    'addr' => $t->to_addr,
                    'lat' => $t->to_lat,
                    'lng' => $t->to_lng,
                ],
            ],

            'time' => [
                'departure_at' => optional($t->departure_at)->toIso8601String(),
                'driver_started_at' => optional($t->driver_started_at)->toIso8601String(),
                'driver_finished_at' => optional($t->driver_finished_at)->toIso8601String(),
            ],

            'seats' => [
                'total' => (int)$t->seats_total,
                'taken' => (int)$t->seats_taken,
                'free' => max(0, (int)$t->seats_total - (int)$t->seats_taken),
            ],

            'price' => [
                'currency' => 'AMD',
                'amount' => (int)$t->price_amd,
            ],

            'pay_methods' => $t->pay_methods ?? [],

            'status' => [
                'trip' => $t->status,
                'driver_state' => $t->driver_state,
            ],

            'requests' => [
                'pending' => $pending,
                'accepted' => $accepted,
                'total' => $totalRequests,
            ],
        ];
    }
}
