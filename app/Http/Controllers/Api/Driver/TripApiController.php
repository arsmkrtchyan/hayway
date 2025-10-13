<?php
//
//namespace App\Http\Controllers\Api\Driver;
//
//use App\Http\Controllers\Controller;
//use App\Models\Trip;
//use App\Models\Vehicle;
//use Illuminate\Http\Request;
//use Illuminate\Validation\Rule;
//
//class TripApiController extends Controller
//{
//    private function ensureRole(Request $r): void
//    {
//        $ok = in_array($r->user()->role, ['driver','company','admin'], true);
//        abort_unless($ok, 403, 'forbidden');
//    }
//
//    private function baseRules(): array
//    {
//        return [
//            'vehicle_id'   => ['required','integer','exists:vehicles,id'],
//            'from_lat'     => ['required','numeric'],
//            'from_lng'     => ['required','numeric'],
//            'from_addr'    => ['required','string','max:255'],
//            'to_lat'       => ['required','numeric'],
//            'to_lng'       => ['required','numeric'],
//            'to_addr'      => ['required','string','max:255'],
//            'departure_at' => ['required','date'],
//            'seats_total'  => ['required','integer','min:1','max:8'],
//            'price_amd'    => ['required','integer','min:100'],
//            'pay_methods'  => ['nullable','array'],
//            'pay_methods.*'=> [Rule::in(['cash','card'])],
//            'status'       => ['nullable', Rule::in(['draft','published'])],
//        ];
//    }
//
//    public function index(Request $r)
//    {
//        $this->ensureRole($r);
//
//        $q = Trip::query()
//            ->withCount(['rideRequests as pending_requests_count' => fn($qq)=>$qq->where('status','pending')])
//            ->where('user_id', $r->user()->id)
//            ->latest();
//
//        if ($r->filled('status')) {
//            $q->where('status', $r->string('status'));
//        }
//
//        $items = $q->paginate($r->integer('per_page', 20))
//            ->through(fn(Trip $t) => $this->map($t));
//
//        return response()->json([
//            'data'  => $items->items(),
//            'meta'  => [
//                'current_page' => $items->currentPage(),
//                'last_page'    => $items->lastPage(),
//                'per_page'     => $items->perPage(),
//                'total'        => $items->total(),
//            ],
//            'links' => [
//                'first' => $items->url(1),
//                'last'  => $items->url($items->lastPage()),
//                'prev'  => $items->previousPageUrl(),
//                'next'  => $items->nextPageUrl(),
//            ],
//        ]);
//    }
//
//    public function show(Request $r, Trip $trip)
//    {
//        $this->ensureRole($r);
//        abort_unless($trip->user_id === $r->user()->id, 403);
//
//        $trip->loadCount(['rideRequests as pending_requests_count' => fn($q)=>$q->where('status','pending')]);
//        return response()->json($this->map($trip));
//    }
//
//    public function store(Request $r)
//    {
//        $this->ensureRole($r);
//        $data = $r->validate($this->baseRules());
//
//        $vehicle = Vehicle::where('id', $data['vehicle_id'])->where('user_id', $r->user()->id)->firstOrFail();
//
//        $trip = Trip::create([
//            'user_id'      => $r->user()->id,
//            'vehicle_id'   => $vehicle->id,
//            'from_lat'     => $data['from_lat'],
//            'from_lng'     => $data['from_lng'],
//            'from_addr'    => $data['from_addr'],
//            'to_lat'       => $data['to_lat'],
//            'to_lng'       => $data['to_lng'],
//            'to_addr'      => $data['to_addr'],
//            'departure_at' => $data['departure_at'],
//            'seats_total'  => $data['seats_total'],
//            'price_amd'    => $data['price_amd'],
//            'pay_methods'  => $data['pay_methods'] ?? ['cash'],
//            'status'       => $data['status'] ?? 'draft',
//        ]);
//
//        return response()->json($this->map($trip), 201);
//    }
//
//    public function update(Request $r, Trip $trip)
//    {
//        $this->ensureRole($r);
//        abort_unless($trip->user_id === $r->user()->id, 403);
//
//        $data = $r->validate([
//            'departure_at' => ['nullable','date'],
//            'price_amd'    => ['nullable','integer','min:100'],
//            'seats_total'  => ['nullable','integer','min:1','max:8'],
//            'pay_methods'  => ['nullable','array'],
//            'pay_methods.*'=> [Rule::in(['cash','card'])],
//        ]);
//
//        if (isset($data['seats_total']) && $data['seats_total'] < $trip->seats_taken) {
//            return response()->json(['message' => 'seats_total_lt_taken'], 422);
//        }
//
//        $trip->update($data);
//        $trip->refresh()->loadCount(['rideRequests as pending_requests_count' => fn($q)=>$q->where('status','pending')]);
//
//        return response()->json($this->map($trip));
//    }
//
//    public function publish(Request $r, Trip $trip)
//    {
//        $this->ensureRole($r);
//        abort_unless($trip->user_id === $r->user()->id, 403);
//
//        if ($trip->seats_total <= $trip->seats_taken) {
//            return response()->json(['message'=>'no_free_seats'], 409);
//        }
//        $trip->update(['status' => 'published']);
//        return response()->json(['status'=>'ok']);
//    }
//
//    public function archive(Request $r, Trip $trip)
//    {
//        $this->ensureRole($r);
//        abort_unless($trip->user_id === $r->user()->id, 403);
//
//        $trip->update(['status' => 'archived']);
//        return response()->json(['status'=>'ok']);
//    }
//
//    private function map(Trip $t): array
//    {
//        return [
//            'id' => $t->id,
//            'from_addr' => (string)$t->from_addr,
//            'to_addr'   => (string)$t->to_addr,
//            'from_lat'  => (float)($t->from_lat ?? 0),
//            'from_lng'  => (float)($t->from_lng ?? 0),
//            'to_lat'    => (float)($t->to_lat ?? 0),
//            'to_lng'    => (float)($t->to_lng ?? 0),
//            'departure_at' => optional($t->departure_at)->toIso8601String(),
//            'price_amd'    => (int)$t->price_amd,
//            'seats_total'  => (int)$t->seats_total,
//            'seats_taken'  => (int)$t->seats_taken,
//            'status'       => $t->status,
//            'pay_methods'  => $t->pay_methods ?? [],
//            'pending_requests_count' => (int)($t->pending_requests_count ?? 0),
//        ];
//    }
//}


