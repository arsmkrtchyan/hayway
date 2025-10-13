<?php
//// app/Http/Controllers/Company/TripController.php
//
//namespace App\Http\Controllers\Company;
//
//use App\Http\Controllers\Controller;
//use App\Models\{Company, Trip, Vehicle, User, RideRequest, Rating};
//use Illuminate\Http\Request;
//use Illuminate\Support\Facades\Schema;
//use Illuminate\Support\Facades\Gate;
//// <— ВАЖНО
//
//class TripController extends Controller
//{
//    public function index(Company $company)
//    {
//        $this->authorize('view', $company);
//
//        $trips = $company->trips()
//            ->with(['vehicle:id,brand,model,plate', 'assignedDriver:id,name'])
//            ->withCount([
//                'rideRequests as pending_requests_count' => fn($q) => $q->where('status', 'pending'),
//                'rideRequests as accepted_requests_count' => fn($q) => $q->where('status', 'accepted'),
//            ])
//            ->latest()
//            ->get();
//
//        // Листинг без формы — рендерим новый компонент:
//        return inertia('Company/TripsIndex', [
//            'company' => ['id' => $company->id, 'name' => $company->name],
//            'trips' => $trips,
//        ]);
//    }
//    public function tripmake(Company $company)
//    {
//        $this->authorize('view', $company);
//
//        $trips = $company->trips()
//            ->with(['vehicle:id,brand,model,plate','assignedDriver:id,name'])
//            ->withCount([
//                'rideRequests as pending_requests_count'  => fn($q)=>$q->where('status','pending'),
//                'rideRequests as accepted_requests_count' => fn($q)=>$q->where('status','accepted'),
//            ])
//            ->latest()->get();
//
//        $vehicles = $company->vehicles()
//            ->get(['id','brand','model','plate']);
//
//        $drivers = $company->users()
//            ->select('users.id','users.name')
//            ->get();
//
//        return inertia('Company/Trips', compact('company','trips','vehicles','drivers'));
//    }
//    public function store(Request $r, Company $company)
//    {
//        $this->authorize('manage', $company);
//
//        $data = $r->validate([
//            'vehicle_id' => 'required|exists:vehicles,id',
//            'assigned_driver_id' => 'required|exists:users,id',
//            'from_addr' => 'required|string|max:255',
//            'to_addr' => 'required|string|max:255',
//            'from_lat' => 'required|numeric|between:-90,90',
//            'from_lng' => 'required|numeric|between:-180,180',
//            'to_lat' => 'required|numeric|between:-90,90',
//            'to_lng' => 'required|numeric|between:-180,180',
//            'price_amd' => 'required|integer|min:0',
//            'seats_total' => 'required|integer|min:1|max:8',
//            'departure_at' => 'required|date',
//            'pay_methods' => 'required|array|min:1',
//            'pay_methods.*' => 'in:cash,card',
//            'description' => 'nullable|string|max:5000',
//
//            // amenities
//            'amenities' => ['sometimes', 'array'],
//            'amenities.*' => ['integer', 'exists:amenities,id'],
//
//            // stops
//            'stops' => ['sometimes', 'array', 'max:10'],
//            'stops.*.lat' => ['required', 'numeric', 'between:-90,90'],
//            'stops.*.lng' => ['required', 'numeric', 'between:-180,180'],
//            'stops.*.name' => ['nullable', 'string', 'max:120'],
//            'stops.*.addr' => ['nullable', 'string', 'max:255'],
//            'stops.*.position' => ['nullable', 'integer', 'min:1'],
//        ]);
//
//        // Валидация принадлежности
//        if (!$company->vehicles()->where('id', $data['vehicle_id'])->exists()) {
//            return back()->withErrors(['vehicle_id' => 'Այս մեքենան չի պատկանում ընկերությանը'])->withInput();
//        }
//        if (!$company->drivers()->where('users.id', $data['assigned_driver_id'])->exists()) {
//            return back()->withErrors(['assigned_driver_id' => 'Այս վարորդը չի պատկանում ընկերությանը'])->withInput();
//        }
//
//        $trip = Trip::create([
//            'company_id' => $company->id,
//            'user_id' => auth()->id(), // создал (диспетчер/менеджер)
//            'assigned_driver_id' => $data['assigned_driver_id'],
//            'vehicle_id' => $data['vehicle_id'],
//            'from_lat' => $data['from_lat'],
//            'from_lng' => $data['from_lng'],
//            'from_addr' => $data['from_addr'],
//            'to_lat' => $data['to_lat'],
//            'to_lng' => $data['to_lng'],
//            'to_addr' => $data['to_addr'],
//            'departure_at' => $data['departure_at'],
//            'seats_total' => $data['seats_total'],
//            'price_amd' => $data['price_amd'],
//            'pay_methods' => $data['pay_methods'],
//            'status' => 'draft',
//            'description' => $data['description'] ?? null,
//        ]);
//
//        if (!empty($data['amenities'])) {
//            $trip->amenities()->sync($data['amenities']);
//        }
//
//        $stops = collect($r->input('stops', []))
//            ->values()
//            ->take(10)
//            ->map(fn($s, $i) => [
//                'position' => isset($s['position']) ? (int)$s['position'] : ($i + 1),
//                'name' => $s['name'] ?? null,
//                'addr' => $s['addr'] ?? null,
//                'lat' => (float)$s['lat'],
//                'lng' => (float)$s['lng'],
//            ])->all();
//        if (!empty($stops)) {
//            $trip->stops()->createMany($stops);
//        }
//
//        return redirect()->route('company.trips.make', $company)->with('ok', 'Երթուղին ստեղծվեց');
//    }
//
//    public function show(Company $company, Trip $trip)
//    {
//        $this->authorize('view', $company);
//        abort_unless((int)$trip->company_id === (int)$company->id, 404);
//
//        $trip->load([
//            'vehicle:id,brand,model,plate,color',
//            'assignedDriver:id,name',
//            'stops' => fn($q) => $q->orderBy('position'),
//        ]);
//
//        $requests = RideRequest::query()
//            ->where('trip_id', $trip->id)
//            ->orderBy('id', 'desc')
//            ->get(['id', 'trip_id', 'user_id', 'passenger_name', 'phone', 'seats', 'payment', 'status']);
//
//        // Оценки, выставленные ВОДИТЕЛЕМ поездки пассажирам (в таблице ratings — это просто отзывы на trip)
//        $ratings = Rating::where('trip_id', $trip->id)->get(['user_id', 'rating', 'description']);
//        $ratingsByUserId = $ratings->keyBy('user_id');
//        $canEditStops = Gate::allows('manage', $company);
//
//        return inertia('Company/TripShow', [
//            'company'         => ['id'=>$company->id,'name'=>$company->name],
//            'trip'            => $trip,
//            'requests'        => $requests,
//            'ratingsByUserId' => $ratingsByUserId,
//            'canEditStops'    => $canEditStops,   // <- добавили
//        ]);
//
//    }
//
//    public function publish(Company $company, Trip $trip)
//    {
//        $this->authorize('manage', $company);
//        if ($trip->company_id !== $company->id) abort(403);
//        if ($trip->status !== 'draft') return back()->with('warn', 'Կարելի է հրապարակել միայն սևագիրը');
//
//        $seatsLeft = max(0, (int)$trip->seats_total - (int)$trip->seats_taken);
//        if ($seatsLeft <= 0) return back()->with('warn', 'Չկա ազատ տեղ');
//
//        $trip->status = 'published';
//        if ($trip->isFillable('published_at') && Schema::hasColumn($trip->getTable(), 'published_at')) {
//            $trip->published_at = now();
//        }
//        $trip->save();
//
//        return back()->with('ok', 'Երթուղին հրապարակվեց');
//    }
//
//    public function archive(Company $company, Trip $trip)
//    {
//        $this->authorize('manage', $company);
//        if ($trip->company_id !== $company->id) abort(403);
//        if ($trip->status === 'archived') return back()->with('warn', 'Արդեն արխիվացված է');
//        $trip->status = 'archived';
//        $trip->save();
//        return back()->with('ok', 'Երթուղին արխիվացվեց');
//    }
//
//    public function unarchive(Company $company, Trip $trip)
//    {
//        $this->authorize('manage', $company);
//        if ($trip->company_id !== $company->id) abort(403);
//        $trip->status = 'draft';
//        $trip->save();
//        return back()->with('ok', 'Երթուղին վերադարձվեց սևագրի');
//    }
//
//    public function search(Request $r, Company $company)
//    {
//        $this->authorize('view', $company);
//
//        $data = $r->validate([
//            'from'    => ['nullable','string','max:160'],
//            'to'      => ['nullable','string','max:160'],
//            'exclude' => ['nullable','integer'],
//            'limit'   => ['nullable','integer','min:1','max:100'],
//        ]);
//
//        $qFrom   = self::norm($data['from'] ?? '');
//        $qTo     = self::norm($data['to']   ?? '');
//        $limit   = (int)($data['limit'] ?? 30);
//        $exclude = $data['exclude'] ?? null;
//
//        // первичная фильтрация по БД (без "умного" поиска): только актуальные рейсы компании
//        $base = Trip::query()
//            ->where('company_id', $company->id)
//            ->where('status', 'published')
//            ->whereNull('driver_finished_at');
//
//        if ($exclude) {
//            $base->where('id', '!=', (int)$exclude);
//        }
//
//        // немного ограничим по времени: ближайшие 60 дней вперед (чтобы не тянуть архивы)
//        $base->where('departure_at', '>=', now()->subDays(1))
//            ->where('departure_at', '<=', now()->addDays(60))
//            ->orderBy('departure_at', 'asc');
//
//        // забираем разумное число кандидатов, дальше матчим в PHP с нормализацией
//        $candidates = $base->limit(250)->get([
//            'id','from_addr','to_addr','departure_at',
//            'seats_total','seats_taken','price_amd'
//        ]);
//
//        $hasFrom = strlen($qFrom) > 0;
//        $hasTo   = strlen($qTo)   > 0;
//
//        $result = [];
//        foreach ($candidates as $t) {
//            $fromN = self::norm($t->from_addr);
//            $toN   = self::norm($t->to_addr);
//
//            $okFrom = !$hasFrom || str_contains($fromN, $qFrom);
//            $okTo   = !$hasTo   || str_contains($toN,   $qTo);
//
//            // поддержка варианта "поиск по одной строке", когда пользователь ввёл город,
//            // а мы не уверены — это from или to. Если задан только один фильтр —
//            // попробуем искать и в from, и в to.
//            if (!$okFrom && $hasFrom && !$hasTo) {
//                $okFrom = str_contains($toN, $qFrom);
//            }
//            if (!$okTo && $hasTo && !$hasFrom) {
//                $okTo = str_contains($fromN, $qTo);
//            }
//
//            if ($okFrom && $okTo) {
//                $result[] = [
//                    'id'           => $t->id,
//                    'from_addr'    => $t->from_addr,
//                    'to_addr'      => $t->to_addr,
//                    'departure_at' => $t->departure_at,
//                    'seats_total'  => (int)$t->seats_total,
//                    'seats_taken'  => (int)$t->seats_taken,
//                    'price_amd'    => (int)$t->price_amd,
//                ];
//            }
//            if (count($result) >= $limit) break;
//        }
//
//        return response()->json([
//            'items' => $result,
//        ]);
//    }
//
//    /**
//     * Нормализация текста для сопоставления:
//     * - trim, lower
//     * - транслитерируем в латиницу (hy/ru/en → латиница)
//     * - выкидываем всё, кроме a-z0-9 и пробелов
//     * - схлопываем пробелы
//     */
//    private static function norm(?string $s): string
//    {
//        $s = (string)$s;
//        $s = trim($s);
//
//        // Попытка через intl (рекомендуется включить ext-intl в PHP)
//        if (class_exists(\Transliterator::class)) {
//            // Any-Latin: всё в латиницу; Latin-ASCII: убрать диакритику; Lower(): в нижний регистр
//            $tr = \Transliterator::create('Any-Latin; Latin-ASCII; Lower()');
//            if ($tr) {
//                $s = $tr->transliterate($s);
//            } else {
//                $s = mb_strtolower($s, 'UTF-8');
//            }
//        } else {
//            // fallback: iconv + strtolower
//            $s = mb_strtolower($s, 'UTF-8');
//            $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
//            if ($converted !== false) $s = $converted;
//        }
//
//        // заменить ё → e, й → i и пр. (чуть лучше матчится кириллица в латиницу)
//        $s = strtr($s, [
//            'yo' => 'e', 'jo' => 'e', // часто "yo" ищут как "e"
//        ]);
//
//        // оставить только латинские буквы/цифры/пробел
//        $s = preg_replace('~[^a-z0-9\s]+~', ' ', $s);
//        $s = preg_replace('~\s+~', ' ', $s);
//        return trim($s);
//    }
//
//}

