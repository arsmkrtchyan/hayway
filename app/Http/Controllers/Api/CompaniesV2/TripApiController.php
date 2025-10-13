<?php
//
//namespace App\Http\Controllers\Api\CompaniesV2;
//
//use App\Http\Controllers\Controller;
//use App\Models\{Company, Trip, Vehicle, RideRequest, Rating, AmenityCategory};
//use Illuminate\Http\Request;
//use Illuminate\Support\Facades\DB;
//use Illuminate\Support\Facades\Gate;
//use Illuminate\Support\Facades\Schema;
//
//class TripApiController extends Controller
//{
//    public function index(Company $company)
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
//        return response()->json(['items'=>$trips]);
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
//            'stops' => fn($q)=>$q->orderBy('position'),
//        ]);
//
//        $requests = RideRequest::where('trip_id',$trip->id)
//            ->orderByDesc('id')
//            ->get(['id','trip_id','user_id','passenger_name','phone','seats','payment','status','is_checked_in','checked_in_at']);
//
//        $ratings = Rating::where('trip_id',$trip->id)->get(['user_id','rating','description'])->keyBy('user_id');
//
//        return response()->json([
//            'data'=>[
//                'trip'=>$trip,
//                'requests'=>$requests,
//                'ratingsByUserId'=>$ratings,
//            ]
//        ]);
//    }
//
//    public function store(Request $r, Company $company)
//    {
//        $this->authorize('manage', $company);
//
//        $data = $r->validate([
//            'vehicle_id'         => 'required|exists:vehicles,id',
//            'assigned_driver_id' => 'required|exists:users,id',
//            'from_addr'          => 'required|string|max:255',
//            'to_addr'            => 'required|string|max:255',
//            'from_lat'           => 'required|numeric|between:-90,90',
//            'from_lng'           => 'required|numeric|between:-180,180',
//            'to_lat'             => 'required|numeric|between:-90,90',
//            'to_lng'             => 'required|numeric|between:-180,180',
//            'price_amd'          => 'required|integer|min:0',
//            'seats_total'        => 'required|integer|min:1|max:8',
//            'departure_at'       => 'required|date',
//            'pay_methods'        => 'required|array|min:1',
//            'pay_methods.*'      => 'in:cash,card',
//            'description'        => 'nullable|string|max:5000',
//
//            'amenities'          => ['sometimes','array'],
//            'amenities.*'        => ['integer','exists:amenities,id'],
//
//            'stops'               => ['sometimes','array','max:10'],
//            'stops.*.lat'         => ['required','numeric','between:-90,90'],
//            'stops.*.lng'         => ['required','numeric','between:-180,180'],
//            'stops.*.name'        => ['nullable','string','max:120'],
//            'stops.*.addr'        => ['nullable','string','max:255'],
//            'stops.*.position'    => ['nullable','integer','min:1'],
//        ]);
//
//        if (!$company->vehicles()->where('id',$data['vehicle_id'])->exists()) {
//            return response()->json(['message'=>'Vehicle not in company'], 422);
//        }
//        if (!$company->drivers()->where('users.id',$data['assigned_driver_id'])->exists()) {
//            return response()->json(['message'=>'Driver not in company'], 422);
//        }
//
//        $trip = Trip::create([
//            'company_id'        => $company->id,
//            'user_id'           => auth()->id(),
//            'assigned_driver_id'=> $data['assigned_driver_id'],
//            'vehicle_id'        => $data['vehicle_id'],
//            'from_lat'          => $data['from_lat'],
//            'from_lng'          => $data['from_lng'],
//            'from_addr'         => $data['from_addr'],
//            'to_lat'            => $data['to_lat'],
//            'to_lng'            => $data['to_lng'],
//            'to_addr'           => $data['to_addr'],
//            'departure_at'      => $data['departure_at'],
//            'seats_total'       => $data['seats_total'],
//            'price_amd'         => $data['price_amd'],
//            'pay_methods'       => $data['pay_methods'],
//            'status'            => 'draft',
//            'description'       => $data['description'] ?? null,
//        ]);
//
//        if (!empty($data['amenities'])) $trip->amenities()->sync($data['amenities']);
//
//        $stops = collect($r->input('stops', []))
//            ->values()
//            ->take(10)
//            ->map(fn($s,$i)=>[
//                'position'=> isset($s['position']) ? (int)$s['position'] : ($i+1),
//                'name'    => $s['name'] ?? null,
//                'addr'    => $s['addr'] ?? null,
//                'lat'     => (float)$s['lat'],
//                'lng'     => (float)$s['lng'],
//            ])->all();
//        if (!empty($stops)) $trip->stops()->createMany($stops);
//
//        return response()->json(['data'=>$trip], 201);
//    }
//
//    public function publish(Company $company, Trip $trip)
//    {
//        $this->authorize('manage', $company);
//        if ($trip->company_id !== $company->id) abort(403);
//        if ($trip->status !== 'draft') return response()->json(['message'=>'only draft can be published'], 422);
//
//        $seatsLeft = max(0, (int)$trip->seats_total - (int)$trip->seats_taken);
//        if ($seatsLeft <= 0) return response()->json(['message'=>'no free seats'], 422);
//
//        $trip->status = 'published';
//        if ($trip->isFillable('published_at') && Schema::hasColumn($trip->getTable(),'published_at')) {
//            $trip->published_at = now();
//        }
//        $trip->save();
//
//        return response()->json(['ok'=>true]);
//    }
//
//    public function archive(Company $company, Trip $trip)
//    {
//        $this->authorize('manage', $company);
//        if ($trip->company_id !== $company->id) abort(403);
//        if ($trip->status === 'archived') return response()->json(['message'=>'already archived'], 422);
//        $trip->status = 'archived';
//        $trip->save();
//        return response()->json(['ok'=>true]);
//    }
//
//    public function unarchive(Company $company, Trip $trip)
//    {
//        $this->authorize('manage', $company);
//        if ($trip->company_id !== $company->id) abort(403);
//        $trip->status = 'draft';
//        $trip->save();
//        return response()->json(['ok'=>true]);
//    }
//
//    public function replaceStops(Request $r, Company $company, Trip $trip)
//    {
//        $this->authorize('manage', $company);
//        abort_unless((int)$trip->company_id === (int)$company->id, 404);
//
//        $data = $r->validate([
//            'stops'               => ['present','array','max:10'],
//            'stops.*.lat'         => ['nullable','numeric','between:-90,90'],
//            'stops.*.lng'         => ['nullable','numeric','between:-180,180'],
//            'stops.*.name'        => ['nullable','string','max:120'],
//            'stops.*.addr'        => ['nullable','string','max:255'],
//            'stops.*.position'    => ['nullable','integer','min:1'],
//        ]);
//
//        $stops = collect($data['stops'])->values()->map(fn($s,$i)=>[
//            'position'=> isset($s['position']) ? (int)$s['position'] : ($i+1),
//            'name'    => $s['name'] ?? null,
//            'addr'    => $s['addr'] ?? null,
//            'lat'     => (float)$s['lat'],
//            'lng'     => (float)$s['lng'],
//        ])->all();
//
//        $trip->stops()->delete();
//        if (!empty($stops)) $trip->stops()->createMany($stops);
//
//        return response()->json(['ok'=>true]);
//    }
//
//    public function amenitiesShow(Company $company, Trip $trip)
//    {
//        $this->authorize('manage', $company);
//        abort_unless((int)$trip->company_id === (int)$company->id, 404);
//
//        $categories = AmenityCategory::with(['amenities'=>fn($q)=>$q->where('is_active',true)->orderBy('sort_order')->orderBy('id')])
//            ->where('is_active',true)->orderBy('sort_order')->orderBy('id')->get();
//
//        $selectedIds = $trip->amenities()->pluck('amenities.id')->all();
//
//        return response()->json([
//            'trip_id'      => $trip->id,
//            'selected_ids' => $selectedIds,
//            'categories'   => $categories,
//        ]);
//    }
//
//    public function amenitiesUpdate(Request $r, Company $company, Trip $trip)
//    {
//        $this->authorize('manage', $company);
//        abort_unless((int)$trip->company_id === (int)$company->id, 404);
//
//        $data = $r->validate([
//            'amenity_ids'   => ['array'],
//            'amenity_ids.*' => ['integer','exists:amenities,id'],
//        ]);
//
//        $trip->amenities()->sync($data['amenity_ids'] ?? []);
//        $selectedIds = $trip->amenities()->pluck('amenities.id')->all();
//
//        return response()->json(['ok'=>true,'selected_ids'=>$selectedIds]);
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
//        $qFrom = self::norm($data['from'] ?? '');
//        $qTo   = self::norm($data['to']   ?? '');
//        $limit = (int)($data['limit'] ?? 30);
//        $exclude = $data['exclude'] ?? null;
//
//        $base = Trip::query()
//            ->where('company_id',$company->id)
//            ->where('status','published')
//            ->whereNull('driver_finished_at')
//            ->whereBetween('departure_at',[now()->subDay(), now()->addDays(60)])
//            ->orderBy('departure_at');
//
//        if ($exclude) $base->where('id','!=',(int)$exclude);
//
//        $candidates = $base->limit(250)->get(['id','from_addr','to_addr','departure_at','seats_total','seats_taken','price_amd']);
//
//        $hasFrom = strlen($qFrom)>0; $hasTo = strlen($qTo)>0;
//        $result = [];
//        foreach ($candidates as $t) {
//            $fromN = self::norm($t->from_addr);
//            $toN   = self::norm($t->to_addr);
//            $okFrom = !$hasFrom || str_contains($fromN,$qFrom) || (!$hasTo && str_contains($toN,$qFrom));
//            $okTo   = !$hasTo   || str_contains($toN,$qTo)   || (!$hasFrom && str_contains($fromN,$qTo));
//            if ($okFrom && $okTo) {
//                $result[] = [
//                    'id'=>$t->id,'from_addr'=>$t->from_addr,'to_addr'=>$t->to_addr,
//                    'departure_at'=>$t->departure_at,
//                    'seats_total'=>(int)$t->seats_total,'seats_taken'=>(int)$t->seats_taken,
//                    'price_amd'=>(int)$t->price_amd,
//                ];
//                if (count($result) >= $limit) break;
//            }
//        }
//
//        return response()->json(['items'=>$result]);
//    }
//
//    private static function norm(?string $s): string
//    {
//        $s = trim((string)$s);
//        if (class_exists(\Transliterator::class)) {
//            $tr = \Transliterator::create('Any-Latin; Latin-ASCII; Lower()');
//            $s = $tr ? $tr->transliterate($s) : mb_strtolower($s,'UTF-8');
//        } else {
//            $s = mb_strtolower($s,'UTF-8');
//            $c = @iconv('UTF-8','ASCII//TRANSLIT//IGNORE',$s);
//            if ($c!==false) $s=$c;
//        }
//        $s = strtr($s,['yo'=>'e','jo'=>'e']);
//        $s = preg_replace('~[^a-z0-9\s]+~',' ',$s);
//        $s = preg_replace('~\s+~',' ',$s);
//        return trim($s);
//    }
//}


