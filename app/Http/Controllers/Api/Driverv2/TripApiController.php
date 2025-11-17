<?php
//
//namespace App\Http\Controllers\Api\Driverv2;
//
//use App\Http\Controllers\Controller;
//use App\Models\{Trip, Vehicle, Amenity};
//use Illuminate\Http\Request;
//use Illuminate\Support\Carbon;
//use Illuminate\Validation\Rule;
//
//class TripApiController extends Controller
//{
//    private function baseRules(): array
//    {
//        return [
//            'vehicle_id'   => ['required','exists:vehicles,id'],
//            'from_lat'     => ['required','numeric'],
//            'from_lng'     => ['required','numeric'],
//            'from_addr'    => ['required','string','max:255'],
//            'to_lat'       => ['required','numeric'],
//            'to_lng'       => ['required','numeric'],
//            'to_addr'      => ['required','string','max:255'],
//            'departure_at' => ['required','date'],
//            'seats_total'  => ['required','integer','min:1','max:8'],
//            'price_amd'    => ['required','integer','min:100'],
//            'pay_methods'  => ['array'],
//            'description'  => ['nullable','string','max:5000'],
//            'amenities'    => ['sometimes','array'],
//            'amenities.*'  => ['integer','exists:amenities,id'],
//            'stops'               => ['sometimes','array','max:10'],
//            'stops.*.lat'         => ['required','numeric','between:-90,90'],
//            'stops.*.lng'         => ['required','numeric','between:-180,180'],
//            'stops.*.name'        => ['nullable','string','max:120'],
//            'stops.*.addr'        => ['nullable','string','max:255'],
//            'stops.*.position'    => ['nullable','integer','min:1'],
//        ];
//    }
//
//    public function index(Request $r)
//    {
//        $uid = auth()->id();
//        $q = Trip::query()
//            ->where('user_id',$uid)
//            ->with(['vehicle:id,brand,model,plate,color'])
//            ->withCount(['requests as pending_requests_count'=>fn($q)=>$q->where('status','pending')])
//            ->latest('id');
//
//        if ($r->filled('status')) $q->where('status',$r->string('status'));
//        if ($r->filled('driver_state')) $q->where('driver_state',$r->string('driver_state'));
//
//        $per = max(1, min(50, (int)$r->input('page.size', 20)));
//        $list = $q->paginate($per)->withQueryString();
//
//        $data = $list->getCollection()->map(fn(Trip $t)=>[
//            'id'=>$t->id,'from_addr'=>$t->from_addr,'to_addr'=>$t->to_addr,
//            'departure_at'=>optional($t->departure_at)->toIso8601String(),
//            'seats_total'=>$t->seats_total,'seats_taken'=>$t->seats_taken,
//            'price_amd'=>$t->price_amd,'status'=>$t->status,'driver_state'=>$t->driver_state,
//            'vehicle'=>$t->vehicle?->only(['brand','model','plate','color']),
//            'pending_requests_count'=>$t->pending_requests_count ?? 0,
//        ])->values();
//
//        return response()->json([
//            'data'=>$data,
//            'meta'=>[
//                'page'=>$list->currentPage(),'per_page'=>$list->perPage(),
//                'total'=>$list->total(),'last_page'=>$list->lastPage(),
//            ],
//        ]);
//    }
//
//    private function createFrom(Request $r, string $status='draft'): Trip
//    {
//        $vehicle = Vehicle::where('id',$r->vehicle_id)->where('user_id',auth()->id())->firstOrFail();
//
//        $trip = Trip::create([
//            'user_id'=>auth()->id(),
//            'vehicle_id'=>$vehicle->id,
//            'from_lat'=>$r->from_lat,'from_lng'=>$r->from_lng,'from_addr'=>$r->from_addr,
//            'to_lat'=>$r->to_lat,'to_lng'=>$r->to_lng,'to_addr'=>$r->to_addr,
//            'departure_at'=>$r->departure_at,
//            'seats_total'=>$r->seats_total,
//            'price_amd'=>$r->price_amd,
//            'pay_methods'=>$r->pay_methods ?? ['cash'],
//            'status'=>$status,
//            'description'=>$r->input('description'),
//        ]);
//
//        $amenities = (array)$r->input('amenities', []);
//        if (!empty($amenities)) $trip->amenities()->sync($amenities);
//
//        $stops = collect($r->input('stops', []))->values()->take(10)->map(function($s,$i){
//            return [
//                'position'=>isset($s['position'])?(int)$s['position']:($i+1),
//                'name'=>$s['name']??null,'addr'=>$s['addr']??null,
//                'lat'=>(float)$s['lat'],'lng'=>(float)$s['lng'],
//            ];
//        })->all();
//        if (!empty($stops)) $trip->stops()->createMany($stops);
//
//        return $trip;
//    }
//
//    public function store(Request $r)
//    {
//        $r->validate($this->baseRules());
//        $t = $this->createFrom($r,'draft');
//        return response()->json(['data'=>['id'=>$t->id,'status'=>'draft_saved']], 201);
//    }
//
//    public function storePublished(Request $r)
//    {
//        $r->validate($this->baseRules());
//        $t = $this->createFrom($r,'published');
//        return response()->json(['data'=>['id'=>$t->id,'status'=>'published']], 201);
//    }
//
//    public function show(Trip $trip)
//    {
//        abort_unless($trip->user_id === auth()->id() || $trip->assigned_driver_id === auth()->id(), 403);
//
//        $trip->load([
//            'vehicle:id,brand,model,plate,color',
//            'amenities:id,name,slug,icon',
//            'stops:id,trip_id,position,name,addr,lat,lng',
//        ])->loadCount([
//            'requests as pending_requests_count'=>fn($q)=>$q->where('status','pending'),
//        ]);
//
//        return response()->json(['data'=>[
//            'id'=>$trip->id,
//            'from_addr'=>$trip->from_addr,'to_addr'=>$trip->to_addr,
//            'from_lat'=>$trip->from_lat,'from_lng'=>$trip->from_lng,
//            'to_lat'=>$trip->to_lat,'to_lng'=>$trip->to_lng,
//            'departure_at'=>optional($trip->departure_at)->toIso8601String(),
//            'seats_total'=>$trip->seats_total,'seats_taken'=>$trip->seats_taken,
//            'price_amd'=>$trip->price_amd,'status'=>$trip->status,'driver_state'=>$trip->driver_state,
//            'driver_started_at'=>optional($trip->driver_started_at)->toIso8601String(),
//            'driver_finished_at'=>optional($trip->driver_finished_at)->toIso8601String(),
//            'pay_methods'=>$trip->pay_methods ?? [],
//            'vehicle'=>$trip->vehicle?->only(['brand','model','plate','color']),
//            'amenities'=>$trip->amenities->map(fn($a)=>$a->only(['id','name','slug','icon']))->values(),
//            'stops'=>$trip->stops->sortBy('position')->values()->map(fn($s)=>[
//                'position'=>(int)$s->position,'name'=>$s->name,'addr'=>$s->addr,
//                'lat'=>(float)$s->lat,'lng'=>(float)$s->lng
//            ]),
//            'pending_requests_count'=>$trip->pending_requests_count ?? 0,
//        ]]);
//    }
//
//    public function update(Request $r, Trip $trip)
//    {
//        abort_unless($trip->user_id === auth()->id(), 403);
//
//        $r->validate([
//            'departure_at'=>'nullable|date',
//            'price_amd'=>'nullable|integer|min:100',
//            'seats_total'=>'nullable|integer|min:1|max:8',
//            'pay_methods'=>'nullable|array',
//            'description'=>'nullable|string|max:5000',
//            'amenities'=>['sometimes','array'],
//            'amenities.*'=>['integer','exists:amenities,id'],
//        ]);
//
//        $trip->update($r->only('departure_at','price_amd','seats_total','pay_methods','description'));
//        if ($r->has('amenities')) $trip->amenities()->sync((array)$r->input('amenities', []));
//        return response()->json(['data'=>['id'=>$trip->id,'status'=>'updated']]);
//    }
//
//    public function publish(Trip $trip)
//    {
//        abort_unless($trip->user_id === auth()->id(), 403);
//        $trip->update(['status'=>'published']);
//        return response()->json(['data'=>['id'=>$trip->id,'status'=>'published']]);
//    }
//
//    public function archive(Trip $trip)
//    {
//        abort_unless($trip->user_id === auth()->id(), 403);
//        $trip->update(['status'=>'archived']);
//        return response()->json(['data'=>['id'=>$trip->id,'status'=>'archived']]);
//    }
//
//    public function start(Trip $trip)
//    {
//        abort_unless($trip->user_id === auth()->id(), 403);
//        if ($trip->driver_state === 'done') {
//            return response()->json(['error'=>'already_finished'], 409);
//        }
//        $trip->update(['driver_state'=>'en_route','driver_started_at'=>Carbon::now()]);
//        return response()->json(['data'=>['id'=>$trip->id,'driver_state'=>'en_route']]);
//    }
//
//    public function finish(Trip $trip)
//    {
//        abort_unless($trip->user_id === auth()->id(), 403);
//        if ($trip->driver_state !== 'en_route') {
//            return response()->json(['error'=>'not_started'], 409);
//        }
//        $trip->update(['driver_state'=>'done','driver_finished_at'=>Carbon::now()]);
//        return response()->json(['data'=>['id'=>$trip->id,'driver_state'=>'done']]);
//    }
//}