// app/Http/Controllers/Company/TripController.php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\TripStoreRequest;
use App\Http\Requests\Company\TripUpdateRequest;
use App\Models\{Company, Trip, Vehicle, User, RideRequest, Rating};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Carbon;

class TripController extends Controller
{
    /* ==== list & pages ==== */

    public function index(Company $company)
    {
        $this->authorize('view', $company);

        $trips = $company->trips()
            ->with(['vehicle:id,brand,model,plate,color', 'assignedDriver:id,name'])
            ->withCount([
                'rideRequests as pending_requests_count' => fn($q) => $q->where('status', 'pending'),
                'rideRequests as accepted_requests_count' => fn($q) => $q->where('status', 'accepted'),
            ])->latest()->get();

        return inertia('Company/TripsIndex', [
            'company' => ['id' => $company->id, 'name' => $company->name],
            'trips' => $trips,
        ]);
    }

    public function tripmake(Company $company)
    {
        $this->authorize('view', $company);

        $vehicles = $company->vehicles()->get(['id', 'brand', 'model', 'plate', 'color', 'seats']);
        $drivers = $company->drivers()->select('users.id', 'users.name')->get();

        return inertia('Company/TripsMake', compact('company', 'vehicles', 'drivers'));
    }

    /* ==== helpers ==== */

