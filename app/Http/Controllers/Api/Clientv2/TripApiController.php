<?php

namespace App\Http\Controllers\Api\Clientv2;

use App\Http\Controllers\Controller;
use App\Models\{
    Trip,
    AmenityCategory,
    Rating,
    RideRequest
};
use Illuminate\Http\Request;
use Carbon\Carbon;

class TripApiController extends Controller
{
    /**
     * GET /api/clientv2/trips
     * Список опубликованных рейсов для клиента (поиск/фильтры/пагинация).
     */
    public function index(Request $r)
    {
        $q = Trip::query()
            ->with([
                'vehicle:id,brand,model,color,plate,seats,user_id',
                'driver:id,name,rating',
                'company:id,name,rating',
                'amenities:id,amenity_category_id,name,slug,icon',
            ])
            ->where('status', 'published')
            ->whereNull('driver_finished_at')
            ->withCount([
                'rideRequests as pending_requests_count' => fn($qq) => $qq->where('status', 'pending'),
                'rideRequests as accepted_requests_count' => fn($qq) => $qq->where('status', 'accepted'),
            ]);

        // фильтры from/to по адресу
        if ($r->filled('from')) {
            $q->where('from_addr', 'like', '%' . $r->string('from') . '%');
        }
        if ($r->filled('to')) {
            $q->where('to_addr', 'like', '%' . $r->string('to') . '%');
        }

        // фильтр по дате выезда (один день)
        if ($r->filled('date')) {
            try {
                $d = Carbon::parse($r->string('date'));
                $q->whereBetween('departure_at', [
                    $d->copy()->startOfDay(),
                    $d->copy()->endOfDay(),
                ]);
            } catch (\Throwable $e) {
                // тихо игнорируем неверную дату
            }
        }

        // максимальная цена
        if ($r->filled('max_price')) {
            $q->where('price_amd', '<=', (int)$r->max_price);
        }

        // способ оплаты
        if ($r->filled('pay')) {
            $q->whereJsonContains('pay_methods', $r->string('pay'));
        }

        // нужны места
        if ($r->filled('seats')) {
            $need = max(1, (int)$r->seats);
            $q->whereRaw('(seats_total - seats_taken) >= ?', [$need]);
        }

        // amenities=1,2,5 → должен содержать все
        $amenities = collect(explode(',', (string)$r->get('amenities', '')))
            ->map(fn($v) => (int)$v)
            ->filter(fn($v) => $v > 0)
            ->values();

        if ($amenities->isNotEmpty()) {
            $q->whereHas('amenities', function ($qq) use ($amenities) {
                $qq->whereIn('amenities.id', $amenities);
            }, '>=', $amenities->count());
        }

        // сортировка
        $sort = (string)$r->get('sort', 'departure_at');
        if ($sort === '-price') {
            $q->orderByDesc('price_amd');
        } elseif ($sort === 'price') {
            $q->orderBy('price_amd');
        } else {
            // по умолчанию по времени выезда
            $q->orderBy('departure_at');
        }

        $perPage = max(1, min(50, (int)$r->input('page.size', 12)));
        $list = $q->paginate($perPage)->withQueryString();

        $normalizePayMethods = function ($raw): array {
            $payMethods = $raw ?? [];

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

            return array_values($payMethods);
        };

        $floatVal = fn($value) => is_numeric($value) ? (float)$value : null;
        $intVal   = fn($value) => is_numeric($value) ? (int)$value : null;

        $data = $list->getCollection()->map(function (Trip $t) use ($normalizePayMethods, $floatVal, $intVal) {
            $payMethods = $normalizePayMethods($t->pay_methods);

            $typeFlags = [
                'type_ab_fixed'   => (bool)$t->type_ab_fixed,
                'type_pax_to_pax' => (bool)$t->type_pax_to_pax,
                'type_pax_to_b'   => (bool)$t->type_pax_to_b,
                'type_a_to_pax'   => (bool)$t->type_a_to_pax,
            ];

            $typeKey = method_exists($t, 'typeKey') ? $t->typeKey() : null;

            $isCompany = (bool)$t->company_id;

            $actorName = $isCompany
                ? ($t->company->name ?? 'Ընկերություն')
                : ($t->driver->name ?? 'Վարորդ');

            $actorRating = $isCompany
                ? (float)($t->company->rating ?? 5)
                : (float)($t->driver->rating ?? 5);

            $freeSeats = max(0, (int)$t->seats_total - (int)$t->seats_taken);

            return [
                'id'        => (int)$t->id,
                'status'    => (string)$t->status,

                'from_addr' => (string)$t->from_addr,
                'to_addr'   => (string)$t->to_addr,

                'from_lat'  => (float)($t->from_lat ?? 0),
                'from_lng'  => (float)($t->from_lng ?? 0),
                'to_lat'    => (float)($t->to_lat ?? 0),
                'to_lng'    => (float)($t->to_lng ?? 0),

                'departure_at' => optional($t->departure_at)->toIso8601String(),

                'price_amd'   => (int)$t->price_amd,
                'seats_total' => (int)$t->seats_total,
                'seats_taken' => (int)$t->seats_taken,
                'free_seats'  => $freeSeats,

                'pending_requests_count'  => (int)($t->pending_requests_count ?? 0),
                'accepted_requests_count' => (int)($t->accepted_requests_count ?? 0),

                'pay_methods' => $payMethods,

                'is_company' => $isCompany,
                'company_id' => $t->company_id ? (int)$t->company_id : null,

                'types'    => $typeFlags,
                'type_key' => $typeKey,

                'route_length_km' => $floatVal($t->route_length_km),
                'eta_sec'         => $intVal($t->eta_sec),

                'vehicle' => [
                    'brand' => $t->vehicle->brand ?? null,
                    'model' => $t->vehicle->model ?? null,
                    'plate' => $t->vehicle->plate ?? null,
                    'color' => $t->vehicle->color ?? '#ffdd2c',
                    'seats' => $t->vehicle->seats ?? null,
                ],

                'actor' => [
                    'type'   => $isCompany ? 'company' : 'driver',
                    'name'   => $actorName,
                    'rating' => $actorRating,
                ],

                'amenity_ids' => array_values(array_map('intval', (array)($t->amenity_ids ?? []))),
                'amenities'   => $t->amenities->map(fn($a) => [
                    'id'    => (int)$a->id,
                    'name'  => (string)$a->name,
                    'slug'  => (string)$a->slug,
                    'icon'  => (string)$a->icon,
                    'amenity_category_id' => (int)$a->amenity_category_id,
                ])->values(),
            ];
        })->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'page'      => $list->currentPage(),
                'per_page'  => $list->perPage(),
                'total'     => $list->total(),
                'last_page' => $list->lastPage(),
            ],
        ]);
    }

    /**
     * GET /api/clientv2/trips/{trip}
     * Детальная карточка рейса для клиента (в духе Driverv2 TripShow).
     */
    public function show(Request $r, Trip $trip)
    {
        // если рейс не опубликован и гость – прячем
        if ($trip->status !== 'published' && !auth()->check()) {
            abort(404);
        }

        $trip->load([
            'vehicle:id,brand,model,color,plate,seats,user_id',
            'amenities:id,amenity_category_id,name,slug,icon',
            'stops:id,trip_id,position,name,addr,lat,lng,free_km,amd_per_km,max_km',
            'driver:id,name,rating',
            'assignedDriver:id,name,rating',
            'company:id,name,rating',
        ])->loadCount([
            'rideRequests as pending_requests_count' => fn($q) => $q->where('status', 'pending'),
        ]);

        $normalizePayMethods = function ($raw): array {
            $payMethods = $raw ?? [];

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

            return array_values($payMethods);
        };

        $floatVal = fn($value) => is_numeric($value) ? (float)$value : null;
        $intVal   = fn($value) => is_numeric($value) ? (int)$value : null;

        $payMethods = $normalizePayMethods($trip->pay_methods);

        $typeFlags = [
            'type_ab_fixed'   => (bool)$trip->type_ab_fixed,
            'type_pax_to_pax' => (bool)$trip->type_pax_to_pax,
            'type_pax_to_b'   => (bool)$trip->type_pax_to_b,
            'type_a_to_pax'   => (bool)$trip->type_a_to_pax,
        ];

        $typeKey = method_exists($trip, 'typeKey') ? $trip->typeKey() : null;

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

        // KPI по местам
        $acceptedSeats = (int) RideRequest::where('trip_id', $trip->id)
            ->where('status', 'accepted')
            ->sum('seats');

        $pendingSeats = (int) RideRequest::where('trip_id', $trip->id)
            ->where('status', 'pending')
            ->sum('seats');

        $acceptedRequestsCount = (int) RideRequest::where('trip_id', $trip->id)
            ->where('status', 'accepted')
            ->count();

        $freeSeats = max(0, (int)$trip->seats_total - $acceptedSeats);
        $earningsAMD = (int)($acceptedSeats * (int)$trip->price_amd);

        $isCompany = (bool)$trip->company_id;
        $driverUserId = $trip->assigned_driver_id ?: $trip->user_id;

        // сколько завершённых рейсов у актора
        $driverTripsDone = Trip::query()
            ->when(!$isCompany, fn($q) => $q->where(fn($qq) => $qq
                ->where('user_id', $driverUserId)
                ->orWhere('assigned_driver_id', $driverUserId)))
            ->when($isCompany, fn($q) => $q->where('company_id', $trip->company_id))
            ->where('driver_state', 'done')
            ->count();

        // отзывы и рейтинг (как раньше, но чуть структурнее)
        $reviewsQ = Rating::query()
            ->select('ratings.id', 'ratings.rating', 'ratings.description', 'ratings.created_at')
            ->join('trips', 'trips.id', '=', 'ratings.trip_id');

        if ($isCompany) {
            $reviewsQ->where('trips.company_id', $trip->company_id);
            $ratingValue = (float)($trip->company->rating ?? 5);
        } else {
            $reviewsQ->where(fn($q) => $q
                ->where('ratings.user_id', $driverUserId)
                ->orWhere('trips.user_id', $driverUserId)
                ->orWhere('trips.assigned_driver_id', $driverUserId));
            $ratingValue = (float)($trip->driver->rating ?? 5);
        }

        $reviewsTotal = (clone $reviewsQ)->count();

        $reviews = $reviewsQ->latest('ratings.id')
            ->limit(6)
            ->get()
            ->map(fn($r) => [
                'id'     => (int)$r->id,
                'rating' => (float)$r->rating,
                'text'   => (string)($r->description ?? ''),
                'date'   => optional($r->created_at)->toIso8601String(),
            ]);

        // актор для карточки
        $actor = $isCompany ? [
            'type'   => 'company',
            'id'     => $trip->company?->id,
            'name'   => $trip->company->name ?? 'Ընկերություն',
            'rating' => $ratingValue,
            'trips'  => (int)$driverTripsDone,
        ] : [
            'type'   => 'driver',
            'id'     => $trip->driver?->id,
            'name'   => $trip->driver->name ?? 'Վարորդ',
            'rating' => $ratingValue,
            'trips'  => (int)$driverTripsDone,
        ];

        // amenities по категориям
        $amenityCategoryIds = $trip->amenities
            ->pluck('amenity_category_id')
            ->unique()
            ->values();

        $catNames = AmenityCategory::whereIn('id', $amenityCategoryIds)
            ->pluck('name', 'id');

        $amenitiesByCat = [];
        foreach ($amenityCategoryIds as $cid) {
            $amenitiesByCat[] = [
                'id'   => (int)$cid,
                'name' => (string)($catNames[$cid] ?? 'Կատեգորիա'),
                'items' => $trip->amenities
                    ->where('amenity_category_id', $cid)
                    ->map(fn($a) => [
                        'id'   => (int)$a->id,
                        'name' => (string)$a->name,
                        'slug' => (string)$a->slug,
                        'icon' => (string)$a->icon,
                    ])->values(),
            ];
        }

        $amenitiesFlat = $trip->amenities->map(fn($a) => [
            'id'                  => (int)$a->id,
            'amenity_category_id' => (int)$a->amenity_category_id,
            'name'                => (string)$a->name,
            'slug'                => (string)$a->slug,
            'icon'                => (string)$a->icon,
        ])->values();

        $amenityIds = array_values(array_map('intval', (array)($trip->amenity_ids ?? [])));

        return response()->json([
            'data' => [
                // основная инфа по рейсу
                'id'        => (int)$trip->id,
                'status'    => (string)$trip->status,

                'from'      => (string)$trip->from_addr,
                'to'        => (string)$trip->to_addr,

                'from_lat'  => (float)($trip->from_lat ?? 0),
                'from_lng'  => (float)($trip->from_lng ?? 0),
                'to_lat'    => (float)($trip->to_lat ?? 0),
                'to_lng'    => (float)($trip->to_lng ?? 0),

                'departure_at'       => optional($trip->departure_at)->toIso8601String(),
                'driver_state'       => (string)($trip->driver_state ?? 'assigned'),
                'driver_started_at'  => optional($trip->driver_started_at)->toIso8601String(),
                'driver_finished_at' => optional($trip->driver_finished_at)->toIso8601String(),

                'price_amd'   => (int)$trip->price_amd,
                'seats_total' => (int)$trip->seats_total,
                'seats_taken' => $acceptedSeats,   // реальные принятые места
                'free_seats'  => $freeSeats,

                'pending_requests_count'  => (int)($trip->pending_requests_count ?? 0),
                'accepted_requests_count' => $acceptedRequestsCount,

                'pay_methods' => $payMethods,

                'is_company' => $isCompany,
                'company_id' => $trip->company_id ? (int)$trip->company_id : null,

                'types'    => $typeFlags,
                'type_key' => $typeKey,

                'tariffs' => [
                    'start' => $tariffStart,
                    'end'   => $tariffEnd,
                ],

                'start_free_km'    => $tariffStart['free_km'],
                'start_amd_per_km' => $tariffStart['amd_per_km'],
                'start_max_km'     => $tariffStart['max_km'],
                'end_free_km'      => $tariffEnd['free_km'],
                'end_amd_per_km'   => $tariffEnd['amd_per_km'],
                'end_max_km'       => $tariffEnd['max_km'],

                'route_length_km' => $floatVal($trip->route_length_km),
                'corridor_km'     => $floatVal($trip->corridor_km),
                'eta_sec'         => $intVal($trip->eta_sec),

                'amenity_ids' => $amenityIds,

                'stops' => $trip->stops
                    ->sortBy('position')
                    ->values()
                    ->map(fn($s) => [
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

                'actor' => $actor,

                'vehicle' => [
                    'brand' => $trip->vehicle->brand ?? null,
                    'model' => $trip->vehicle->model ?? null,
                    'color' => $trip->vehicle->color ?? null,
                    'plate' => $trip->vehicle->plate ?? null,
                    'seats' => $trip->vehicle->seats ?? null,
                ],

                // плоский список удобств + по категориям
                'amenities'      => $amenitiesFlat,
                'amenitiesByCat' => $amenitiesByCat,

                // отзывы
                'reviews' => [
                    'summary' => [
                        'rating' => $ratingValue,
                        'trips'  => (int)$driverTripsDone,
                        'count'  => (int)$reviewsTotal,
                    ],
                    'items' => $reviews,
                ],

                // KPI для правого сайдбара/карточки
                'stats' => [
                    'accepted_seats'       => $acceptedSeats,
                    'pending_seats'        => $pendingSeats,
                    'free_seats'           => $freeSeats,
                    'expected_earningsAMD' => $earningsAMD,
                ],
            ],
        ]);
    }

    /**
     * GET /api/clientv2/trips/amenity-filters
     * Фильтры по удобствам (без изменений по сути, только под v2).
     */
    public function amenityFilters()
    {
        $cats = AmenityCategory::query()
            ->where('is_active', true)
            ->with(['amenities' => fn($q) => $q
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('id')
            ])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'name', 'slug', 'sort_order', 'is_active'])
            ->map(fn($c) => [
                'id'   => (int)$c->id,
                'name' => (string)$c->name,
                'slug' => (string)$c->slug,
                'amenities' => $c->amenities->map(fn($a) => [
                    'id'   => (int)$a->id,
                    'name' => (string)$a->name,
                    'slug' => (string)$a->slug,
                    'icon' => (string)$a->icon,
                ])->values(),
            ])->values();

        return response()->json(['data' => $cats]);
    }
}