namespace App\Http\Controllers\Api\CompaniesV2;

use App\Http\Controllers\Controller;
use App\Models\{Company, Trip, Vehicle, RideRequest, Rating, AmenityCategory};
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TripApiController extends Controller
{
    /* =========================
     |         LIST
     |=========================*/
    public function index(Request $r, Company $company)
    {
        $this->authorize('view', $company);

        $q = $company->trips()
            ->with(['vehicle:id,brand,model,plate,color', 'assignedDriver:id,name'])
            ->withCount([
                'rideRequests as pending_requests_count' => fn($q) => $q->where('status', 'pending'),
                'rideRequests as accepted_requests_count' => fn($q) => $q->where('status', 'accepted'),
            ])
            ->latest('id');

        if ($r->filled('status')) $q->where('status', $r->string('status'));
        if ($r->filled('driver_state')) $q->where('driver_state', $r->string('driver_state'));
        if ($r->filled('date_from')) $q->where('departure_at', '>=', Carbon::parse($r->date_from));
        if ($r->filled('date_to')) $q->where('departure_at', '<=', Carbon::parse($r->date_to));

        $per = max(1, min(50, (int)$r->input('page.size', 20)));
        $list = $q->paginate($per)->withQueryString();

        return response()->json([
            'data' => $list->items(),
            'meta' => [
                'page' => $list->currentPage(),
                'per_page' => $list->perPage(),
                'total' => $list->total(),
                'last_page' => $list->lastPage(),
            ],
        ]);
    }

    /* =========================
     |         SHOW
     |=========================*/
    public function show(Company $company, Trip $trip)
    {
        $this->authorize('view', $company);
        abort_unless((int)$trip->company_id === (int)$company->id, 404);

        $trip->load([
            'vehicle:id,brand,model,plate,color',
            'assignedDriver:id,name',
            'stops' => fn($q) => $q->orderBy('position'),
            'amenities:id,name,slug,icon',
        ])->loadCount([
            'rideRequests as pending_requests_count' => fn($q) => $q->where('status', 'pending'),
            'rideRequests as accepted_requests_count' => fn($q) => $q->where('status', 'accepted'),
        ]);

        $requests = RideRequest::where('trip_id', $trip->id)
            ->orderByDesc('id')
            ->get([
                'id', 'trip_id', 'user_id', 'passenger_name', 'phone', 'seats', 'payment',
                'status', 'is_checked_in', 'checked_in_at'
            ]);

        $ratingsByUserId = Rating::where('trip_id', $trip->id)
            ->get(['user_id', 'rating', 'description'])
            ->keyBy('user_id');

        return response()->json([
            'data' => [
                'trip' => $trip,
                'requests' => $requests,
                'ratingsByUserId' => $ratingsByUserId,
            ],
        ]);
    }

    /* =========================
     |     CREATE (helpers)
     |=========================*/
    private function baseRules(): array
    {
        return [
            'vehicle_id' => ['required', 'exists:vehicles,id'],
            'assigned_driver_id' => ['required', 'exists:users,id'],

            'from_addr' => ['required', 'string', 'max:255'],
            'to_addr' => ['required', 'string', 'max:255'],
            'from_lat' => ['required', 'numeric', 'between:-90,90'],
            'from_lng' => ['required', 'numeric', 'between:-180,180'],
            'to_lat' => ['required', 'numeric', 'between:-90,90'],
            'to_lng' => ['required', 'numeric', 'between:-180,180'],

            'departure_at' => ['required', 'date'],
            'seats_total' => ['required', 'integer', 'min:1', 'max:8'],
            'price_amd' => ['required', 'integer', 'min:0'],
            'pay_methods' => ['required', 'array', 'min:1'],
            'pay_methods.*' => ['in:cash,card'],
            'description' => ['nullable', 'string', 'max:5000'],

            // Trip types (rovno odin true)
            'type_ab_fixed' => ['sometimes', 'boolean'],
            'type_pax_to_pax' => ['sometimes', 'boolean'],
            'type_pax_to_b' => ['sometimes', 'boolean'],
            'type_a_to_pax' => ['sometimes', 'boolean'],

            // Trip-level tariffs (optional)
            'start_free_km' => ['nullable', 'numeric', 'min:0'],
            'start_amd_per_km' => ['nullable', 'integer', 'min:0'],
            'start_max_km' => ['nullable', 'numeric', 'min:0'],
            'end_free_km' => ['nullable', 'numeric', 'min:0'],
            'end_amd_per_km' => ['nullable', 'integer', 'min:0'],
            'end_max_km' => ['nullable', 'numeric', 'min:0'],

            // amenities
            'amenities' => ['sometimes', 'array'],
            'amenities.*' => ['integer', 'exists:amenities,id'],

            // stops (+ per-stop tariffs)
            'stops' => ['sometimes', 'array', 'max:10'],
            'stops.*.lat' => ['required', 'numeric', 'between:-90,90'],
            'stops.*.lng' => ['required', 'numeric', 'between:-180,180'],
            'stops.*.name' => ['nullable', 'string', 'max:120'],
            'stops.*.addr' => ['nullable', 'string', 'max:255'],
            'stops.*.position' => ['nullable', 'integer', 'min:1'],
            'stops.*.free_km' => ['nullable', 'numeric', 'min:0'],
            'stops.*.amd_per_km' => ['nullable', 'integer', 'min:0'],
            'stops.*.max_km' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    private function createFrom(Request $r, Company $company, string $status = 'draft'): Trip
    {
        $data = $r->validate($this->baseRules());

        // Ownership checks
        if (!$company->vehicles()->where('id', $data['vehicle_id'])->exists()) {
            abort(response()->json(['message' => 'Vehicle not in company'], 422));
        }
        if (!$company->drivers()->where('users.id', $data['assigned_driver_id'])->exists()) {
            abort(response()->json(['message' => 'Driver not in company'], 422));
        }

        // Base payload
        $payload = [
            'company_id' => $company->id,
            'user_id' => auth()->id(),
            'assigned_driver_id' => $data['assigned_driver_id'],
            'vehicle_id' => $data['vehicle_id'],
            'from_lat' => $data['from_lat'],
            'from_lng' => $data['from_lng'],
            'from_addr' => $data['from_addr'],
            'to_lat' => $data['to_lat'],
            'to_lng' => $data['to_lng'],
            'to_addr' => $data['to_addr'],
            'departure_at' => $data['departure_at'],
            'seats_total' => $data['seats_total'],
            'price_amd' => $data['price_amd'],
            'pay_methods' => $data['pay_methods'],
            'status' => $status,
            'description' => $data['description'] ?? null,
        ];

        // Trip types (optional flags)
        foreach (['type_ab_fixed', 'type_pax_to_pax', 'type_pax_to_b', 'type_a_to_pax'] as $flag) {
            if ($r->has($flag)) $payload[$flag] = (bool)$r->boolean($flag);
        }

        // Trip-level tariffs (store only if columns exist)
        $tariffKeys = [
            'start_free_km', 'start_amd_per_km', 'start_max_km',
            'end_free_km', 'end_amd_per_km', 'end_max_km',
        ];
        foreach ($tariffKeys as $k) {
            if ($r->filled($k) && Schema::hasColumn((new Trip)->getTable(), $k)) {
                $payload[$k] = $r->input($k);
            }
        }

        $trip = Trip::create($payload);

        // amenities
        if ($r->filled('amenities')) {
            $trip->amenities()->sync((array)$r->input('amenities', []));
        }

        // stops (with optional local tariffs)
        $stops = collect($r->input('stops', []))
            ->values()
            ->take(10)
            ->map(function ($s, $i) {
                return [
                    'position' => isset($s['position']) ? (int)$s['position'] : ($i + 1),
                    'name' => $s['name'] ?? null,
                    'addr' => $s['addr'] ?? null,
                    'lat' => (float)$s['lat'],
                    'lng' => (float)$s['lng'],
                    'free_km' => isset($s['free_km']) ? (float)$s['free_km'] : null,
                    'amd_per_km' => isset($s['amd_per_km']) ? (int)$s['amd_per_km'] : null,
                    'max_km' => isset($s['max_km']) ? (float)$s['max_km'] : null,
                ];
            })->all();
        if (!empty($stops)) $trip->stops()->createMany($stops);

        return $trip;
    }

    /* =========================
     |     CREATE (draft)
     |=========================*/
    public function store(Request $r, Company $company)
    {
        $this->authorize('manage', $company);
        $trip = $this->createFrom($r, $company, 'draft');
        return response()->json(['data' => ['id' => $trip->id, 'status' => 'draft_saved']], 201);
    }

    /* =========================
     |     CREATE+PUBLISH
     |=========================*/
    public function storePublished(Request $r, Company $company)
    {
        $this->authorize('manage', $company);
        $trip = $this->createFrom($r, $company, 'published');
        if (Schema::hasColumn($trip->getTable(), 'published_at')) {
            $trip->update(['published_at' => now()]);
        }
        return response()->json(['data' => ['id' => $trip->id, 'status' => 'published']], 201);
    }

    /* =========================
     |        UPDATE
     |=========================*/
    public function update(Request $r, Company $company, Trip $trip)
    {
        $this->authorize('manage', $company);
        abort_unless((int)$trip->company_id === (int)$company->id, 404);

        $r->validate([
            'departure_at' => ['nullable', 'date'],
            'price_amd' => ['nullable', 'integer', 'min:0'],
            'seats_total' => ['nullable', 'integer', 'min:1', 'max:8'],
            'pay_methods' => ['nullable', 'array'],
            'description' => ['nullable', 'string', 'max:5000'],

            // types
            'type_ab_fixed' => ['sometimes', 'boolean'],
            'type_pax_to_pax' => ['sometimes', 'boolean'],
            'type_pax_to_b' => ['sometimes', 'boolean'],
            'type_a_to_pax' => ['sometimes', 'boolean'],

            // trip-level tariffs
            'start_free_km' => ['nullable', 'numeric', 'min:0'],
            'start_amd_per_km' => ['nullable', 'integer', 'min:0'],
            'start_max_km' => ['nullable', 'numeric', 'min:0'],
            'end_free_km' => ['nullable', 'numeric', 'min:0'],
            'end_amd_per_km' => ['nullable', 'integer', 'min:0'],
            'end_max_km' => ['nullable', 'numeric', 'min:0'],

            // amenities (optional full replace)
            'amenities' => ['sometimes', 'array'],
            'amenities.*' => ['integer', 'exists:amenities,id'],
        ]);

        $patch = $r->only('departure_at', 'price_amd', 'seats_total', 'pay_methods', 'description');

        foreach (['type_ab_fixed', 'type_pax_to_pax', 'type_pax_to_b', 'type_a_to_pax'] as $flag) {
            if ($r->has($flag)) $patch[$flag] = (bool)$r->boolean($flag);
        }
        foreach (['start_free_km', 'start_amd_per_km', 'start_max_km', 'end_free_km', 'end_amd_per_km', 'end_max_km'] as $k) {
            if ($r->has($k) && Schema::hasColumn($trip->getTable(), $k)) $patch[$k] = $r->input($k);
        }

        $trip->update($patch);
        if ($r->has('amenities')) $trip->amenities()->sync((array)$r->input('amenities', []));

        return response()->json(['data' => ['id' => $trip->id, 'status' => 'updated']]);
    }

    /* =========================
     |    PUBLISH / ARCHIVE
     |=========================*/
    public function publish(Company $company, Trip $trip)
    {
        $this->authorize('manage', $company);
        if ($trip->company_id !== $company->id) abort(403);
        if ($trip->status !== 'draft') return response()->json(['message' => 'only draft can be published'], 422);

        $seatsLeft = max(0, (int)$trip->seats_total - (int)$trip->seats_taken);
        if ($seatsLeft <= 0) return response()->json(['message' => 'no free seats'], 422);

        $patch = ['status' => 'published'];
        if (Schema::hasColumn($trip->getTable(), 'published_at')) $patch['published_at'] = now();

        $trip->update($patch);
        return response()->json(['data' => ['id' => $trip->id, 'status' => 'published']]);
    }

    public function archive(Company $company, Trip $trip)
    {
        $this->authorize('manage', $company);
        if ($trip->company_id !== $company->id) abort(403);
        if ($trip->status === 'archived') return response()->json(['message' => 'already archived'], 422);
        $trip->update(['status' => 'archived']);
        return response()->json(['data' => ['id' => $trip->id, 'status' => 'archived']]);
    }

    public function unarchive(Company $company, Trip $trip)
    {
        $this->authorize('manage', $company);
        if ($trip->company_id !== $company->id) abort(403);
        $trip->update(['status' => 'draft']);
        return response()->json(['data' => ['id' => $trip->id, 'status' => 'draft']]);
    }

    /* =========================
     |     DRIVER STATE
     |=========================*/
    public function start(Company $company, Trip $trip)
    {
        $this->authorize('manage', $company);
        if ($trip->company_id !== $company->id) abort(403);
        if ($trip->driver_state === 'done') return response()->json(['message' => 'already_finished'], 409);
        $trip->update(['driver_state' => 'en_route', 'driver_started_at' => now()]);
        return response()->json(['data' => ['id' => $trip->id, 'driver_state' => 'en_route']]);
    }

    public function finish(Company $company, Trip $trip)
    {
        $this->authorize('manage', $company);
        if ($trip->company_id !== $company->id) abort(403);
        if ($trip->driver_state !== 'en_route') return response()->json(['message' => 'not_started'], 409);
        $trip->update(['driver_state' => 'done', 'driver_finished_at' => now()]);
        return response()->json(['data' => ['id' => $trip->id, 'driver_state' => 'done']]);
    }

    /* =========================
     |      STOPS REPLACE
     |=========================*/
    public function replaceStops(Request $r, Company $company, Trip $trip)
    {
        $this->authorize('manage', $company);
        abort_unless((int)$trip->company_id === (int)$company->id, 404);

        $data = $r->validate([
            'stops' => ['present', 'array', 'max:10'],
            'stops.*.lat' => ['nullable', 'numeric', 'between:-90,90'],
            'stops.*.lng' => ['nullable', 'numeric', 'between:-180,180'],
            'stops.*.name' => ['nullable', 'string', 'max:120'],
            'stops.*.addr' => ['nullable', 'string', 'max:255'],
            'stops.*.position' => ['nullable', 'integer', 'min:1'],
            'stops.*.free_km' => ['nullable', 'numeric', 'min:0'],
            'stops.*.amd_per_km' => ['nullable', 'integer', 'min:0'],
            'stops.*.max_km' => ['nullable', 'numeric', 'min:0'],
        ]);

        $stops = collect($data['stops'])->values()->map(fn($s, $i) => [
            'position' => isset($s['position']) ? (int)$s['position'] : ($i + 1),
            'name' => $s['name'] ?? null,
            'addr' => $s['addr'] ?? null,
            'lat' => isset($s['lat']) ? (float)$s['lat'] : null,
            'lng' => isset($s['lng']) ? (float)$s['lng'] : null,
            'free_km' => isset($s['free_km']) ? (float)$s['free_km'] : null,
            'amd_per_km' => isset($s['amd_per_km']) ? (int)$s['amd_per_km'] : null,
            'max_km' => isset($s['max_km']) ? (float)$s['max_km'] : null,
        ])->all();

        $trip->stops()->delete();
        if (!empty($stops)) $trip->stops()->createMany($stops);

        return response()->json(['data' => ['id' => $trip->id, 'stops_replaced' => true]]);
    }

    /* =========================
     |        AMENITIES
     |=========================*/
    public function amenitiesShow(Company $company, Trip $trip)
    {
        $this->authorize('manage', $company);
        abort_unless((int)$trip->company_id === (int)$company->id, 404);

        $categories = AmenityCategory::with(['amenities' => fn($q) => $q->where('is_active', true)->orderBy('sort_order')->orderBy('id')])
            ->where('is_active', true)->orderBy('sort_order')->orderBy('id')->get();

        $selectedIds = $trip->amenities()->pluck('amenities.id')->all();

        return response()->json([
            'trip_id' => $trip->id,
            'selected_ids' => $selectedIds,
            'categories' => $categories,
        ]);
    }

    public function amenitiesUpdate(Request $r, Company $company, Trip $trip)
    {
        $this->authorize('manage', $company);
        abort_unless((int)$trip->company_id === (int)$company->id, 404);

        $data = $r->validate([
            'amenity_ids' => ['array'],
            'amenity_ids.*' => ['integer', 'exists:amenities,id'],
        ]);

        $trip->amenities()->sync($data['amenity_ids'] ?? []);
        $selectedIds = $trip->amenities()->pluck('amenities.id')->all();

        return response()->json(['ok' => true, 'selected_ids' => $selectedIds]);
    }

    /* =========================
     |         SEARCH
     |=========================*/
    public function search(Request $r, Company $company)
    {
        $this->authorize('view', $company);

        $data = $r->validate([
            'from' => ['nullable', 'string', 'max:160'],
            'to' => ['nullable', 'string', 'max:160'],
            'exclude' => ['nullable', 'integer'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $qFrom = self::norm($data['from'] ?? '');
        $qTo = self::norm($data['to'] ?? '');
        $limit = (int)($data['limit'] ?? 30);
        $exclude = $data['exclude'] ?? null;

        $base = Trip::query()
            ->where('company_id', $company->id)
            ->where('status', 'published')
            ->whereNull('driver_finished_at')
            ->whereBetween('departure_at', [now()->subDay(), now()->addDays(60)])
            ->orderBy('departure_at');

        if ($exclude) $base->where('id', '!=', (int)$exclude);

        $candidates = $base->limit(250)->get(['id', 'from_addr', 'to_addr', 'departure_at', 'seats_total', 'seats_taken', 'price_amd']);

        $hasFrom = strlen($qFrom) > 0;
        $hasTo = strlen($qTo) > 0;
        $result = [];
        foreach ($candidates as $t) {
            $fromN = self::norm($t->from_addr);
            $toN = self::norm($t->to_addr);
            $okFrom = !$hasFrom || str_contains($fromN, $qFrom) || (!$hasTo && str_contains($toN, $qFrom));
            $okTo = !$hasTo || str_contains($toN, $qTo) || (!$hasFrom && str_contains($fromN, $qTo));
            if ($okFrom && $okTo) {
                $result[] = [
                    'id' => $t->id,
                    'from_addr' => $t->from_addr,
                    'to_addr' => $t->to_addr,
                    'departure_at' => $t->departure_at,
                    'seats_total' => (int)$t->seats_total,
                    'seats_taken' => (int)$t->seats_taken,
                    'price_amd' => (int)$t->price_amd,
                ];
                if (count($result) >= $limit) break;
            }
        }

        return response()->json(['items' => $result]);
    }

    private static function norm(?string $s): string
    {
        $s = trim((string)$s);
        if (class_exists(\Transliterator::class)) {
            $tr = \Transliterator::create('Any-Latin; Latin-ASCII; Lower()');
            $s = $tr ? $tr->transliterate($s) : mb_strtolower($s, 'UTF-8');
        } else {
            $s = mb_strtolower($s, 'UTF-8');
            $c = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
            if ($c !== false) $s = $c;
        }
        $s = strtr($s, ['yo' => 'e', 'jo' => 'e']);
        $s = preg_replace('~[^a-z0-9\s]+~', ' ', $s);
        $s = preg_replace('~\s+~', ' ', $s);
        return trim($s);
    }
}
