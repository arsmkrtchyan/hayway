<?php
// app/Http/Controllers/Company/OwnerDashboardController.php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\{Company, Trip, Vehicle};
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class OwnerDashboardController extends Controller
{
    public function index(Request $r)
    {
        $user = $r->user();

        // Все компании владельца
        $companies = Company::query()
            ->where('owner_user_id', $user->id)
            ->orderBy('name')
            ->get(['id','name','status']);

        if ($companies->isEmpty()) {
            return inertia('Company/OwnerDashboardEmpty');
        }

        $days      = max(7, min(180, (int)$r->integer('days', 30)));
        $from      = Carbon::now()->subDays($days - 1)->startOfDay();
        $to        = Carbon::now()->endOfDay();
        $companyId = (int)($r->input('company') ?: $companies->first()->id);

        $company = $companies->firstWhere('id', $companyId);
        abort_if(!$company, 403);

        // ---------- БАЗОВЫЕ КАРТОЧКИ ----------
        $vehiclesCount = Vehicle::where('company_id', $companyId)->count();

        $driversCount = DB::table('company_members')
            ->where('company_id', $companyId)
            ->where('role', 'driver')
            ->where('status', 'active')
            ->count();

        $tripsInWindow = Trip::query()
            ->where('company_id', $companyId)
            ->whereBetween('departure_at', [$from, $to])
            ->get(['id','departure_at','seats_total','seats_taken','price_amd','assigned_driver_id']);

        $totalTrips = $tripsInWindow->count();
        $seatsOffered = (int)$tripsInWindow->sum('seats_total');

        $pendingRequests = DB::table('ride_requests as rr')
            ->join('trips as t','t.id','=','rr.trip_id')
            ->where('t.company_id', $companyId)
            ->where('rr.status','pending')
            ->count();

        // Принятые заявки в окне: revenue = price_amd * seats
        $accepted = DB::table('ride_requests as rr')
            ->join('trips as t','t.id','=','rr.trip_id')
            ->where('t.company_id', $companyId)
            ->where('rr.status','accepted')
            ->whereBetween('t.departure_at', [$from, $to])
            ->get(['rr.seats','t.price_amd','t.departure_at','t.assigned_driver_id']);

        $seatsSold   = (int)$accepted->sum('seats');
        $revenueAmd  = (int)$accepted->sum(fn($x)=> (int)$x->seats * (int)$x->price_amd);
        $loadFactor  = $seatsOffered > 0 ? round($seatsSold * 100 / $seatsOffered, 1) : 0.0;

        // Средний рейтинг по завершённым рейсам компании
        $avgRating = DB::table('ratings as r')
            ->join('trips as t','t.id','=','r.trip_id')
            ->where('t.company_id', $companyId)
            ->avg('r.rating');
        $avgRating = $avgRating ? round($avgRating, 2) : null;

        // ---------- ВРЕМЕННЫЕ РЯДЫ (на каждый день) ----------
        // Подготовим «скелет» дат
        $daysList = [];
        for ($d=0; $d<$days; $d++) {
            $key = $from->copy()->addDays($d)->format('Y-m-d');
            $daysList[$key] = ['d'=>$key,'revenue'=>0,'trips'=>0,'seats'=>0];
        }

        foreach ($tripsInWindow as $t) {
            $key = Carbon::parse($t->departure_at)->format('Y-m-d');
            if (isset($daysList[$key])) {
                $daysList[$key]['trips']++;
            }
        }
        foreach ($accepted as $a) {
            $key = Carbon::parse($a->departure_at)->format('Y-m-d');
            if (isset($daysList[$key])) {
                $daysList[$key]['revenue'] += ((int)$a->seats * (int)$a->price_amd);
                $daysList[$key]['seats']   += (int)$a->seats;
            }
        }
        $seriesDaily = array_values($daysList);

        // ---------- ТОП ВОДИТЕЛЕЙ ----------
        $byDriver = [];
        foreach ($accepted as $a) {
            $drv = (int)($a->assigned_driver_id ?? 0);
            if (!isset($byDriver[$drv])) $byDriver[$drv] = ['driver_id'=>$drv,'revenue'=>0,'seats'=>0,'trips'=>0];
            $byDriver[$drv]['revenue'] += ((int)$a->seats * (int)$a->price_amd);
            $byDriver[$drv]['seats']   += (int)$a->seats;
        }
        foreach ($tripsInWindow as $t) {
            $drv = (int)($t->assigned_driver_id ?? 0);
            if (!isset($byDriver[$drv])) $byDriver[$drv] = ['driver_id'=>$drv,'revenue'=>0,'seats'=>0,'trips'=>0];
            $byDriver[$drv]['trips']++;
        }
        $driverIds = collect(array_keys($byDriver))->filter()->values();
        $driverNames = $driverIds->isEmpty() ? collect() :
            DB::table('users')->whereIn('id',$driverIds)->pluck('name','id');

        $topDrivers = collect($byDriver)
            ->values()
            ->map(function($x) use ($driverNames){
                $name = $x['driver_id'] ? ($driverNames[$x['driver_id']] ?? ('ID '.$x['driver_id'])) : 'Անվճ. վարորդ';
                return [
                    'name'    => $name,
                    'revenue' => (int)$x['revenue'],
                    'trips'   => (int)$x['trips'],
                    'seats'   => (int)$x['seats'],
                ];
            })
            ->sortByDesc('revenue')
            ->take(8)
            ->values();

        // ---------- Распределение статусов заявок (за период) ----------
        $dist = DB::table('ride_requests as rr')
            ->join('trips as t','t.id','=','rr.trip_id')
            ->where('t.company_id', $companyId)
            ->whereBetween('t.departure_at', [$from, $to])
            ->select('rr.status', DB::raw('count(*) as c'))
            ->groupBy('rr.status')
            ->pluck('c','status');

        $requestsPie = [
            ['name'=>'accepted','value'=>(int)($dist['accepted'] ?? 0)],
            ['name'=>'pending' , 'value'=>(int)($dist['pending']  ?? 0)],
            ['name'=>'rejected', 'value'=>(int)($dist['rejected'] ?? 0)],
            ['name'=>'cancelled','value'=>(int)($dist['cancelled']?? 0)],
        ];

        // ---------- Последние заявки ----------
        $recentRequests = DB::table('ride_requests as rr')
            ->join('trips as t','t.id','=','rr.trip_id')
            ->leftJoin('users as u','u.id','=','rr.user_id')
            ->where('t.company_id',$companyId)
            ->orderByDesc('rr.id')
            ->limit(10)
            ->get([
                'rr.id','rr.seats','rr.payment','rr.status','rr.created_at',
                'u.name as user_name',
                't.from_addr','t.to_addr','t.departure_at','t.price_amd'
            ]);

        return inertia('Company/OwnerDashboard', [
            'companies' => $companies,
            'company'   => ['id'=>$company->id, 'name'=>$company->name, 'status'=>$company->status],
            'filters'   => ['days'=>$days],
            'cards'     => [
                'revenue_amd'     => $revenueAmd,
                'trips'           => $totalTrips,
                'seats_sold'      => $seatsSold,
                'seats_offered'   => $seatsOffered,
                'load_factor_pct' => $loadFactor,
                'vehicles'        => $vehiclesCount,
                'drivers'         => $driversCount,
                'pending_requests'=> $pendingRequests,
                'avg_rating'      => $avgRating,
            ],
            'charts' => [
                'daily'       => $seriesDaily,  // [{d:'YYYY-MM-DD', revenue, trips, seats}, ...]
                'topDrivers'  => $topDrivers,   // [{name, revenue, trips, seats}, ...]
                'requestsPie' => $requestsPie,  // [{name, value}, ...]
            ],
            'recent' => $recentRequests,
        ]);
    }
}
