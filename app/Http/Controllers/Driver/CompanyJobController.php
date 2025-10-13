<?php
//
//namespace App\Http\Controllers\Driver;
//
//use App\Http\Controllers\Controller;
//use App\Models\Trip;
//use Illuminate\Http\Request;
//use Illuminate\Support\Carbon;
//
//class CompanyJobController extends Controller
//{
//    public function index(Request $request)
//    {
//        $me = $request->user();
//
//        // Все рейсы компании, назначенные текущему водителю
//        $trips = Trip::query()
//            ->with([
//                'company:id,name',
//                'vehicle:id,brand,model,plate',
//            ])
//            ->withCount([
//                'rideRequests as pending_requests_count'  => fn($q)=>$q->where('status','pending'),
//                'rideRequests as accepted_requests_count' => fn($q)=>$q->where('status','accepted'),
//            ])
//            ->where('assigned_driver_id', $me->id)
//            ->orderByDesc('departure_at')
//            ->get([
//                'id','company_id','vehicle_id','assigned_driver_id',
//                'from_addr','to_addr','from_lat','from_lng','to_lat','to_lng',
//                'departure_at','seats_total','seats_taken','price_amd','pay_methods','status',
//                'driver_state','driver_started_at','driver_finished_at',
//            ]);
//
//        // Группируем для удобного отображения
//        $active   = $trips->where('driver_state','en_route')->values();
//        $upcoming = $trips->filter(function($t){
//            return in_array($t->status, ['published','draft'])
//                && ($t->driver_state === 'assigned');
//        })->values();
//        $done     = $trips->where('driver_state','done')->take(20)->values();
//
//        return inertia('Driver/CompanyJobs', [
//            'active'   => $active->map(fn($t)=>$this->mapTrip($t)),
//            'upcoming' => $upcoming->map(fn($t)=>$this->mapTrip($t)),
//            'done'     => $done->map(fn($t)=>$this->mapTrip($t)),
//        ]);
//    }
//
//    public function start(Request $request, Trip $trip)
//    {
//        $me = $request->user();
//        if ($trip->assigned_driver_id !== $me->id) abort(403);
//
//        // Стартуем только если он назначен и не завершён
//        if ($trip->driver_state === 'done') {
//            return back()->with('warn','Արդեն ավարտված է');
//        }
//        $trip->driver_state = 'en_route';
//        $trip->driver_started_at = Carbon::now();
//        $trip->save();
//
//        return back()->with('ok','Սկսվեց երթուղին');
//    }
//
//    public function finish(Request $request, Trip $trip)
//    {
//        $me = $request->user();
//        if ($trip->assigned_driver_id !== $me->id) abort(403);
//
//        if ($trip->driver_state !== 'en_route') {
//            return back()->with('warn','Նախ պետք է սկսել երթուղին');
//        }
//        $trip->driver_state = 'done';
//        $trip->driver_finished_at = Carbon::now();
//        $trip->save();
//
//        return back()->with('ok','Երթուղին ավարտվեց');
//    }
//
//    private function mapTrip(Trip $t): array
//    {
//        return [
//            'id' => $t->id,
//            'company' => $t->company ? ['id'=>$t->company->id,'name'=>$t->company->name] : null,
//            'vehicle' => $t->vehicle ? [
//                'id'=>$t->vehicle->id,'brand'=>$t->vehicle->brand,'model'=>$t->vehicle->model,'plate'=>$t->vehicle->plate
//            ] : null,
//            'from_addr'=>$t->from_addr, 'to_addr'=>$t->to_addr,
//            'from_lat'=>$t->from_lat, 'from_lng'=>$t->from_lng,
//            'to_lat'=>$t->to_lat, 'to_lng'=>$t->to_lng,
//            'departure_at'=>optional($t->departure_at)->toIso8601String(),
//            'seats_total'=>$t->seats_total, 'seats_taken'=>$t->seats_taken,
//            'price_amd'=>$t->price_amd, 'pay_methods'=>$t->pay_methods, 'status'=>$t->status,
//            'driver_state'=>$t->driver_state,
//            'driver_started_at'=>optional($t->driver_started_at)->toIso8601String(),
//            'driver_finished_at'=>optional($t->driver_finished_at)->toIso8601String(),
//            'pending_requests_count'=>$t->pending_requests_count ?? 0,
//            'accepted_requests_count'=>$t->accepted_requests_count ?? 0,
//        ];
//    }
//}


