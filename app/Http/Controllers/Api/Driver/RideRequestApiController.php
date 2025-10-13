<?php

namespace App\Http\Controllers\Api\Driver;

use App\Http\Controllers\Controller;
use App\Models\RideRequest;
use App\Models\Trip;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RideRequestApiController extends Controller
{
    private function ensureRole(Request $r): void
    {
        $ok = in_array($r->user()->role, ['driver','company','admin'], true);
        abort_unless($ok, 403, 'forbidden');
    }

    public function index(Request $r)
    {
        $this->ensureRole($r);

        $q = RideRequest::query()
            ->with(['trip:id,from_addr,to_addr,departure_at,user_id'])
            ->whereHas('trip', fn($qq)=>$qq->where('user_id', $r->user()->id))
            ->latest();

        if ($r->filled('status')) {
            $q->where('status', $r->string('status'));
        }

        $items = $q->paginate($r->integer('per_page', 30))
            ->through(fn(RideRequest $x) => $this->map($x));

        return response()->json([
            'data'  => $items->items(),
            'meta'  => [
                'current_page' => $items->currentPage(),
                'last_page'    => $items->lastPage(),
                'per_page'     => $items->perPage(),
                'total'        => $items->total(),
            ],
            'links' => [
                'first' => $items->url(1),
                'last'  => $items->url($items->lastPage()),
                'prev'  => $items->previousPageUrl(),
                'next'  => $items->nextPageUrl(),
            ],
        ]);
    }

    public function byTrip(Request $r, Trip $trip)
    {
        $this->ensureRole($r);
        abort_unless($trip->user_id === $r->user()->id, 403);

        $items = RideRequest::where('trip_id', $trip->id)
            ->latest()
            ->paginate($r->integer('per_page', 50))
            ->through(fn(RideRequest $x)=>$this->map($x));

        return response()->json([
            'data'  => $items->items(),
            'meta'  => [
                'current_page' => $items->currentPage(),
                'last_page'    => $items->lastPage(),
                'per_page'     => $items->perPage(),
                'total'        => $items->total(),
            ],
            'links' => [
                'first' => $items->url(1),
                'last'  => $items->url($items->lastPage()),
                'prev'  => $items->previousPageUrl(),
                'next'  => $items->nextPageUrl(),
            ],
        ]);
    }

    public function accept(Request $r, int $id)
    {
        $this->ensureRole($r);

        $result = DB::transaction(function () use ($r, $id) {
            /** @var RideRequest $req */
            $req = RideRequest::lockForUpdate()->findOrFail($id);
            $trip = Trip::lockForUpdate()->findOrFail($req->trip_id);

            abort_unless($trip->user_id === $r->user()->id, 403);
            if ($req->status !== 'pending') {
                return ['err' => 'not_pending'];
            }
            if ($trip->seats_taken + $req->seats > $trip->seats_total) {
                return ['err' => 'no_capacity'];
            }

            $trip->increment('seats_taken', $req->seats);
            $req->update([
                'status' => 'accepted',
                'decided_by_user_id' => $r->user()->id,
                'decided_at' => now(),
            ]);

            return ['ok' => true];
        });

        if (!empty($result['err'])) {
            return response()->json(['message' => $result['err']], 409);
        }
        return response()->json(['status' => 'ok']);
    }

    public function reject(Request $r, int $id)
    {
        $this->ensureRole($r);

        $req = RideRequest::with('trip')->findOrFail($id);
        abort_unless($req->trip && $req->trip->user_id === $r->user()->id, 403);

        if ($req->status !== 'pending') {
            return response()->json(['message' => 'not_pending'], 409);
        }

        $req->update([
            'status' => 'rejected',
            'decided_by_user_id' => $r->user()->id,
            'decided_at' => now(),
        ]);
        return response()->json(['status' => 'ok']);
    }

    // демо/тест
    public function fake(Request $r, Trip $trip)
    {
        $this->ensureRole($r);
        abort_unless($trip->user_id === $r->user()->id, 403);

        if (!app()->isLocal()) {
            return response()->json(['message'=>'disabled_in_prod'], 403);
        }

        $x = RideRequest::create([
            'trip_id' => $trip->id,
            'passenger_name' => 'Թեստային Ուղևոր',
            'phone' => '+374 77 00 00 00',
            'seats' => 1,
            'payment' => 'cash',
            'status' => 'pending',
            'user_id' => null,
        ]);

        return response()->json(['id'=>$x->id, 'status'=>$x->status], 201);
    }

    private function map(RideRequest $x): array
    {
        return [
            'id' => $x->id,
            'status' => $x->status,
            'payment'=> $x->payment,
            'seats'  => (int)$x->seats,
            'passenger_name' => $x->passenger_name,
            'phone'          => $x->phone,
            'description'    => $x->description, // ← добавили
            'decided_by_user_id' => $x->decided_by_user_id,
            'decided_at'         => optional($x->decided_at)->toIso8601String(),
            'trip' => $x->relationLoaded('trip') && $x->trip ? [
                'id' => $x->trip->id,
                'from_addr' => $x->trip->from_addr,
                'to_addr'   => $x->trip->to_addr,
                'departure_at' => optional($x->trip->departure_at)->toIso8601String(),
            ] : null,
        ];
    }

}