    private function normalizeTripTariffs(Trip $trip): void
    {
        if ($trip->type_pax_to_pax) {
            $trip->update([
                'start_free_km' => null, 'start_amd_per_km' => null, 'start_max_km' => null,
                'end_free_km' => null, 'end_amd_per_km' => null, 'end_max_km' => null,
            ]);
            return;
        }
        if ($trip->type_pax_to_b) {
            $trip->update(['start_free_km' => null, 'start_amd_per_km' => null, 'start_max_km' => null]);
        }
        if ($trip->type_a_to_pax) {
            $trip->update(['end_free_km' => null, 'end_amd_per_km' => null, 'end_max_km' => null]);
        }
    }

    private function createFrom(Company $company, TripStoreRequest $r, string $status = 'draft'): Trip
    {
        $this->authorize('manage', $company);

        // принадлежность авто и водителя компании
        $vehicle = $company->vehicles()->where('id', $r->vehicle_id)->firstOrFail();
        $driver = $company->drivers()->where('users.id', $r->assigned_driver_id)->firstOrFail();

        $trip = Trip::create([
            'company_id' => $company->id,
            'user_id' => auth()->id(),              // кто создал (менеджер/диспетчер)
            'assigned_driver_id' => $driver->id,    // кому назначено
            'vehicle_id' => $vehicle->id,

            'from_lat' => $r->from_lat, 'from_lng' => $r->from_lng, 'from_addr' => $r->from_addr,
            'to_lat' => $r->to_lat, 'to_lng' => $r->to_lng, 'to_addr' => $r->to_addr,
            'departure_at' => $r->departure_at,

            'seats_total' => $r->seats_total,
            'price_amd' => $r->price_amd,
            'pay_methods' => $r->pay_methods ?? ['cash'],
            'status' => $status,
            'description' => $r->input('description'),

            // типы
            'type_ab_fixed' => $r->boolean('type_ab_fixed'),
            'type_pax_to_pax' => $r->boolean('type_pax_to_pax'),
            'type_pax_to_b' => $r->boolean('type_pax_to_b'),
            'type_a_to_pax' => $r->boolean('type_a_to_pax'),

            // тарифы Trip
            'start_free_km' => $r->input('start_free_km'),
            'start_amd_per_km' => $r->input('start_amd_per_km'),
            'start_max_km' => $r->input('start_max_km'),
            'end_free_km' => $r->input('end_free_km'),
            'end_amd_per_km' => $r->input('end_amd_per_km'),
            'end_max_km' => $r->input('end_max_km'),
        ]);

        if ($ids = (array)$r->input('amenities', [])) $trip->amenities()->sync($ids);

        $stops = collect($r->input('stops', []))
            ->values()->take(10)
            ->map(fn($s, $i) => [
                'position' => $s['position'] ?? ($i + 1),
                'name' => $s['name'] ?? null,
                'addr' => $s['addr'] ?? null,
                'lat' => (float)$s['lat'],
                'lng' => (float)$s['lng'],
                'free_km' => $s['free_km'] ?? null,
                'amd_per_km' => $s['amd_per_km'] ?? null,
                'max_km' => $s['max_km'] ?? null,
            ])->all();
        if ($stops) $trip->stops()->createMany($stops);

        $this->normalizeTripTariffs($trip);
        app(\App\Services\Geo\TripEtaService::class)->recalcAndSave($trip);

        return $trip;
    }

