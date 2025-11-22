<?php

// app/Http/Controllers/Client/ExploreController.php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\AmenityCategory;
use App\Models\Trip;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ExploreController extends Controller
{
    public function index(Request $r)
    {
        // ===== каталоги для фильтров (удобства) =====
        $amenityFilters = AmenityCategory::query()
            ->where('is_active', true)
            ->with(['amenities' => fn($q) => $q->where('is_active', true)->orderBy('sort_order')->orderBy('id')])
            ->orderBy('sort_order')->orderBy('id')
            ->get(['id', 'name', 'slug', 'sort_order', 'is_active'])
            ->map(fn($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'amenities' => $c->amenities->map(fn($a) => [
                    'id' => $a->id, 'name' => $a->name, 'slug' => $a->slug, 'icon' => $a->icon
                ])->values(),
            ])->values();

        // ===== входные параметры =====
        $fromLat = $this->f($r->get('from_lat'));
        $fromLng = $this->f($r->get('from_lng'));
        $toLat   = $this->f($r->get('to_lat'));
        $toLng   = $this->f($r->get('to_lng'));
        $hasFrom = $fromLat !== null && $fromLng !== null;
        $hasTo   = $toLat !== null && $toLng !== null;

        $searchRadius = max(1, (int)$r->get('radius_km', 5)); // доп. фильтр «радиус вокруг выбранной точки»

        $fromText = trim((string)$r->get('from', ''));
        $toText   = trim((string)$r->get('to', ''));

        // быстрые пресеты по дате: when=today|tomorrow
        $when = in_array($r->get('when'), ['today','tomorrow'], true) ? $r->get('when') : null;

        // явный диапазон дат
        $dateFrom = $this->parseDate($r->get('date_from'));
        $dateTo   = $this->parseDate($r->get('date_to'), true);

        // «ближайшие по времени» сортировка
        $orderClosest = $r->boolean('order_closest', false);

        // показать пусто пока не выбраны фильтры (сайт «пуст» по умолчанию)
        $hasAnyFilter =
            $hasFrom || $hasTo || $fromText !== '' || $toText !== '' ||
            $r->filled('types') || $r->filled('amenities') ||
            $r->filled('seats') || $r->filled('pay') ||
            $r->filled('max_price') || $when || $dateFrom || $dateTo;

        if (!$hasAnyFilter) {
            return Inertia::render('Client/Explore', [
                'filters' => $this->filtersOut($r),
                'trips' => $this->emptyPaginator(),
                'amenityFilters' => $amenityFilters,
                'meta' => ['match_radius_km' => null],
            ]);
        }

        // ===== построение запроса =====
        $q = Trip::query();
        $this->applyCommon($q, $r);

        // Дата-диапазон / пресеты
        $this->applyDate($q, $when, $dateFrom, $dateTo);

        // Гео-часть
        if ($hasFrom && $hasTo) {
            $q = $this->qBothPoints($q, (float)$fromLat, (float)$fromLng, (float)$toLat, (float)$toLng, $searchRadius, $r);
        } elseif ($hasFrom xor $hasTo) {
            $q = $this->qSinglePoint(
                $q,
                $hasFrom ? (float)$fromLat : null,
                $hasFrom ? (float)$fromLng : null,
                $hasTo ? (float)$toLat : null,
                $hasTo ? (float)$toLng : null,
                $searchRadius,
                $r
            );
        } else {
            // без координат: только «обычные» фильтры + сорт
            $this->applyTypeAmenityPaySeats($q, $r);
        }

        $this->applyTextSearch($q, $fromText, $toText, $hasFrom, $hasTo);

        // Сортировка
        if ($orderClosest) {
            $now = Carbon::now();
            $q->orderByRaw('ABS(EXTRACT(EPOCH FROM (departure_at - NOW()))) asc');
        } else {
            // по приоритету ранга (если есть), затем по дате, затем по цене
            if (false) $q->orderBy('rank_type');
            $q->orderBy('departure_at')->orderBy('price_amd');
        }

        // ===== выдача =====
        $trips = $q->paginate(12)->through(fn(Trip $t) => $this->card($t));

        return Inertia::render('Client/Explore', [
            'filters' => $this->filtersOut($r),
            'trips' => $trips,
            'amenityFilters' => $amenityFilters,
            'meta' => ['match_radius_km' => $searchRadius],
        ]);
    }

    /* ================= helpers ================= */

    private function emptyPaginator()
    {
        return [
            'data' => [],
            'links' => [],
            'meta' => ['total' => 0, 'per_page' => 12, 'current_page' => 1, 'last_page' => 1],
        ];
    }

    private function f($v): ?float
    {
        return is_numeric($v) ? (float)$v : null;
    }

    private function parseDate($v, bool $asEndOfDay = false): ?Carbon
    {
        try {
            if (!$v) return null;
            $d = Carbon::parse($v);
            return $asEndOfDay ? $d->endOfDay() : $d->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }

    private function H(float $lat, float $lng, string $colLat, string $colLng): string
    {
        $lat = (float)$lat; $lng = (float)$lng;
        // км (WGS84)
        return "6371 * 2 * ASIN(SQRT(POWER(SIN(RADIANS($lat - $colLat)/2),2) + COS(RADIANS($lat))*COS(RADIANS($colLat))*POWER(SIN(RADIANS($lng - $colLng)/2),2)))";
    }

    private function applyCommon(Builder $q, Request $r): void
    {
        $q->where('status', 'published')
            ->whereNull('driver_finished_at')
            ->with([
                'vehicle:id,brand,model,color,plate,seats,user_id',
                'driver:id,name,rating,avatar_path',
                'company:id,name,rating',
                'amenities:id,amenity_category_id,name,slug',
            ])
            ->withCount([
                'rideRequests as pending_requests_count' => fn($qq) => $qq->where('status', 'pending')
            ]);

        if ($r->filled('max_price'))  $q->where('price_amd', '<=', (int)$r->get('max_price'));
        $this->applyTypeAmenityPaySeats($q, $r);
    }

    private function applyTypeAmenityPaySeats(Builder $q, Request $r): void
    {
        // типы (OR)
        $types = collect(explode(',', (string)$r->get('types', '')))
            ->map(fn($v) => strtoupper(trim($v)))->filter()->values();
        if ($types->isNotEmpty()) {
            $q->where(function ($w) use ($types) {
                if ($types->contains('AB'))       $w->orWhere('type_ab_fixed', true);
                if ($types->contains('PAX_PAX'))  $w->orWhere('type_pax_to_pax', true);
                if ($types->contains('PAX_B'))    $w->orWhere('type_pax_to_b', true);
                if ($types->contains('A_PAX'))    $w->orWhere('type_a_to_pax', true);
            });
        }

        // удобства (AND)
        $amenities = collect(explode(',', (string)$r->get('amenities', '')))
            ->map(fn($v) => (int)$v)->filter(fn($v) => $v > 0)->values();
        if ($amenities->isNotEmpty()) {
            foreach ($amenities as $id) {
                $q->whereHas('amenities', fn($qq) => $qq->where('amenities.id', $id));
            }
        }

        // оплата
        if ($r->filled('pay')) {
            $q->whereJsonContains('pay_methods', $r->string('pay'));
        }

        // места
        if ($r->filled('seats')) {
            $need = max(1, (int)$r->seats);
            $q->whereRaw('(seats_total - seats_taken) >= ?', [$need]);
        }
    }

    private function applyDate(Builder $q, ?string $when, ?Carbon $dateFrom, ?Carbon $dateTo): void
    {
        if ($when === 'today') {
            $q->whereBetween('departure_at', [Carbon::today()->startOfDay(), Carbon::today()->endOfDay()]);
            return;
        }
        if ($when === 'tomorrow') {
            $q->whereBetween('departure_at', [Carbon::tomorrow()->startOfDay(), Carbon::tomorrow()->endOfDay()]);
            return;
        }
        if ($dateFrom && $dateTo) {
            $q->whereBetween('departure_at', [$dateFrom, $dateTo]);
        } elseif ($dateFrom) {
            $q->where('departure_at', '>=', $dateFrom);
        } elseif ($dateTo) {
            $q->where('departure_at', '<=', $dateTo);
        }
    }

    /** обе точки заданы */
    private function qBothPoints(Builder $q, float $fromLat, float $fromLng, float $toLat, float $toLng, int $R, Request $r): Builder
    {
        $this->applyTypeAmenityPaySeats($q, $r);

        $dStart = $this->H($fromLat, $fromLng, 'from_lat', 'from_lng');
        $dEnd   = $this->H($toLat,   $toLng,   'to_lat',   'to_lng');

        // зоны для A/B с учётом тарифов (AB / A_PAX / PAX_B используют тарифы; PAX_PAX — нет)
        $startZone = "CASE
            WHEN start_free_km IS NOT NULL AND ($dStart) <= start_free_km THEN 1
            WHEN start_max_km  IS NOT NULL AND ($dStart) <= start_max_km  THEN 2
            ELSE 9 END";

        $endZone = "CASE
            WHEN end_free_km IS NOT NULL AND ($dEnd) <= end_free_km THEN 1
            WHEN end_max_km  IS NOT NULL AND ($dEnd) <= end_max_km  THEN 2
            ELSE 9 END";

        // доплаты по A/B (PAX_* не считают доплаты)
        $addonFrom = "CASE
            WHEN type_ab_fixed OR type_a_to_pax THEN
                CASE
                    WHEN start_free_km IS NULL THEN NULL
                    WHEN ($dStart) <= start_free_km THEN 0
                    WHEN start_max_km IS NOT NULL AND ($dStart) <= start_max_km
                        THEN CEIL( GREATEST(($dStart - start_free_km),0) * COALESCE(start_amd_per_km,0) )
                    ELSE NULL
                END
            ELSE NULL
        END";

        $addonTo = "CASE
            WHEN type_ab_fixed OR type_pax_to_b THEN
                CASE
                    WHEN end_free_km IS NULL THEN NULL
                    WHEN ($dEnd) <= end_free_km THEN 0
                    WHEN end_max_km IS NOT NULL AND ($dEnd) <= end_max_km
                        THEN CEIL( GREATEST(($dEnd - end_free_km),0) * COALESCE(end_amd_per_km,0) )
                    ELSE NULL
                END
            ELSE NULL
        END";

        // базовые правила «радиуса вокруг точки» (и для PAX_PAX тоже)
        $startLimit = "COALESCE(start_max_km, {$R})";
        $endLimit = "COALESCE(end_max_km, {$R})";

        $fitRadius = "(
            (type_pax_to_pax AND ($dStart) <= {$R} AND ($dEnd) <= {$R})
         OR (type_ab_fixed AND ($dStart) <= {$startLimit} AND ($dEnd) <= {$endLimit})
         OR (type_a_to_pax AND ($dStart) <= {$startLimit})
         OR (type_pax_to_b AND ($dEnd) <= {$endLimit})
        )";

        // ранжирование
        $rank = "
            CASE
              WHEN type_pax_to_pax AND ($dStart) <= {$R} AND ($dEnd) <= {$R} THEN 1
              WHEN type_ab_fixed AND ($dStart) <= {$startLimit} AND ($dEnd) <= {$endLimit}
                   AND ($startZone)=1 AND ($endZone)=1 THEN 2
              WHEN type_ab_fixed AND ($dStart) <= {$startLimit} AND ($dEnd) <= {$endLimit}
                   AND ( ($startZone)=1 OR ($endZone)=1 ) THEN 3
              WHEN type_ab_fixed AND ($dStart) <= {$startLimit} AND ($dEnd) <= {$endLimit} THEN 4
              WHEN type_a_to_pax AND ($startZone)=1 THEN 5
              WHEN type_pax_to_b AND ($endZone)=1   THEN 6
              WHEN type_a_to_pax AND ($dStart) <= {$startLimit} AND ($startZone)=2 THEN 7
              WHEN type_pax_to_b AND ($dEnd)   <= {$endLimit}   AND ($endZone)=2   THEN 8
              ELSE 99
            END
        ";

        $q->select([
            'trips.*',
            DB::raw("($dStart) as d_start_km"),
            DB::raw("($dEnd)   as d_end_km"),
            DB::raw("($startZone) as start_zone_code"),
            DB::raw("($endZone)   as end_zone_code"),
            DB::raw("($addonFrom) as addon_from_amd"),
            DB::raw("($addonTo)   as addon_to_amd"),
            DB::raw("($rank)      as rank_type"),
        ])
            // фильтр радиуса вокруг кликов (для всех типов)
            ->whereRaw($fitRadius)
            // выкинуть AB/A_PAX/PAX_B, если за пределами max км соответствующей стороны
            ->where(function($w) use ($dStart, $dEnd) {
                $w->where('type_pax_to_pax', true)
                    ->orWhere(function($a) use ($dStart) {
                        $a->where(function($x) { $x->where('type_ab_fixed',true)->orWhere('type_a_to_pax',true); })
                            ->whereRaw(" (start_max_km IS NULL OR ($dStart) <= start_max_km) ");
                    })
                    ->orWhere(function($b) use ($dEnd) {
                        $b->where(function($x) { $x->where('type_ab_fixed',true)->orWhere('type_pax_to_b',true); })
                            ->whereRaw(" (end_max_km IS NULL OR ($dEnd) <= end_max_km) ");
                    });
            });

        // бюджет на доплату (если передан)
        if ($r->filled('max_addon_amd')) {
            $q->whereRaw('(COALESCE((' . $addonFrom . '),0) + COALESCE((' . $addonTo . '),0)) <= ?', [(int)$r->get('max_addon_amd')]);
        }

        return $q->orderBy('rank_type')
            ->orderByRaw('(COALESCE((' . $dStart . '),0) + COALESCE((' . $dEnd . '),0)) asc');

    }

    /** одна точка задана */
    private function qSinglePoint(Builder $q, ?float $fromLat, ?float $fromLng, ?float $toLat, ?float $toLng, int $R, Request $r): Builder
    {
        $this->applyTypeAmenityPaySeats($q, $r);

        $hasFrom = $fromLat !== null && $fromLng !== null;
        $hasTo   = $toLat !== null && $toLng !== null;

        $dStart = $hasFrom ? $this->H($fromLat, $fromLng, 'from_lat', 'from_lng') : '999999';
        $dEnd   = $hasTo   ? $this->H($toLat,   $toLng,   'to_lat',   'to_lng')   : '999999';

        $startZone = "CASE
            WHEN start_free_km IS NOT NULL AND ($dStart) <= start_free_km THEN 1
            WHEN start_max_km  IS NOT NULL AND ($dStart) <= start_max_km  THEN 2
            ELSE 9 END";

        $endZone = "CASE
            WHEN end_free_km IS NOT NULL AND ($dEnd) <= end_free_km THEN 1
            WHEN end_max_km  IS NOT NULL AND ($dEnd) <= end_max_km  THEN 2
            ELSE 9 END";

        $addonFrom = "CASE
            WHEN type_ab_fixed OR type_a_to_pax THEN
                CASE
                    WHEN start_free_km IS NULL THEN NULL
                    WHEN ($dStart) <= start_free_km THEN 0
                    WHEN start_max_km IS NOT NULL AND ($dStart) <= start_max_km
                        THEN CEIL( GREATEST(($dStart - start_free_km),0) * COALESCE(start_amd_per_km,0) )
                    ELSE NULL
                END
            ELSE NULL
        END";

        $addonTo = "CASE
            WHEN type_ab_fixed OR type_pax_to_b THEN
                CASE
                    WHEN end_free_km IS NULL THEN NULL
                    WHEN ($dEnd) <= end_free_km THEN 0
                    WHEN end_max_km IS NOT NULL AND ($dEnd) <= end_max_km
                        THEN CEIL( GREATEST(($dEnd - end_free_km),0) * COALESCE(end_amd_per_km,0) )
                    ELSE NULL
                END
            ELSE NULL
        END";

        // радиус вокруг одной заданной точки
        $startLimit = "COALESCE(start_max_km, {$R})";
        $endLimit = "COALESCE(end_max_km, {$R})";

        $fitRadius = $hasFrom
            ? "($dStart) <= {$startLimit}"
            : "($dEnd) <= {$endLimit}";

        // ранжирование
        $rank = $hasFrom ? "
            CASE
              WHEN type_pax_to_pax AND ($dStart) <= {$R} THEN 1
              WHEN type_ab_fixed  AND ($dStart) <= {$startLimit} THEN 2
              WHEN type_a_to_pax  AND ($startZone)=1     THEN 3
              WHEN type_a_to_pax  AND ($dStart) <= {$startLimit} AND ($startZone)=2 THEN 4
              WHEN type_pax_to_b  AND ($dStart) <= {$startLimit} THEN 5
              ELSE 99
            END
        " : "
            CASE
              WHEN type_pax_to_pax AND ($dEnd) <= {$R} THEN 1
              WHEN type_ab_fixed  AND ($dEnd) <= {$endLimit} THEN 2
              WHEN type_pax_to_b  AND ($endZone)=1     THEN 3
              WHEN type_pax_to_b  AND ($dEnd) <= {$endLimit} AND ($endZone)=2 THEN 4
              WHEN type_a_to_pax  AND ($dEnd) <= {$endLimit} THEN 5
              ELSE 99
            END
        ";

        $q->select([
            'trips.*',
            DB::raw("($dStart) as d_start_km"),
            DB::raw("($dEnd)   as d_end_km"),
            DB::raw("($startZone) as start_zone_code"),
            DB::raw("($endZone)   as end_zone_code"),
            DB::raw("($addonFrom) as addon_from_amd"),
            DB::raw("($addonTo)   as addon_to_amd"),
            DB::raw("($rank)      as rank_type"),
        ])
            ->whereRaw($fitRadius)
            ->where(function($w) use ($hasFrom, $dStart, $dEnd) {
                $w->where('type_pax_to_pax', true)
                    ->orWhere(function($a) use ($hasFrom, $dStart, $dEnd) {
                        $a->where(function($x) { $x->where('type_ab_fixed',true)->orWhere('type_a_to_pax',true); })
                            ->when($hasFrom, fn($qq)=>$qq->whereRaw(" (start_max_km IS NULL OR ($dStart) <= start_max_km) "));
                    })
                    ->orWhere(function($b) use ($hasFrom, $dStart, $dEnd) {
                        $b->where(function($x) { $x->where('type_ab_fixed',true)->orWhere('type_pax_to_b',true); })
                            ->when(!$hasFrom, fn($qq)=>$qq->whereRaw(" (end_max_km IS NULL OR ($dEnd) <= end_max_km) "));
                    });
            });

        if ($r->filled('max_addon_amd')) {
            $q->whereRaw('(COALESCE((' . $addonFrom . '),0) + COALESCE((' . $addonTo . '),0)) <= ?', [(int)$r->get('max_addon_amd')]);
        }

        return $q->orderBy('rank_type')
            ->orderByRaw($hasFrom ? '(' . $dStart . ') asc' : '(' . $dEnd . ') asc');

    }

    private function card(Trip $t): array
    {
        $dStart = is_numeric($t->getAttribute('d_start_km')) ? (float)$t->getAttribute('d_start_km') : null;
        $dEnd   = is_numeric($t->getAttribute('d_end_km')) ? (float)$t->getAttribute('d_end_km') : null;

        $startZone = (int)($t->getAttribute('start_zone_code') ?? 0);
        $endZone   = (int)($t->getAttribute('end_zone_code') ?? 0);

        $addonFrom = is_numeric($t->getAttribute('addon_from_amd')) ? (int)$t->getAttribute('addon_from_amd') : null;
        $addonTo   = is_numeric($t->getAttribute('addon_to_amd')) ? (int)$t->getAttribute('addon_to_amd') : null;

        $rankType  = is_numeric($t->getAttribute('rank_type')) ? (int)$t->getAttribute('rank_type') : null;

        $etaSec = is_numeric($t->eta_sec) ? (int)$t->eta_sec : null;
        $arrivalAt = null;
        if ($etaSec !== null && $t->departure_at instanceof Carbon) {
            $arrivalAt = $t->departure_at->copy()->addSeconds($etaSec);
        }

        return [
            'id' => (int)$t->id,
            'from_addr' => (string)$t->from_addr,
            'to_addr' => (string)$t->to_addr,
            'from_lat' => (float)($t->from_lat ?? 0),
            'from_lng' => (float)($t->from_lng ?? 0),
            'to_lat' => (float)($t->to_lat ?? 0),
            'to_lng' => (float)($t->to_lng ?? 0),
            'departure_at' => optional($t->departure_at)->toIso8601String(),
            'arrival_at' => $arrivalAt?->toIso8601String(),
            'eta_sec' => $etaSec,
            'price_amd' => (int)$t->price_amd,
            'seats_total' => (int)$t->seats_total,
            'seats_taken' => (int)$t->seats_taken,
            'pending_requests_count' => (int)($t->pending_requests_count ?? 0),
            'vehicle' => [
                'brand' => $t->vehicle->brand ?? null,
                'model' => $t->vehicle->model ?? null,
                'plate' => $t->vehicle->plate ?? null,
                'color' => $t->vehicle->color ?? '#ffdd2c',
                'seats' => $t->vehicle->seats ?? null,
            ],
            'driver' => [
                'name' => $t->driver->name ?? 'Driver',
                'rating' => $t->driver->rating ?? null,
                'avatar_path' => $t->driver->avatar_path ?? null,
                
                'number' => $t->driver->number ?? null,
            ],
            'company' => $t->company ? [
                'id' => (int)$t->company->id,
                'name' => $t->company->name,
                'rating' => $t->company->rating,
            ] : null,
            'pay_methods' => $t->pay_methods ?? [],
            'amenities' => $t->amenities->map(fn($a) => [
                'id' => $a->id, 'name' => $a->name, 'slug' => $a->slug, 'icon' => $a->icon,
            ])->values(),
            'type_key' => $t->typeKey(),
            'match' => [
                'rank_type' => $rankType,
                'd_start_km' => $dStart,
                'd_end_km' => $dEnd,
                'start_zone' => $this->zone($startZone), // FREE|PAID|OUT|null
                'end_zone' => $this->zone($endZone),
                'addon' => [
                    'from_amd' => $addonFrom,
                    'to_amd' => $addonTo,
                    'total_amd' => ($addonFrom ?? 0) + ($addonTo ?? 0),
                ],
            ],
        ];
    }

    private function zone(int $code): ?string
    {
        return match ($code) {
            1 => 'FREE',
            2 => 'PAID',
            9 => 'OUT',
            default => null,
        };
    }

    private function applyTextSearch(Builder $q, string $fromText, string $toText, bool $hasFromCoords, bool $hasToCoords): void
    {
        if ($fromText !== '' && !$hasFromCoords) {
            $tokens = $this->tokenizeForSearch($fromText);
            if (!empty($tokens)) {
                $q->where(function (Builder $w) use ($tokens) {
                    foreach ($tokens as $token) {
                        $w->where(function (Builder $inner) use ($token) {
                            $inner->whereRaw('LOWER(from_addr) LIKE ?', ['%' . $this->escapeLike($token['raw']) . '%']);
                            if ($token['normalized'] !== null) {
                                $inner->orWhereRaw('COALESCE(from_addr_search, \'\') LIKE ?', ['%' . $token['normalized'] . '%']);
                            }
                        });
                    }
                });
            }
        }

        if ($toText !== '' && !$hasToCoords) {
            $tokens = $this->tokenizeForSearch($toText);
            if (!empty($tokens)) {
                $q->where(function (Builder $w) use ($tokens) {
                    foreach ($tokens as $token) {
                        $w->where(function (Builder $inner) use ($token) {
                            $inner->whereRaw('LOWER(to_addr) LIKE ?', ['%' . $this->escapeLike($token['raw']) . '%']);
                            if ($token['normalized'] !== null) {
                                $inner->orWhereRaw('COALESCE(to_addr_search, \'\') LIKE ?', ['%' . $token['normalized'] . '%']);
                            }
                        });
                    }
                });
            }
        }
    }

    private function tokenize(string $value): array
    {
        $normalized = Str::of($value)
            ->lower()
            ->replaceMatches('/[\s,]+/u', ' ')
            ->trim()
            ->value();

        if ($normalized === '') {
            return [];
        }

        return array_values(array_filter(explode(' ', $normalized)));
    }

    private function tokenizeForSearch(string $value): array
    {
        $tokens = $this->tokenize($value);
        if (empty($tokens)) {
            return [];
        }

        return array_map(function (string $token) {
            return [
                'raw' => $token,
                'normalized' => $this->normalizeToken($token),
            ];
        }, $tokens);
    }

    private function normalizeToken(string $token): ?string
    {
        try {
            $latin = Str::transliterate($token);
        } catch (\Throwable) {
            $latin = Str::ascii($token);
        }

        $collapse = Str::of($latin)
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/u', ' ')
            ->squish()
            ->value();

        return $collapse === '' ? null : $collapse;
    }

    private function escapeLike(string $value): string
    {
        return str_replace(['%', '_'], ['\\%', '\\_'], $value);
    }

    private function filtersOut(Request $r): array
    {
        return [
            'from' => (string)$r->get('from', ''),
            'to' => (string)$r->get('to', ''),
            'date_from' => (string)$r->get('date_from', ''),
            'date_to' => (string)$r->get('date_to', ''),
            'when' => (string)$r->get('when', ''),         // today|tomorrow
            'order_closest' => (bool)$r->boolean('order_closest', false),

            'max_price' => (string)$r->get('max_price', ''),
            'seats' => (string)$r->get('seats', ''),
            'pay' => (string)$r->get('pay', ''),
            'amenities' => (string)$r->get('amenities', ''),
            'types' => (string)$r->get('types', ''),

            'from_lat' => (string)$r->get('from_lat', ''),
            'from_lng' => (string)$r->get('from_lng', ''),
            'to_lat' => (string)$r->get('to_lat', ''),
            'to_lng' => (string)$r->get('to_lng', ''),
            'radius_km' => (string)$r->get('radius_km', '5'),
            'max_addon_amd' => (string)$r->get('max_addon_amd', ''),
        ];
    }

    private function hasColumn(Builder $q, string $alias): bool
    {
        // используется лишь для «мягкой» сортировки по rank_type, если он в SELECT
        return true;
    }
}
