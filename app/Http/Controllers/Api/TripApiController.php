<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use Carbon\Carbon;
use Illuminate\Http\Request;

class TripApiController extends Controller
{
    public function index(Request $r)
    {
        $q = Trip::query()
            ->with([
                'vehicle:id,brand,model,color,plate,seats,user_id,company_id',
                'driver:id,name'
            ])
            ->where('status','published')
            ->withCount([
                'rideRequests as pending_requests_count' => fn($qq) => $qq->where('status','pending'),
            ]);

        if ($r->filled('from')) {
            $q->where('from_addr','like','%'.$r->string('from').'%');
        }
        if ($r->filled('to')) {
            $q->where('to_addr','like','%'.$r->string('to').'%');
        }
        if ($r->filled('date')) {
            try {
                $d = Carbon::parse($r->string('date'));
                $q->whereBetween('departure_at', [$d->copy()->startOfDay(), $d->copy()->endOfDay()]);
            } catch (\Throwable $e) {}
        }
        if ($r->filled('max_price')) {
            $q->where('price_amd','<=',(int)$r->max_price);
        }
        if ($r->filled('pay')) {
            $q->whereJsonContains('pay_methods', $r->string('pay'));
        }
        if ($r->filled('seats')) {
            $need = max(1,(int)$r->seats);
            $q->whereRaw('(seats_total - seats_taken) >= ?', [$need]);
        }

        $q->orderBy('departure_at');

        $trips = $q->paginate($r->integer('per_page', 12))->through(fn(Trip $t) => $this->mapTrip($t));

        return response()->json($this->paginatePayload($trips));
    }

    public function show(Trip $trip)
    {
        if ($trip->status !== 'published') {
            abort(404);
        }
        $trip->loadMissing([
            'vehicle:id,brand,model,color,plate,seats,user_id,company_id',
            'driver:id,name'
        ])->loadCount([
            'rideRequests as pending_requests_count' => fn($q)=>$q->where('status','pending'),
        ]);

        return response()->json($this->mapTrip($trip));
    }

    private function mapTrip(Trip $t): array
    {
        return [
            'id' => $t->id,
            'from_addr' => (string)$t->from_addr,
            'to_addr'   => (string)$t->to_addr,
            'from_lat'  => (float)($t->from_lat ?? 0),
            'from_lng'  => (float)($t->from_lng ?? 0),
            'to_lat'    => (float)($t->to_lat ?? 0),
            'to_lng'    => (float)($t->to_lng ?? 0),
            'departure_at' => optional($t->departure_at)->toIso8601String(),
            'price_amd'    => (int)$t->price_amd,
            'seats_total'  => (int)$t->seats_total,
            'seats_taken'  => (int)$t->seats_taken,
            'pending_requests_count' => (int)($t->pending_requests_count ?? 0),
            'vehicle' => [
                'brand' => $t->vehicle->brand ?? null,
                'model' => $t->vehicle->model ?? null,
                'plate' => $t->vehicle->plate ?? null,
                'color' => $t->vehicle->color ?? null,
                'seats' => $t->vehicle->seats ?? null,
            ],
            'driver' => [
                'name' => $t->driver->name ?? 'Վարորդ',
                'id'   => $t->driver?->id,
            ],
            'pay_methods' => $t->pay_methods ?? [],
        ];
    }

    private function paginatePayload($paginator): array
    {
        return [
            'data'  => $paginator->items(),
            'meta'  => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
            ],
            'links' => [
                'first' => $paginator->url(1),
                'last'  => $paginator->url($paginator->lastPage()),
                'prev'  => $paginator->previousPageUrl(),
                'next'  => $paginator->nextPageUrl(),
            ],
        ];
    }
}
