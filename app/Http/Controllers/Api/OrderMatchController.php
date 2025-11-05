<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\RiderOrder;
use App\Services\OrderMatchService;
use Illuminate\Http\Request;

class OrderMatchController extends Controller
{
    public function __construct(private OrderMatchService $svc) {}

    // Подбор заказов под конкретный трип
    public function index(Trip $trip, Request $r)
    {
        $this->authorizeTrip($trip);

        $R = max(1, (int)$r->get('radius_km', 5));
        $orders = RiderOrder::query()
            ->where('status','open')
            ->where(function($w) use($trip){ $w->whereNull('when_from')->orWhere('when_from','<=',$trip->departure_at); })
            ->where(function($w) use($trip){ $w->whereNull('when_to')->orWhere('when_to','>=',$trip->departure_at); })
            ->limit(200)->get();

        $out = [];
        foreach ($orders as $o) {
            $q = $this->svc->matchForOrder($o, $R, null);
            $hit = $q->where('trips.id',$trip->id)->first();
            if ($hit) {
                $out[] = [
                    'order_id' => (int)$o->id,
                    'client_user_id' => (int)$o->client_user_id,
                    'rank_type' => (int)($hit->rank_type ?? 99),
                    'addon_from_amd' => (int)($hit->addon_from_amd ?? 0),
                    'addon_to_amd'   => (int)($hit->addon_to_amd ?? 0),
                    'd_start_km' => $hit->d_start_km !== null ? (float)$hit->d_start_km : null,
                    'd_end_km'   => $hit->d_end_km   !== null ? (float)$hit->d_end_km   : null,
                ];
            }
        }

        return response()->json(['data'=>$out]);
    }

    private function authorizeTrip(Trip $trip): void
    {
        $u = request()->user(); abort_if(!$u,401);
        // владелец трипа или назначенный водитель или админ
        $ok = $trip->user_id === $u->id || $trip->assigned_driver_id === $u->id || $u->role === 'admin';
        abort_if(!$ok, 403);
    }
}
