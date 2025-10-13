<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\OrdersNearbyForTripRequest;
use App\Http\Resources\RiderOrderResource;
use App\Models\RiderOrder;
use App\Models\Trip;
use App\Services\GeoMatchService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class OrderMatchController extends Controller
{
    public function index(OrdersNearbyForTripRequest $req, Trip $trip, GeoMatchService $geo)
    {
        $this->authorize('view', $trip); // опционально

        $mode = $req->string('mode','radius')->value();
        $radiusKm = (float)$req->input('radius_km', 5);
        $corridorKm = $req->input('corridor_km');

        $timeFrom = $req->filled('time_from') ? Carbon::parse($req->string('time_from')) : null;
        $timeTo   = $req->filled('time_to')   ? Carbon::parse($req->string('time_to'))   : null;

        $minSeats = (int)$req->input('min_seats', 1);
        $maxPrice = $req->input('max_price_amd');

        // первичный список: открытые, окно времени пересекается, места/цена
        $base = RiderOrder::query()
            ->open()
            ->timeWindowIntersect($timeFrom, $timeTo)
            ->when($minSeats > 1, fn($q)=>$q->where('seats','>=',$minSeats))
            ->when(is_numeric($maxPrice), fn($q)=>$q->where(function($w) use ($maxPrice) {
                $w->whereNull('desired_price_amd')->orWhere('desired_price_amd','<=',(int)$maxPrice);
            }))
            ->orderByDesc('id')
            ->limit(500) // safety cap
            ->get();

        $filtered = $geo->filterOrdersForTrip($trip, $base, $mode, $radiusKm, $corridorKm);

        // простое ранжирование: по времени начала окна, затем по желаемой цене
        $sorted = $filtered->sortBy([
            fn($o) => optional($o->when_from)->timestamp ?? PHP_INT_MAX,
            fn($o) => $o->desired_price_amd ?? PHP_INT_MAX,
        ])->values();

        // пагинация на клиенте или резать тут
        return RiderOrderResource::collection($sorted)->additional([
            'ok'=>true,
            'meta'=>[
                'count'=>$sorted->count(),
                'mode'=>$mode,
                'radius_km'=>$radiusKm,
                'corridor_km'=>$corridorKm ?? ($trip->corridor_km ?? null),
            ],
        ]);
    }
}
