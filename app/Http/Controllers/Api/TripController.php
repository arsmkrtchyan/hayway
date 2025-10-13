<?php
//
//namespace App\Http\Controllers\Api;
//
//use App\Http\Controllers\Controller;
//use App\Http\Resources\TripResource;
//use App\Models\Trip;
//use Illuminate\Http\Request;
//
//class TripController extends Controller
//{
//    // GET /api/trips?amenities=1,3,5
//    public function index(Request $request)
//    {
//        $amenities = array_filter(array_map('intval', explode(',', (string)$request->query('amenities'))));
//
//        $q = Trip::query()
//            ->with(['amenities.category'])
//            ->when(!empty($amenities), fn($qq) => $qq->withAmenities($amenities));
//
//        // сюда можно добавить ваши остальные фильтры (from/to/date/price/и т.д.)
//        $q->orderByDesc('departure_at');
//
//        return TripResource::collection($q->paginate(20));
//    }
//}


namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use Carbon\Carbon;
use Illuminate\Http\Request;

class TripController extends Controller
{
    public function index(Request $r)
    {
        $q = Trip::query()
            ->with([
                // машина + владелец машины (user)
                'vehicle:id,brand,model,color,plate,seats,user_id,company_id',
                'vehicle.user:id,name,number',
                // водитель рейса
                'driver:id,name,number',
            ])
            ->where('status', 'published')
            ->withCount([
                'rideRequests as pending_requests_count' => fn($qq) => $qq->where('status', 'pending'),
            ]);

        if ($r->filled('from')) $q->where('from_addr', 'like', '%' . $r->string('from') . '%');
        if ($r->filled('to')) $q->where('to_addr', 'like', '%' . $r->string('to') . '%');

        if ($r->filled('date')) {
            try {
                $d = Carbon::parse($r->string('date'));
                $q->whereBetween('departure_at', [$d->copy()->startOfDay(), $d->copy()->endOfDay()]);
            } catch (\Throwable $e) {
            }
        }

        if ($r->filled('max_price')) $q->where('price_amd', '<=', (int)$r->max_price);
        if ($r->filled('pay')) $q->whereJsonContains('pay_methods', $r->string('pay'));
        if ($r->filled('seats')) {
            $need = max(1, (int)$r->seats);
            $q->whereRaw('(seats_total - seats_taken) >= ?', [$need]);
        }

        $q->orderBy('departure_at');

        $trips = $q->paginate($r->integer('per_page', 12))
            ->through(fn(Trip $t) => $this->mapTrip($t));

        return response()->json($this->paginatePayload($trips));
    }

    public function show(Trip $trip)
    {
        if ($trip->status !== 'published') abort(404);

        $trip->loadMissing([
            'vehicle:id,brand,model,color,plate,seats,user_id,company_id',
            'vehicle.user:id,name,number',
            'driver:id,name,number',
        ])->loadCount([
            'rideRequests as pending_requests_count' => fn($q) => $q->where('status', 'pending'),
        ]);

        return response()->json($this->mapTrip($trip));
    }

    private function mapTrip(Trip $t): array
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
            'pending_requests_count' => (int)($t->pending_requests_count ?? 0),
            'pay_methods' => $t->pay_methods ?? [],

            // машина (без photo_path/status)
            'vehicle' => [
                'id' => $t->vehicle->id ?? null,
                'brand' => $t->vehicle->brand ?? null,
                'model' => $t->vehicle->model ?? null,
                'plate' => $t->vehicle->plate ?? null,
                'color' => $t->vehicle->color ?? null,
                'seats' => $t->vehicle->seats ?? null,
                // владелец машины
                'owner' => [
                    'id' => $t->vehicle->user->id ?? null,
                    'name' => $t->vehicle->user->name ?? null,
                    'number' => $t->vehicle->user->number ?? null,
                ],
            ],

            // водитель рейса
            'driver' => [
                'id' => $t->driver?->id,
                'name' => $t->driver->name ?? null,
                'number' => $t->driver->number ?? null,
            ],
        ];
    }

    private function paginatePayload($paginator): array
    {
        return [
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'links' => [
                'first' => $paginator->url(1),
                'last' => $paginator->url($paginator->lastPage()),
                'prev' => $paginator->previousPageUrl(),
                'next' => $paginator->nextPageUrl(),
            ],
        ];
    }
}