    /* ==== mutations ==== */

    public function store(TripStoreRequest $r, Company $company)
    {
        $t = $this->createFrom($company, $r, 'draft');
        return redirect()->route('company.trips.make', $company)->with('ok', 'Երթուղին ստեղծվեց (սևագիր)');
    }

    public function storeAndPublish(TripStoreRequest $r, Company $company)
    {
        $t = $this->createFrom($company, $r, 'published');
        return redirect()->route('company.trips.make', $company)->with('ok', 'Հրապարակվեց');
    }

    public function show(Company $company, Trip $trip)
    {
        $this->authorize('view', $company);
        abort_unless((int)$trip->company_id === (int)$company->id, 404);

        $trip->load([
            'vehicle:id,brand,model,plate,color',
            'assignedDriver:id,name',
            'amenities:id,name,slug,icon',
            'stops:id,trip_id,position,name,addr,lat,lng,free_km,amd_per_km,max_km',
        ])->loadCount([
            'rideRequests as pending_requests_count' => fn($q) => $q->where('status', 'pending'),
        ]);

        $requests = RideRequest::where('trip_id', $trip->id)
            ->latest('id')
            ->get(['id', 'trip_id', 'user_id', 'passenger_name', 'phone', 'seats', 'payment', 'status']);

        $ratings = Rating::where('trip_id', $trip->id)->get(['user_id', 'rating', 'description'])
            ->keyBy('user_id');

        $canEditStops = Gate::allows('manage', $company);

        return inertia('Company/TripShow', [
            'company' => ['id' => $company->id, 'name' => $company->name],
            'trip' => $trip,
            'requests' => $requests,
            'ratingsByUserId' => $ratings,
            'canEditStops' => $canEditStops,
        ]);
    }

