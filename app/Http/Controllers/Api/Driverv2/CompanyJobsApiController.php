<?php

namespace App\Http\Controllers\Api\Driverv2;

use App\Http\Controllers\Controller;
use App\Enums\CompanyMemberStatus;
use App\Models\Trip;
use App\Models\Rating;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class CompanyJobsApiController extends Controller
{
    /**
     * GET /api/driverv2/company-jobs
     * Список рейсов водителя, сгруппированных по active / upcoming / done.
     */
    public function index(Request $request)
    {
        $me = $request->user();

        $trips = Trip::query()
            ->with([
                'company:id,name,rating',
                'vehicle:id,brand,model,plate',
                'amenities' => fn($q) => $q
                    ->orderBy('sort_order')
                    ->orderBy('amenities.id')
                    ->select(['amenities.id', 'amenities.name', 'amenities.slug', 'amenities.icon']),
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
                'type_ab_fixed', 'type_pax_to_pax', 'type_pax_to_b', 'type_a_to_pax',
                'start_free_km', 'start_amd_per_km', 'start_max_km',
                'end_free_km', 'end_amd_per_km', 'end_max_km',
                'eta_sec', 'corridor_km', 'route_length_km',
            ]);

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
     * GET /api/driverv2/company-jobs/{trip}
     * Деталь одного рейса (то, что было в TripDetailController::show).
     */
    public function show(Request $request, Trip $trip)
    {
        $me = $request->user();
        abort_unless($trip->assigned_driver_id === $me->id, 403);

        // тот же вызов, что и в веб-контроллере
        if (method_exists($me, 'markNotificationsSeen')) {
            $me->markNotificationsSeen();
        }

        $trip->loadMissing([
            'company:id,name,rating',
            'vehicle:id,brand,model,color,plate',
            'stops:id,trip_id,position,name,addr,lat,lng',
            'amenities' => fn($q) => $q
                ->orderBy('sort_order')
                ->orderBy('amenities.id')
                ->select(['amenities.id', 'amenities.name', 'amenities.slug', 'amenities.icon']),
        ])->loadCount([
            'rideRequests as pending_requests_count' => fn($q) => $q->where('status', 'pending'),
            'rideRequests as accepted_requests_count' => fn($q) => $q->where('status', 'accepted'),
        ]);

        $canRate = $trip->driver_state === 'done';
        $rateUrl = url("/api/trips/{$trip->id}/rate-user");

        // только принятые заявки
        $accepted = $trip->rideRequests()
            ->where('status', 'accepted')
            ->with(['user:id,name,number,rating'])
            ->get(['id', 'trip_id', 'user_id', 'passenger_name', 'phone', 'seats', 'payment', 'status']);

        // рейтинги по пассажирам на этом рейсе
        $ratingsByUserId = Rating::where('trip_id', $trip->id)
            ->get(['user_id', 'rating', 'description'])
            ->keyBy('user_id');

        return response()->json([
            'success' => true,
            'data' => [
                'trip' => array_merge(
                    $this->mapTripDetail($trip, $me),
                    [
                        'can_rate' => $canRate,
                        'rate_user_url' => $canRate ? $rateUrl : null,
                    ]
                ),
                'requests' => $accepted->map(function ($r) use ($ratingsByUserId, $canRate) {
                    $rating = $ratingsByUserId->get($r->user_id);

                    return [
                        'id' => $r->id,
                        'user_id' => $r->user_id,
                        'passenger_name' => $r->passenger_name ?: ($r->user?->name ?? 'Passenger'),
                        'phone' => $r->phone ?: $r->user?->number,
                        'seats' => $r->seats,
                        'payment' => $r->payment,
                        'status' => $r->status,
                        // рейтинг, который водитель поставил пассажиру на этом trip
                        'rating' => $rating?->rating,
                        'rating_note' => $rating?->description,
                        // общий user rating пассажира из таблицы users
                        'user_rating' => $r->user?->rating,
                        'can_rate' => $canRate && is_null($rating?->rating),
                        'rate_user_url' => $canRate ? url("/api/trips/{$r->trip_id}/rate-user") : null,
                    ];
                })->values()->all(),
            ],
        ]);
    }

    /**
     * GET /api/driverv2/company-jobs/dashboard
     * Сводка по моим назначенным рейсам компании.
     */
    public function dashboard(Request $request)
    {
        $me = $request->user();

        $base = Trip::query()->where('assigned_driver_id', $me->id);

        $activeCount = (clone $base)->where('driver_state', 'en_route')->count();
        $upcomingCount = (clone $base)
            ->whereIn('status', ['published', 'draft'])
            ->where('driver_state', 'assigned')
            ->count();
        $doneCount = (clone $base)->where('driver_state', 'done')->count();
        $totalCount = (clone $base)->count();

        $revenueAmd = (clone $base)
            ->where('driver_state', 'done')
            ->selectRaw('COALESCE(SUM(price_amd * seats_taken), 0) as total')
            ->value('total') ?? 0;

        $avgSeatsTaken = (clone $base)->whereNotNull('seats_taken')->avg('seats_taken');

        $companyAvgRating = DB::table('company_members')
            ->where('user_id', $me->id)
            ->where('status', CompanyMemberStatus::ACTIVE->value)
            ->avg('rating');

        $companyIds = DB::table('company_members')
            ->where('user_id', $me->id)
            ->where('status', CompanyMemberStatus::ACTIVE->value)
            ->pluck('company_id')
            ->unique();

        $companyTripsTotal = $companyIds->isNotEmpty()
            ? Trip::whereIn('company_id', $companyIds)->count()
            : 0;

        $companySharePercent = $companyTripsTotal > 0
            ? round(($doneCount / $companyTripsTotal) * 100, 1)
            : null;

        $selectColumns = [
            'id', 'company_id', 'vehicle_id', 'assigned_driver_id', 'user_id',
            'from_addr', 'to_addr', 'from_lat', 'from_lng', 'to_lat', 'to_lng',
            'departure_at', 'seats_total', 'seats_taken', 'price_amd', 'pay_methods', 'status',
            'driver_state', 'driver_started_at', 'driver_finished_at',
            'type_ab_fixed', 'type_pax_to_pax', 'type_pax_to_b', 'type_a_to_pax',
            'start_free_km', 'start_amd_per_km', 'start_max_km',
            'end_free_km', 'end_amd_per_km', 'end_max_km',
            'eta_sec', 'corridor_km', 'route_length_km',
        ];

        $nextTrip = (clone $base)
            ->whereIn('driver_state', ['assigned', 'en_route'])
            ->orderBy('departure_at')
            ->with([
                'company:id,name,rating',
                'vehicle:id,brand,model,plate',
                'amenities' => fn($q) => $q
                    ->orderBy('sort_order')
                    ->orderBy('amenities.id')
                    ->select(['amenities.id', 'amenities.name', 'amenities.slug', 'amenities.icon']),
            ])
            ->withCount([
                'rideRequests as pending_requests_count' => fn($q) => $q->where('status', 'pending'),
                'rideRequests as accepted_requests_count' => fn($q) => $q->where('status', 'accepted'),
            ])
            ->first($selectColumns);

        $recent = (clone $base)
            ->orderByDesc('departure_at')
            ->with([
                'company:id,name,rating',
                'vehicle:id,brand,model,plate',
                'amenities' => fn($q) => $q
                    ->orderBy('sort_order')
                    ->orderBy('amenities.id')
                    ->select(['amenities.id', 'amenities.name', 'amenities.slug', 'amenities.icon']),
            ])
            ->withCount([
                'rideRequests as pending_requests_count' => fn($q) => $q->where('status', 'pending'),
                'rideRequests as accepted_requests_count' => fn($q) => $q->where('status', 'accepted'),
            ])
            ->limit(6)
            ->get($selectColumns);

        $doneList = (clone $base)
            ->where('driver_state', 'done')
            ->orderByDesc('driver_finished_at')
            ->with([
                'company:id,name,rating',
                'vehicle:id,brand,model,plate',
                'amenities' => fn($q) => $q
                    ->orderBy('sort_order')
                    ->orderBy('amenities.id')
                    ->select(['amenities.id', 'amenities.name', 'amenities.slug', 'amenities.icon']),
            ])
            ->withCount([
                'rideRequests as pending_requests_count' => fn($q) => $q->where('status', 'pending'),
                'rideRequests as accepted_requests_count' => fn($q) => $q->where('status', 'accepted'),
            ])
            ->limit(50)
            ->get($selectColumns);

        $doneSeries = (clone $base)
            ->where('driver_state', 'done')
            ->whereNotNull('driver_finished_at')
            ->selectRaw('DATE(driver_finished_at) as d, COUNT(*) as cnt')
            ->groupBy('d')
            ->pluck('cnt', 'd');

        $days = collect(range(0, 13))
            ->map(fn($i) => Carbon::today()->subDays(13 - $i)->toDateString());

        $series = $days->map(fn($d) => [
            'date' => $d,
            'done' => (int)($doneSeries[$d] ?? 0),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'stats' => [
                    'counts' => [
                        'total' => $totalCount,
                        'active' => $activeCount,
                        'upcoming' => $upcomingCount,
                        'done' => $doneCount,
                    ],
                    'revenue_amd' => (int)$revenueAmd,
                    'avg_seats_taken' => $avgSeatsTaken ? (float)$avgSeatsTaken : null,
                    'rating' => [
                        'user' => $me->rating,
                        'company_average' => $companyAvgRating ? (float)$companyAvgRating : null,
                    ],
                    'company_share' => [
                        'company_trips_total' => (int)$companyTripsTotal,
                        'done_by_me' => (int)$doneCount,
                        'share_percent' => $companySharePercent,
                    ],
                ],
                'next_trip' => $nextTrip ? $this->mapTrip($nextTrip) : null,
                'recent' => $recent->map(fn($t) => $this->mapTrip($t))->all(),
                'history' => $doneList->map(fn($t) => $this->mapTrip($t))->all(),
                'series' => $series->all(),
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

        $trip->loadMissing([
            'company:id,name,rating',
            'vehicle:id,brand,model,plate',
            'amenities' => fn($q) => $q
                ->orderBy('sort_order')
                ->orderBy('amenities.id')
                ->select(['amenities.id', 'amenities.name', 'amenities.slug', 'amenities.icon']),
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
            'amenities' => fn($q) => $q
                ->orderBy('sort_order')
                ->orderBy('amenities.id')
                ->select(['amenities.id', 'amenities.name', 'amenities.slug', 'amenities.icon']),
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
     * Суммарная структура Trip для списков (index).
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

            'is_company' => (bool)$t->company_id,

            'vehicle' => $t->vehicle ? [
                'id' => (int)$t->vehicle->id,
                'brand' => $t->vehicle->brand,
                'model' => $t->vehicle->model,
                'plate' => $t->vehicle->plate,
            ] : null,

            'amenity_ids' => $t->amenities?->pluck('id')->map(fn($id) => (int)$id)->values()->all() ?? [],
            'amenities' => $t->amenities?->map(fn($a) => [
                'id' => (int)$a->id,
                'name' => (string)$a->name,
                'slug' => (string)$a->slug,
                'icon' => (string)($a->icon ?? ''),
            ])->values()->all() ?? [],

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

            'type' => [
                'key' => $t->typeKey(),
                'ab_fixed' => (bool)$t->type_ab_fixed,
                'pax_to_pax' => (bool)$t->type_pax_to_pax,
                'pax_to_b' => (bool)$t->type_pax_to_b,
                'a_to_pax' => (bool)$t->type_a_to_pax,
            ],

            'tariff' => [
                'start' => [
                    'free_km' => $t->start_free_km !== null ? (float)$t->start_free_km : null,
                    'amd_per_km' => $t->start_amd_per_km !== null ? (float)$t->start_amd_per_km : null,
                    'max_km' => $t->start_max_km !== null ? (float)$t->start_max_km : null,
                ],
                'end' => [
                    'free_km' => $t->end_free_km !== null ? (float)$t->end_free_km : null,
                    'amd_per_km' => $t->end_amd_per_km !== null ? (float)$t->end_amd_per_km : null,
                    'max_km' => $t->end_max_km !== null ? (float)$t->end_max_km : null,
                ],
            ],

            'metrics' => [
                'eta_sec' => $t->eta_sec !== null ? (int)$t->eta_sec : null,
                'corridor_km' => $t->corridor_km !== null ? (float)$t->corridor_km : null,
                'route_length_km' => $t->route_length_km !== null ? (float)$t->route_length_km : null,
            ],
        ];
    }

    /**
     * Детальная структура Trip (для show) — base + driver + stops.
     */
    private function mapTripDetail(Trip $t, $me): array
    {
        $base = $this->mapTrip($t);

        $base['driver'] = [
            'id' => $me->id,
            'name' => $me->name,
            'phone' => $me->number,
            // собственный rating водителя из users
            'rating' => $me->rating,
        ];

        $base['amenity_ids'] = array_values(array_map('intval', (array)($t->amenity_ids ?? [])));
        $base['amenities'] = $t->amenities
            ->map(fn($a) => [
                'id' => (int)$a->id,
                'name' => (string)$a->name,
                'slug' => (string)$a->slug,
                'icon' => (string)($a->icon ?? ''),
            ])
            ->values()
            ->all();

        // vehicle с цветом (color)
        if ($t->vehicle) {
            $base['vehicle'] = [
                'id' => (int)$t->vehicle->id,
                'brand' => $t->vehicle->brand,
                'model' => $t->vehicle->model,
                'color' => $t->vehicle->color,
                'plate' => $t->vehicle->plate,
            ];
        }

        $base['stops'] = $t->stops
            ->map(fn($s) => [
                'position' => $s->position,
                'name' => $s->name,
                'addr' => $s->addr,
                'lat' => $s->lat,
                'lng' => $s->lng,
            ])
            ->values()
            ->all();

        $base['description'] = $t->description;

        return $base;
    }
}
