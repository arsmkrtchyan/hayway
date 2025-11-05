<?php

namespace App\Http\Controllers\Api\Driverv2;

use App\Http\Controllers\Controller;
use App\Models\{Trip, RideRequest, Vehicle};
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardApiController extends Controller
{
    public function index()
    {
        $uid = auth()->id();

        // База: авто и рейтинг из users.rating
        $vehicle     = Vehicle::where('user_id', $uid)->first();
        $userRating  = (float) DB::table('users')->where('id', $uid)->value('rating');

        // Сколько отзывов водитель получил (ratings по трипам водителя)
        $ratingsReceived = DB::table('ratings')
            ->join('trips','trips.id','=','ratings.trip_id')
            ->where('trips.user_id',$uid)
            ->count();

        // Диапазоны времени
        $now        = Carbon::now();
        $curFrom    = (clone $now)->startOfMonth();
        $curTo      = (clone $now)->endOfMonth();
        $lastStart  = (clone $now)->subMonthNoOverflow()->startOfMonth();
        $lastEnd    = (clone $lastStart)->endOfMonth();

        // Профит = сумма RideRequest.price_amd со статусом accepted по завершённым (driver_finished_at) трипам водителя
        $profitThisMonth = DB::table('ride_requests')
            ->join('trips','trips.id','=','ride_requests.trip_id')
            ->where('trips.user_id',$uid)
            ->where('ride_requests.status','accepted')
            ->whereBetween('trips.driver_finished_at', [$curFrom,$curTo])
            ->sum('ride_requests.price_amd');

        $profitLastMonth = DB::table('ride_requests')
            ->join('trips','trips.id','=','ride_requests.trip_id')
            ->where('trips.user_id',$uid)
            ->where('ride_requests.status','accepted')
            ->whereBetween('trips.driver_finished_at', [$lastStart,$lastEnd])
            ->sum('ride_requests.price_amd');

        $profitLifetime = DB::table('ride_requests')
            ->join('trips','trips.id','=','ride_requests.trip_id')
            ->where('trips.user_id',$uid)
            ->where('ride_requests.status','accepted')
            ->whereNotNull('trips.driver_finished_at')
            ->sum('ride_requests.price_amd');

        // Месячные трипы
        $tripsCreatedMonth   = Trip::where('user_id',$uid)->whereBetween('created_at',      [$curFrom,$curTo])->count();
        $tripsDepartingMonth = Trip::where('user_id',$uid)->whereBetween('departure_at',    [$curFrom,$curTo])->count();
        $tripsFinishedMonth  = Trip::where('user_id',$uid)->whereBetween('driver_finished_at',[$curFrom,$curTo])->count();

        // Месячные заявки по статусам
        $monthReqByStatus = RideRequest::whereHas('trip', fn($q)=>$q->where('user_id',$uid))
            ->whereBetween('created_at', [$curFrom,$curTo])
            ->selectRaw('status, COUNT(*) c')->groupBy('status')
            ->pluck('c','status');

        // Сейчас в ожидании (все времени)
        $pendingNow = RideRequest::whereHas('trip', fn($q)=>$q->where('user_id',$uid))
            ->where('status','pending')->count();

        // Всего трипов за всё время
        $tripsTotalAllTime = Trip::where('user_id',$uid)->count();

        // Все завершённые трипы + выручка по accepted-заявкам
        $finishedTrips = Trip::where('user_id',$uid)
            ->whereNotNull('driver_finished_at')
            ->withSum(['requests as revenue_amd' => fn($q)=>$q->where('status','accepted')], 'price_amd')
            ->orderByDesc('driver_finished_at')
            ->get([
                'id','from_addr','to_addr','departure_at','driver_finished_at',
                'seats_total','seats_taken','price_amd','status','driver_state'
            ]);

        return response()->json([
            'data' => [
                'metrics' => [
                    'profit_amd' => [
                        'this_month' => (int)$profitThisMonth,
                        'last_month' => (int)$profitLastMonth,
                        'lifetime'   => (int)$profitLifetime,
                    ],
                    'month' => [
                        'range' => [
                            'from' => $curFrom->toIso8601String(),
                            'to'   => $curTo->toIso8601String(),
                        ],
                        'trips' => [
                            'created'   => (int)$tripsCreatedMonth,
                            'departing' => (int)$tripsDepartingMonth,
                            'finished'  => (int)$tripsFinishedMonth,
                        ],
                        'ride_requests' => [
                            'pending'   => (int)($monthReqByStatus['pending']   ?? 0),
                            'accepted'  => (int)($monthReqByStatus['accepted']  ?? 0),
                            'rejected'  => (int)($monthReqByStatus['rejected']  ?? 0),
                            'cancelled' => (int)($monthReqByStatus['cancelled'] ?? 0),
                        ],
                        'rating' => [
                            'user_rating'            => round($userRating, 2), // из users.rating
                            'ratings_received_count' => (int)$ratingsReceived, // сколько записей в ratings по user_id водителя (через его трипы)
                        ],
                    ],
                    'lifetime' => [
                        'trips_total' => (int)$tripsTotalAllTime,
                    ],
                    'now' => [
                        'pending_requests' => (int)$pendingNow,
                    ],
                ],

                'finished_trips' => $finishedTrips->map(fn($t)=>[
                    'id'             => $t->id,
                    'from_addr'      => $t->from_addr,
                    'to_addr'        => $t->to_addr,
                    'departure_at'   => optional($t->departure_at)->toIso8601String(),
                    'finished_at'    => optional($t->driver_finished_at)->toIso8601String(),
                    'seats_total'    => $t->seats_total,
                    'seats_taken'    => $t->seats_taken,
                    'base_price_amd' => $t->price_amd,
                    'revenue_amd'    => (int)($t->revenue_amd ?? 0),
                    'status'         => $t->status,
                    'driver_state'   => $t->driver_state,
                ]),

                'vehicle' => $vehicle?->only(['id','brand','model','plate','color','status']),
            ],
        ]);
    }
}