namespace App\Http\Controllers\Api\Driver;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TripApiController extends Controller
{
    private function ensureRole(Request $r): void
    {
        $ok = in_array($r->user()->role, ['driver', 'company', 'admin'], true);
        abort_unless($ok, 403, 'forbidden');
    }

    private function baseRules(): array
    {
        return [
            'vehicle_id' => ['required', 'integer', 'exists:vehicles,id'],
            'from_lat' => ['required', 'numeric'],
            'from_lng' => ['required', 'numeric'],
            'from_addr' => ['required', 'string', 'max:255'],
            'to_lat' => ['required', 'numeric'],
            'to_lng' => ['required', 'numeric'],
            'to_addr' => ['required', 'string', 'max:255'],
            'departure_at' => ['required', 'date'],
            'seats_total' => ['required', 'integer', 'min:1', 'max:8'],
            'price_amd' => ['required', 'integer', 'min:100'],
            'pay_methods' => ['nullable', 'array'],
            'pay_methods.*' => [Rule::in(['cash', 'card'])],
            'status' => ['nullable', Rule::in(['draft', 'published'])],

            // NEW: удобства
            'amenities' => ['sometimes', 'array'],
            'amenities.*' => ['integer', 'exists:amenities,id'],
        ];
    }

    public function index(Request $r)
    {
        $this->ensureRole($r);

        $q = Trip::query()
            ->with([
                'amenities:id,amenity_category_id,name,slug',
            ])
            ->withCount(['rideRequests as pending_requests_count' => fn($qq) => $qq->where('status', 'pending')])
            ->where('user_id', $r->user()->id)
            ->latest();

        if ($r->filled('status')) {
            $q->where('status', $r->string('status'));
        }

        $items = $q->paginate($r->integer('per_page', 20))
            ->through(fn(Trip $t) => $this->map($t));

        return response()->json([
            'data' => $items->items(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
            'links' => [
                'first' => $items->url(1),
                'last' => $items->url($items->lastPage()),
                'prev' => $items->previousPageUrl(),
                'next' => $items->nextPageUrl(),
            ],
        ]);
    }

    public function show(Request $r, Trip $trip)
    {
        $this->ensureRole($r);
        abort_unless($trip->user_id === $r->user()->id, 403);

        $trip->load([
            'amenities:id,amenity_category_id,name,slug',
        ])->loadCount([
            'rideRequests as pending_requests_count' => fn($q) => $q->where('status', 'pending'),
        ]);

        return response()->json($this->map($trip));
    }

    public function store(Request $r)
    {
        $this->ensureRole($r);
        $data = $r->validate($this->baseRules());

        $vehicle = Vehicle::where('id', $data['vehicle_id'])
            ->where('user_id', $r->user()->id)->firstOrFail();

        $trip = Trip::create([
            'user_id' => $r->user()->id,
            'vehicle_id' => $vehicle->id,
            'from_lat' => $data['from_lat'],
            'from_lng' => $data['from_lng'],
            'from_addr' => $data['from_addr'],
            'to_lat' => $data['to_lat'],
            'to_lng' => $data['to_lng'],
            'to_addr' => $data['to_addr'],
            'departure_at' => $data['departure_at'],
            'seats_total' => $data['seats_total'],
            'price_amd' => $data['price_amd'],
            'pay_methods' => $data['pay_methods'] ?? ['cash'],
            'status' => $data['status'] ?? 'draft',
        ]);

        // NEW: сохранить удобства
        if (!empty($data['amenities'])) {
            $trip->amenities()->sync($data['amenities']);
        }

        $trip->load('amenities:id,amenity_category_id,name,slug');

        return response()->json($this->map($trip), 201);
    }

    public function update(Request $r, Trip $trip)
    {
        $this->ensureRole($r);
        abort_unless($trip->user_id === $r->user()->id, 403);

        $data = $r->validate([
            'departure_at' => ['nullable', 'date'],
            'price_amd' => ['nullable', 'integer', 'min:100'],
            'seats_total' => ['nullable', 'integer', 'min:1', 'max:8'],
            'pay_methods' => ['nullable', 'array'],
            'pay_methods.*' => [Rule::in(['cash', 'card'])],

            // NEW: удобства
            'amenities' => ['sometimes', 'array'],
            'amenities.*' => ['integer', 'exists:amenities,id'],
        ]);

        if (isset($data['seats_total']) && $data['seats_total'] < $trip->seats_taken) {
            return response()->json(['message' => 'seats_total_lt_taken'], 422);
        }

        $trip->update($data);

        // NEW: обновить удобства, если прислали ключ
        if ($r->has('amenities')) {
            $trip->amenities()->sync((array)($data['amenities'] ?? []));
        }

        $trip->refresh()
            ->load('amenities:id,amenity_category_id,name,slug')
            ->loadCount(['rideRequests as pending_requests_count' => fn($q) => $q->where('status', 'pending')]);

        return response()->json($this->map($trip));
    }

    public function publish(Request $r, Trip $trip)
    {
        $this->ensureRole($r);
        abort_unless($trip->user_id === $r->user()->id, 403);

        if ($trip->seats_total <= $trip->seats_taken) {
            return response()->json(['message' => 'no_free_seats'], 409);
        }
        $trip->update(['status' => 'published']);
        return response()->json(['status' => 'ok']);
    }

    public function archive(Request $r, Trip $trip)
    {
        $this->ensureRole($r);
        abort_unless($trip->user_id === $r->user()->id, 403);

        $trip->update(['status' => 'archived']);
        return response()->json(['status' => 'ok']);
    }

    private function map(Trip $t): array
    {
        return [
            'id' => $t->id,
            'from_addr' => (string)$t->from_addr,
            'to_addr' => (string)$t->to_addr,
            'from_lat' => (float)($t->from_lat ?? 0),
            'from_lng' => (float)($t->from_lng ?? 0),
            'to_lat' => (float)($t->to_lat ?? 0),
            'to_lng' => (float)($t->to_lng ?? 0),
            'departure_at' => optional($t->departure_at)->toIso8601String(),
            'price_amd' => (int)$t->price_amd,
            'seats_total' => (int)$t->seats_total,
            'seats_taken' => (int)$t->seats_taken,
            'status' => $t->status,
            'pay_methods' => $t->pay_methods ?? [],
            'pending_requests_count' => (int)($t->pending_requests_count ?? 0),

            // NEW: удобства в ответе
            'amenities' => $t->relationLoaded('amenities')
                ? $t->amenities->map(fn($a) => [
                    'id' => $a->id,
                    'amenity_category_id' => $a->amenity_category_id,
                    'name' => $a->name,
                    'slug' => $a->slug,
                ])->values()
                : [],
            'amenity_ids' => $t->relationLoaded('amenities')
                ? $t->amenities->pluck('id')->values()
                : [],
        ];
    }
}