namespace App\Http\Controllers\Driver;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class CompanyJobController extends Controller
{
    public function index(Request $request)
    {
        $me = $request->user();

        $trips = Trip::query()
            ->with([
                'company:id,name,rating',
                'vehicle:id,brand,model,plate',
            ])
            ->withCount([
                'rideRequests as pending_requests_count' => fn($q) => $q->where('status', 'pending'),
                'rideRequests as accepted_requests_count' => fn($q) => $q->where('status', 'accepted'),
            ])
            ->where('assigned_driver_id', $me->id)
            ->orderByDesc('departure_at')
            ->get([
                'id', 'company_id', 'vehicle_id', 'assigned_driver_id', 'user_id',
                'from_addr', 'to_addr', 'from_lat', 'from_lng', 'to_lat', 'to_lng',
                'departure_at', 'seats_total', 'seats_taken', 'price_amd', 'pay_methods', 'status',
                'driver_state', 'driver_started_at', 'driver_finished_at',
            ]);

        $active = $trips->where('driver_state', 'en_route')->values();
        $upcoming = $trips->filter(fn($t) => in_array($t->status, ['published', 'draft']) && $t->driver_state === 'assigned'
        )->values();
        $done = $trips->where('driver_state', 'done')->take(50)->values();

        return inertia('Driver/CompanyJobs', [
            'active' => $active->map(fn($t) => $this->mapTrip($t)),
            'upcoming' => $upcoming->map(fn($t) => $this->mapTrip($t)),
            'done' => $done->map(fn($t) => $this->mapTrip($t)),
        ]);
    }

    public function start(Request $request, Trip $trip)
    {
        $me = $request->user();
        abort_unless($trip->assigned_driver_id === $me->id, 403);

        if ($trip->driver_state === 'done') {
            return back()->with('warn', 'Արդեն ավարտված է');
        }

        // один активный рейс на водителя
        $existsActive = Trip::where('assigned_driver_id', $me->id)
            ->where('driver_state', 'en_route')->exists();
        if ($existsActive) {
            return back()->with('warn', 'Ակտիվ երթուղի արդեն կա');
        }

        $trip->forceFill([
            'driver_state' => 'en_route',
            'driver_started_at' => Carbon::now(),
        ])->save();

        return back()->with('ok', 'Սկսվեց երթուղին');
    }

    public function finish(Request $request, Trip $trip)
    {
        $me = $request->user();
        abort_unless($trip->assigned_driver_id === $me->id, 403);

        if ($trip->driver_state !== 'en_route') {
            return back()->with('warn', 'Նախ պետք է սկսել երթուղին');
        }

        $trip->forceFill([
            'driver_state' => 'done',
            'driver_finished_at' => Carbon::now(),
        ])->save();

        return back()->with('ok', 'Երթուղին ավարտվեց');
    }

    private function mapTrip(Trip $t): array
    {
        return [
            'id' => $t->id,
            'company' => $t->company ? [
                'id' => $t->company->id, 'name' => $t->company->name
            ] : null,
            'vehicle' => $t->vehicle ? [
                'id' => $t->vehicle->id, 'brand' => $t->vehicle->brand, 'model' => $t->vehicle->model, 'plate' => $t->vehicle->plate
            ] : null,
            'from_addr' => $t->from_addr, 'to_addr' => $t->to_addr,
            'from_lat' => $t->from_lat, 'from_lng' => $t->from_lng,
            'to_lat' => $t->to_lat, 'to_lng' => $t->to_lng,
            'departure_at' => optional($t->departure_at)->toIso8601String(),
            'seats_total' => $t->seats_total, 'seats_taken' => $t->seats_taken,
            'price_amd' => $t->price_amd, 'pay_methods' => $t->pay_methods ?? [],
            'status' => $t->status,
            'driver_state' => $t->driver_state,
            'driver_started_at' => optional($t->driver_started_at)->toIso8601String(),
            'driver_finished_at' => optional($t->driver_finished_at)->toIso8601String(),
            'pending_requests_count' => (int)($t->pending_requests_count ?? 0),
            'accepted_requests_count' => (int)($t->accepted_requests_count ?? 0),
        ];
    }
}