    public function update(TripUpdateRequest $r, Company $company, Trip $trip)
    {
        $this->authorize('manage', $company);
        abort_unless($trip->company_id === $company->id, 403);

        $trip->update($r->only([
            'assigned_driver_id', 'vehicle_id',
            'from_lat', 'from_lng', 'from_addr',
            'to_lat', 'to_lng', 'to_addr',
            'departure_at', 'seats_total', 'price_amd',
            'pay_methods', 'description',
            'type_ab_fixed', 'type_pax_to_pax', 'type_pax_to_b', 'type_a_to_pax',
            'start_free_km', 'start_amd_per_km', 'start_max_km',
            'end_free_km', 'end_amd_per_km', 'end_max_km',
        ]));

        if ($r->has('amenities')) $trip->amenities()->sync((array)$r->input('amenities', []));

        $this->normalizeTripTariffs($trip);

        if ($r->hasAny(['from_lat', 'from_lng', 'to_lat', 'to_lng'])) {
            app(\App\Services\Geo\TripEtaService::class)->recalcAndSave($trip);
        }

        return back()->with('ok', 'Թարմացվեց');
    }

    public function replaceStops(Request $r, Company $company, Trip $trip)
    {
        $this->authorize('manage', $company);
        abort_unless($trip->company_id === $company->id, 403);

        $r->validate([
            'stops' => ['required', 'array', 'max:10'],
            'stops.*.lat' => ['required', 'numeric', 'between:-90,90'],
            'stops.*.lng' => ['required', 'numeric', 'between:-180,180'],
            'stops.*.name' => ['nullable', 'string', 'max:120'],
            'stops.*.addr' => ['nullable', 'string', 'max:255'],
            'stops.*.position' => ['nullable', 'integer', 'min:1'],
            'stops.*.free_km' => ['nullable', 'numeric', 'min:0'],
            'stops.*.amd_per_km' => ['nullable', 'integer', 'min:0'],
            'stops.*.max_km' => ['nullable', 'numeric', 'min:0'],
        ]);

        $trip->stops()->delete();
        $payload = collect($r->input('stops', []))
            ->values()->take(10)
            ->map(fn($s, $i) => [
                'position' => $s['position'] ?? ($i + 1),
                'name' => $s['name'] ?? null,
                'addr' => $s['addr'] ?? null,
                'lat' => (float)$s['lat'],
                'lng' => (float)$s['lng'],
                'free_km' => $s['free_km'] ?? null,
                'amd_per_km' => $s['amd_per_km'] ?? null,
                'max_km' => $s['max_km'] ?? null,
            ])->all();
        if ($payload) $trip->stops()->createMany($payload);

        app(\App\Services\Geo\TripEtaService::class)->recalcAndSave($trip);

        return back()->with('ok', 'Կանգառները փոխվեցին');
    }