// app/Http/Controllers/Api/DriverV2/TripApiController.php
namespace App\Http\Controllers\Api\DriverV2;

use App\Http\Controllers\Controller;
use App\Models\{Trip, Vehicle, Amenity, TripStop};
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

use App\Models\RideRequest;
use Illuminate\Support\Facades\DB;
class TripApiController extends Controller
{
    /* ===== validation ===== */
    private function baseRules(): array
    {
        return [
            'vehicle_id' => ['required', 'exists:vehicles,id'],
            'from_lat' => ['required', 'numeric', 'between:-90,90'],
            'from_lng' => ['required', 'numeric', 'between:-180,180'],
            'from_addr' => ['required', 'string', 'max:255'],
            'to_lat' => ['required', 'numeric', 'between:-90,90'],
            'to_lng' => ['required', 'numeric', 'between:-180,180'],
            'to_addr' => ['required', 'string', 'max:255'],
            'departure_at' => ['required', 'date'],
            'seats_total' => ['required', 'integer', 'min:1', 'max:8'],
            'price_amd' => ['required', 'integer', 'min:100'],
            'pay_methods' => ['array'],
            'description' => ['nullable', 'string', 'max:5000'],

            // trip types (ровно один true)
            'type_ab_fixed' => ['required', 'boolean'],
            'type_pax_to_pax' => ['required', 'boolean'],
            'type_pax_to_b' => ['required', 'boolean'],
            'type_a_to_pax' => ['required', 'boolean'],

            // trip-level tariffs
            'start_free_km' => ['nullable', 'numeric', 'min:0'],
            'start_amd_per_km' => ['nullable', 'integer', 'min:0'],
            'start_max_km' => ['nullable', 'numeric', 'min:0'],
            'end_free_km' => ['nullable', 'numeric', 'min:0'],
            'end_amd_per_km' => ['nullable', 'integer', 'min:0'],
            'end_max_km' => ['nullable', 'numeric', 'min:0'],

            // amenities
            'amenities' => ['sometimes', 'array'],
            'amenities.*' => ['integer', 'exists:amenities,id'],

            // stops
            'stops' => ['sometimes', 'array', 'max:10'],
            'stops.*.lat' => ['required', 'numeric', 'between:-90,90'],
            'stops.*.lng' => ['required', 'numeric', 'between:-180,180'],
            'stops.*.name' => ['nullable', 'string', 'max:120'],
            'stops.*.addr' => ['nullable', 'string', 'max:255'],
            'stops.*.position' => ['nullable', 'integer', 'min:1'],
            // stop-level tariffs (разрешены для всех типов)
            'stops.*.free_km' => ['nullable', 'numeric', 'min:0'],
            'stops.*.amd_per_km' => ['nullable', 'integer', 'min:0'],
            'stops.*.max_km' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    private function withValidator(Request $r): void
    {
        validator($r->all(), [])->after(function ($v) use ($r) {
            $d = $r->all();

            // one type
            $sum = intval($d['type_ab_fixed'] ?? 0) + intval($d['type_pax_to_pax'] ?? 0) + intval($d['type_pax_to_b'] ?? 0) + intval($d['type_a_to_pax'] ?? 0);
            if ($sum !== 1) $v->errors()->add('type', 'ровно один тип должен быть true');

            // max ≥ free
            if (!empty($d['start_max_km']) && isset($d['start_free_km']) && floatval($d['start_max_km']) < floatval($d['start_free_km'])) {
                $v->errors()->add('start_max_km', 'start_max_km ≥ start_free_km');
            }
            if (!empty($d['end_max_km']) && isset($d['end_free_km']) && floatval($d['end_max_km']) < floatval($d['end_free_km'])) {
                $v->errors()->add('end_max_km', 'end_max_km ≥ end_free_km');
            }

            // applicability for trip-level tariffs only
            $hasStart = ($d['start_free_km'] ?? null) !== null || ($d['start_amd_per_km'] ?? null) !== null || ($d['start_max_km'] ?? null) !== null;
            $hasEnd = ($d['end_free_km'] ?? null) !== null || ($d['end_amd_per_km'] ?? null) !== null || ($d['end_max_km'] ?? null) !== null;

            if (!empty($d['type_pax_to_pax']) && ($hasStart || $hasEnd)) {
                $v->errors()->add('tariff', 'для PAX→PAX trip-тарифы не применяются');
            }
            if (!empty($d['type_pax_to_b']) && $hasStart) {
                $v->errors()->add('start_tariff', 'для PAX→B trip-тариф только у B (конец)');
            }
            if (!empty($d['type_a_to_pax']) && $hasEnd) {
                $v->errors()->add('end_tariff', 'для A→PAX trip-тариф только у A (старт)');
            }
        })->validate();
    }

    /* ===== queries ===== */
    // public function index(Request $r)
    // {
    //     $uid = auth()->id();
    //     $q = Trip::query()
    //         ->where('user_id', $uid)
    //         ->with(['vehicle:id,brand,model,plate,color'])
    //         ->withCount(['requests as pending_requests_count' => fn($q) => $q->where('status', 'pending')])
    //         ->latest('id');

    //     if ($r->filled('status')) $q->where('status', $r->string('status'));
    //     if ($r->filled('driver_state')) $q->where('driver_state', $r->string('driver_state'));

    //     $per = max(1, min(50, (int)$r->input('page.size', 20)));
    //     $list = $q->paginate($per)->withQueryString();

    //     $data = $list->getCollection()->map(fn(Trip $t) => [
    //         'id' => $t->id, 'from_addr' => $t->from_addr, 'to_addr' => $t->to_addr,
    //         'departure_at' => optional($t->departure_at)->toIso8601String(),
    //         'seats_total' => $t->seats_total, 'seats_taken' => $t->seats_taken,
    //         'price_amd' => $t->price_amd, 'status' => $t->status, 'driver_state' => $t->driver_state,
    //         'vehicle' => $t->vehicle?->only(['brand', 'model', 'plate', 'color']),
    //         'pending_requests_count' => $t->pending_requests_count ?? 0,
    //     ])->values();

    //     return response()->json([
    //         'data' => $data,
    //         'meta' => [
    //             'page' => $list->currentPage(), 'per_page' => $list->perPage(),
    //             'total' => $list->total(), 'last_page' => $list->lastPage(),
    //         ],
    //     ]);
    // }
    public function index(\Illuminate\Http\Request $r)
{
    $uid = auth()->id();

    // Глобальный каталог удобств (1 раз на страницу)
    $amenityCatalog = \App\Models\AmenityCategory::with([
        'amenities' => fn($q) => $q
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id'),
    ])
        ->where('is_active', true)
        ->orderBy('sort_order')
        ->orderBy('id')
        ->get();

    $q = \App\Models\Trip::query()
        ->where('user_id', $uid)
        ->with([
            'vehicle:id,brand,model,plate,color',
            'amenities:id', // для selected_amenity_ids без N+1
        ])
        ->withCount([
            'requests as pending_requests_count' => fn($q) => $q->where('status','pending'),
            'stops', // быстрая сводка по остановкам
        ])
        ->latest('id');

    if ($r->filled('status'))       $q->where('status', $r->string('status'));
    if ($r->filled('driver_state')) $q->where('driver_state', $r->string('driver_state'));

    $per  = max(1, min(50, (int)$r->input('page.size', 20)));
    $list = $q->paginate($per)->withQueryString();

    $data = $list->getCollection()->map(function (\App\Models\Trip $t) {
        return [
            'id'            => $t->id,
            'from_addr'     => $t->from_addr,
            'to_addr'       => $t->to_addr,
            'departure_at'  => optional($t->departure_at)->toIso8601String(),
            'seats_total'   => $t->seats_total,
            'seats_taken'   => $t->seats_taken,
            'price_amd'     => $t->price_amd,
            'status'        => $t->status,
            'driver_state'  => $t->driver_state,
            'vehicle'       => $t->vehicle?->only(['brand','model','plate','color']),
            'pending_requests_count' => $t->pending_requests_count ?? 0,
            'stops_count'            => $t->stops_count ?? 0,

            // выбранные удобства этой поездки
            'selected_amenity_ids' => $t->amenities->pluck('id')->values(),

            // если в списке нужны типы и трип-тарифы — уже готовы
            'type_ab_fixed'   => (bool)$t->type_ab_fixed,
            'type_pax_to_pax' => (bool)$t->type_pax_to_pax,
            'type_pax_to_b'   => (bool)$t->type_pax_to_b,
            'type_a_to_pax'   => (bool)$t->type_a_to_pax,
            'start_tariff' => [
                'free_km'    => $t->start_free_km,
                'amd_per_km' => $t->start_amd_per_km,
                'max_km'     => $t->start_max_km,
            ],
            'end_tariff' => [
                'free_km'    => $t->end_free_km,
                'amd_per_km' => $t->end_amd_per_km,
                'max_km'     => $t->end_max_km,
            ],
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
        // чтобы фронт не делал второй запрос за удобствами
        'amenity_catalog' => $amenityCatalog,
    ]);
}


    /* ===== create helpers ===== */
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
            $trip->update([
                'start_free_km' => null, 'start_amd_per_km' => null, 'start_max_km' => null,
            ]);
        }
        if ($trip->type_a_to_pax) {
            $trip->update([
                'end_free_km' => null, 'end_amd_per_km' => null, 'end_max_km' => null,
            ]);
        }
    }

    private function createFrom(Request $r, string $status = 'draft'): Trip
    {
        $vehicle = Vehicle::where('id', $r->vehicle_id)->where('user_id', auth()->id())->firstOrFail();

        $trip = Trip::create([
            'user_id' => auth()->id(),
            'vehicle_id' => $vehicle->id,
            'from_lat' => $r->from_lat, 'from_lng' => $r->from_lng, 'from_addr' => $r->from_addr,
            'to_lat' => $r->to_lat, 'to_lng' => $r->to_lng, 'to_addr' => $r->to_addr,
            'departure_at' => $r->departure_at,
            'seats_total' => $r->seats_total,
            'price_amd' => $r->price_amd,
            'pay_methods' => $r->pay_methods ?? ['cash'],
            'status' => $status,
            'description' => $r->input('description'),

            // types
            'type_ab_fixed' => (bool)$r->boolean('type_ab_fixed'),
            'type_pax_to_pax' => (bool)$r->boolean('type_pax_to_pax'),
            'type_pax_to_b' => (bool)$r->boolean('type_pax_to_b'),
            'type_a_to_pax' => (bool)$r->boolean('type_a_to_pax'),

            // trip-level tariffs
            'start_free_km' => $r->input('start_free_km'),
            'start_amd_per_km' => $r->input('start_amd_per_km'),
            'start_max_km' => $r->input('start_max_km'),
            'end_free_km' => $r->input('end_free_km'),
            'end_amd_per_km' => $r->input('end_amd_per_km'),
            'end_max_km' => $r->input('end_max_km'),
        ]);

        // amenities
        $amenities = (array)$r->input('amenities', []);
        if ($amenities) $trip->amenities()->sync($amenities);

        // stops (+ stop tariffs)
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

        // normalize trip tariffs by type
        $this->normalizeTripTariffs($trip);

        // ETA
        app(\App\Services\Geo\TripEtaService::class)->recalcAndSave($trip);

        return $trip;
    }

    /* ===== mutations ===== */
    public function store(Request $r)
    {
        $r->validate($this->baseRules());
        $this->withValidator($r);
        $t = $this->createFrom($r, 'draft');
        return response()->json(['data' => ['id' => $t->id, 'status' => 'draft_saved']], 201);
    }

    public function storePublished(Request $r)
    {
        $r->validate($this->baseRules());
        $this->withValidator($r);
        $t = $this->createFrom($r, 'published');
        return response()->json(['data' => ['id' => $t->id, 'status' => 'published']], 201);
    }

    public function show(Trip $trip)
    {
        abort_unless($trip->user_id === auth()->id() || $trip->assigned_driver_id === auth()->id(), 403);

        $trip->load([
            'vehicle:id,brand,model,plate,color',
            'amenities:id,name,slug,icon',
            'stops:id,trip_id,position,name,addr,lat,lng,free_km,amd_per_km,max_km',
        ])->loadCount([
            'requests as pending_requests_count' => fn($q) => $q->where('status', 'pending'),
        ]);

        return response()->json(['data' => [
            'id' => $trip->id,
            'from_addr' => $trip->from_addr, 'to_addr' => $trip->to_addr,
            'from_lat' => $trip->from_lat, 'from_lng' => $trip->from_lng,
            'to_lat' => $trip->to_lat, 'to_lng' => $trip->to_lng,
            'departure_at' => optional($trip->departure_at)->toIso8601String(),
            'seats_total' => $trip->seats_total, 'seats_taken' => $trip->seats_taken,
            'price_amd' => $trip->price_amd, 'status' => $trip->status, 'driver_state' => $trip->driver_state,
            'driver_started_at' => optional($trip->driver_started_at)->toIso8601String(),
            'driver_finished_at' => optional($trip->driver_finished_at)->toIso8601String(),
            'pay_methods' => $trip->pay_methods ?? [],
            // types
            'type_ab_fixed' => $trip->type_ab_fixed,
            'type_pax_to_pax' => $trip->type_pax_to_pax,
            'type_pax_to_b' => $trip->type_pax_to_b,
            'type_a_to_pax' => $trip->type_a_to_pax,
            // trip tariffs
            'start_tariff' => ['free_km' => $trip->start_free_km, 'amd_per_km' => $trip->start_amd_per_km, 'max_km' => $trip->start_max_km],
            'end_tariff' => ['free_km' => $trip->end_free_km, 'amd_per_km' => $trip->end_amd_per_km, 'max_km' => $trip->end_max_km],
            'vehicle' => $trip->vehicle?->only(['brand', 'model', 'plate', 'color']),
            'amenities' => $trip->amenities->map(fn($a) => $a->only(['id', 'name', 'slug', 'icon']))->values(),
            'stops' => $trip->stops->sortBy('position')->values()->map(fn($s) => [
                'position' => (int)$s->position, 'name' => $s->name, 'addr' => $s->addr,
                'lat' => (float)$s->lat, 'lng' => (float)$s->lng,
                'free_km' => $s->free_km, 'amd_per_km' => $s->amd_per_km, 'max_km' => $s->max_km,
            ]),
            'pending_requests_count' => $trip->pending_requests_count ?? 0,
            'eta_sec' => $trip->eta_sec,
        ]]);
    }

    public function update(Request $r, Trip $trip)
    {
        abort_unless($trip->user_id === auth()->id(), 403);

        $r->validate([
            'departure_at' => 'nullable|date',
            'price_amd' => 'nullable|integer|min:100',
            'seats_total' => 'nullable|integer|min:1|max:8',
            'pay_methods' => 'nullable|array',
            'description' => 'nullable|string|max:5000',
            // type + trip tariffs (разрешено редактировать)
            'type_ab_fixed' => ['nullable', 'boolean'],
            'type_pax_to_pax' => ['nullable', 'boolean'],
            'type_pax_to_b' => ['nullable', 'boolean'],
            'type_a_to_pax' => ['nullable', 'boolean'],
            'start_free_km' => ['nullable', 'numeric', 'min:0'],
            'start_amd_per_km' => ['nullable', 'integer', 'min:0'],
            'start_max_km' => ['nullable', 'numeric', 'min:0'],
            'end_free_km' => ['nullable', 'numeric', 'min:0'],
            'end_amd_per_km' => ['nullable', 'integer', 'min:0'],
            'end_max_km' => ['nullable', 'numeric', 'min:0'],
            // amenities
            'amenities' => ['sometimes', 'array'],
            'amenities.*' => ['integer', 'exists:amenities,id'],
        ]);

        // если прислали типы, проверим «ровно один»
        $types = ['type_ab_fixed', 'type_pax_to_pax', 'type_pax_to_b', 'type_a_to_pax'];
        if (collect($types)->some(fn($k) => $r->has($k))) {
            $sum = 0;
            foreach ($types as $k) {
                $sum += (int)$r->boolean($k);
            }
            if ($sum !== 1) return response()->json(['error' => 'type_invalid'], 422);
        }

        $trip->update($r->only([
            'departure_at', 'price_amd', 'seats_total', 'pay_methods', 'description',
            'type_ab_fixed', 'type_pax_to_pax', 'type_pax_to_b', 'type_a_to_pax',
            'start_free_km', 'start_amd_per_km', 'start_max_km',
            'end_free_km', 'end_amd_per_km', 'end_max_km',
        ]));

        $this->normalizeTripTariffs($trip);

        if ($r->has('amenities')) $trip->amenities()->sync((array)$r->input('amenities', []));

        // ETA по необходимости
        if ($r->hasAny(['from_lat', 'from_lng', 'to_lat', 'to_lng'])) {
            app(\App\Services\Geo\TripEtaService::class)->recalcAndSave($trip);
        }

        return response()->json(['data' => ['id' => $trip->id, 'status' => 'updated']]);
    }

    public function replaceStops(Request $r, Trip $trip)
    {
        abort_unless($trip->user_id === auth()->id(), 403);

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

        return response()->json(['data' => ['id' => $trip->id, 'stops_count' => $trip->stops()->count()]]);
    }

    public function updateAmenities(Request $r, Trip $trip)
    {
        abort_unless($trip->user_id === auth()->id(), 403);
        $r->validate([
            'amenities' => ['required', 'array'],
            'amenities.*' => ['integer', 'exists:amenities,id'],
        ]);
        $trip->amenities()->sync((array)$r->input('amenities', []));
        return response()->json(['data' => ['id' => $trip->id, 'status' => 'amenities_updated']]);
    }

    public function publish(Trip $trip)
    {
        abort_unless($trip->user_id === auth()->id(), 403);
        $trip->update(['status' => 'published']);
        return response()->json(['data' => ['id' => $trip->id, 'status' => 'published']]);
    }

    public function archive(Trip $trip)
    {
        abort_unless($trip->user_id === auth()->id(), 403);
        $trip->update(['status' => 'archived']);
        return response()->json(['data' => ['id' => $trip->id, 'status' => 'archived']]);
    }

    public function start(Trip $trip)
    {
        abort_unless($trip->user_id === auth()->id(), 403);
        if ($trip->driver_state === 'done') return response()->json(['error' => 'already_finished'], 409);
        $trip->update(['driver_state' => 'en_route', 'driver_started_at' => Carbon::now()]);
        return response()->json(['data' => ['id' => $trip->id, 'driver_state' => 'en_route']]);
    }

    // public function finish(Trip $trip)
    // {
    //     abort_unless($trip->user_id === auth()->id(), 403);
    //     if ($trip->driver_state !== 'en_route') return response()->json(['error' => 'not_started'], 409);
    //     $trip->update(['driver_state' => 'done', 'driver_finished_at' => Carbon::now()]);
    //     return response()->json(['data' => ['id' => $trip->id, 'driver_state' => 'done']]);
    // }
    public function finish(Trip $trip)
    {
        abort_unless($trip->user_id === auth()->id(), 403);

        if ($trip->driver_state !== 'en_route') {
            return response()->json(['error' => 'not_started'], 409);
        }

        DB::transaction(function () use ($trip) {
            $now = Carbon::now();
            $driverId = auth()->id();

            // 1) Обновляем сам trip
            $trip->update([
                'driver_state'       => 'done',
                'driver_finished_at' => $now,
            ]);

            // 2) Все заявки по этому trip, которые так и остались pending → rejected
            $trip->rideRequests()
                ->where('status', 'pending')
                ->update([
                    'status'             => 'rejected',
                    'decided_by_user_id' => $driverId,
                    'decided_at'         => $now,
                ]);
        });

        return response()->json([
            'data' => [
                'id'            => $trip->id,
                'driver_state'  => 'done',
            ],
        ]);
    }
}