    public function updateAmenities(Request $r, Company $company, Trip $trip)
    {
        $this->authorize('manage', $company);
        abort_unless($trip->company_id === $company->id, 403);

        $r->validate([
            'amenities' => ['required', 'array'],
            'amenities.*' => ['integer', 'exists:amenities,id'],
        ]);
        $trip->amenities()->sync((array)$r->input('amenities', []));
        return back()->with('ok', 'Հարմարությունները թարմացվեցին');
    }

    public function publish(Company $company, Trip $trip)
    {
        $this->authorize('manage', $company);
        abort_unless($trip->company_id === $company->id, 403);
        if ($trip->status !== 'draft') return back()->with('warn', 'Միայն սևագիրը կարելի է հրապարակել');

        $seatsLeft = max(0, (int)$trip->seats_total - (int)$trip->seats_taken);
        if ($seatsLeft <= 0) return back()->with('warn', 'Չկա ազատ տեղ');

        $trip->status = 'published';
        if ($trip->isFillable('published_at') && Schema::hasColumn($trip->getTable(), 'published_at')) {
            $trip->published_at = now();
        }
        $trip->save();

        return back()->with('ok', 'Հրապարակվեց');
    }

    public function archive(Company $company, Trip $trip)
    {
        $this->authorize('manage', $company);
        abort_unless($trip->company_id === $company->id, 403);
        if ($trip->status === 'archived') return back()->with('warn', 'Արդեն արխիվացված է');

        $trip->status = 'archived';
        $trip->save();
        return back()->with('ok', 'Արխիվացվեց');
    }

    public function unarchive(Company $company, Trip $trip)
    {
        $this->authorize('manage', $company);
        abort_unless($trip->company_id === $company->id, 403);
        $trip->status = 'draft';
        $trip->save();
        return back()->with('ok', 'Վերադարձվեց սևագրի');
    }

    public function start(Company $company, Trip $trip)
    {
        $this->authorize('manage', $company);
        abort_unless($trip->company_id === $company->id, 403);

        if ($trip->driver_state === 'done') return back()->with('warn', 'Ավարտված է');
        $trip->update(['driver_state' => 'en_route', 'driver_started_at' => Carbon::now()]);
        return back()->with('ok', 'Սկսվեց երթուղին');
    }

    public function finish(Company $company, Trip $trip)
    {
        $this->authorize('manage', $company);
        abort_unless($trip->company_id === $company->id, 403);

        if ($trip->driver_state !== 'en_route') return back()->with('warn', 'Նախ պետք է սկսել երթուղին');
        $trip->update(['driver_state' => 'done', 'driver_finished_at' => Carbon::now()]);
        return back()->with('ok', 'Երթուղին ավարտվեց');
    }

    /* поиск как был */
    public function search(Request $r, Company $company)
    {
        $this->authorize('view', $company);
        // ... ваш существующий метод поиска без изменений ...
        return parent::search($r, $company); // если переносите код — вставьте тело
    }
}
