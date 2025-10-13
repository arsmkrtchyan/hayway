<?php


namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\{Company, RideRequest, Trip, User};
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Быстрый вход владельца на /company/dashboard.
     * Находит первую компанию, где пользователь — владелец (companies.owner_user_id),
     * иначе первую компанию, где он участник, и редиректит на company.dashboard.show
     */
    public function ownerEntry(Request $r)
    {
        $user = $r->user();

        $company = Company::query()
            ->where('owner_user_id', $user->id)
            ->orderBy('id')
            ->first();

        if (!$company) {
            $company = Company::query()
                ->whereHas('members', fn($q) => $q->where('user_id', $user->id))
                ->orderBy('id')
                ->first();
        }

        if (!$company) {
            return redirect()->route('companies.index')
                ->with('warn', 'Դուք դեռ չունեք ընկերություն');
        }

        return redirect()->route('company.dashboard.show', $company->id);
    }

    /**
     * Основной экран дашборда компании.
     */
    public function show(Request $r, Company $company)
    {
        $this->authorize('view', $company); // по твоей политике company

        $tz = $company->timezone ?: config('app.timezone', 'UTC');

        $to = Carbon::now($tz)->endOfDay();
        $from = (clone $to)->subDays(29)->startOfDay();

        // -------- KPIs 30 дней ----------
        // доход считаем по принятым заявкам (accepted): seats * trip.price_amd
        $revenue30 = RideRequest::query()
            ->join('trips', 'trips.id', '=', 'ride_requests.trip_id')
            ->where('trips.company_id', $company->id)
            ->whereBetween('ride_requests.created_at', [$from->copy()->tz('UTC'), $to->copy()->tz('UTC')])
            ->where('ride_requests.status', 'accepted')
            ->sum(DB::raw('ride_requests.seats * trips.price_amd'));

        $trips30 = Trip::query()
            ->where('company_id', $company->id)
            ->whereBetween('departure_at', [$from->copy()->tz('UTC'), $to->copy()->tz('UTC')])
            ->count();

        $seatsSold30 = RideRequest::query()
            ->join('trips', 'trips.id', '=', 'ride_requests.trip_id')
            ->where('trips.company_id', $company->id)
            ->whereBetween('ride_requests.created_at', [$from->copy()->tz('UTC'), $to->copy()->tz('UTC')])
            ->where('ride_requests.status', 'accepted')
            ->sum('ride_requests.seats');

        $funnel = RideRequest::query()
            ->join('trips', 'trips.id', '=', 'ride_requests.trip_id')
            ->where('trips.company_id', $company->id)
            ->whereBetween('ride_requests.created_at', [$from->copy()->tz('UTC'), $to->copy()->tz('UTC')])
            ->selectRaw('ride_requests.status AS rr_status, COUNT(*) AS c')
            ->groupBy('ride_requests.status')
            ->pluck('c', 'rr_status');

        $accepted = (int)($funnel['accepted'] ?? 0);
        $totalReq = array_sum($funnel->toArray());
        $acceptRate = $totalReq > 0 ? round($accepted / $totalReq, 4) : 0;

        // средний рейтинг по оценкам, если есть
//        $avgRating = DB::table('ratings')
//            ->join('trips', 'trips.id', '=', 'ratings.trip_id')
//            ->where('trips.company_id', $company->id)
//            ->avg('ratings.rating');
//        $avgRating = $avgRating ? round($avgRating, 2) : null;

        $avgRatingRaw = DB::table('company_members')
            ->where('company_id', $company->id)
            ->where('role', 'driver')
            ->avg('rating');

        $avgRating = $avgRatingRaw !== null ? floor($avgRatingRaw * 100) / 100 : null;

        // -------- Серии по дням (30 дней) ----------
        // Trips/SeatsTaken по дням
        $dailyTrips = Trip::query()
            ->where('trips.company_id', $company->id)
            ->whereBetween('trips.departure_at', [$from->copy()->tz('UTC'), $to->copy()->tz('UTC')])
            ->selectRaw(
                "DATE((trips.departure_at AT TIME ZONE 'UTC') AT TIME ZONE ?) AS d,
         COUNT(*) AS trips,
         COALESCE(SUM(trips.seats_taken), 0) AS seats_taken",
                [$tz]
            )
            ->groupBy('d')
            ->pluck('trips', 'd')
            ->toArray();

        $dailySeatsTaken = Trip::query()
            ->where('trips.company_id', $company->id)
            ->whereBetween('trips.departure_at', [$from->copy()->tz('UTC'), $to->copy()->tz('UTC')])
            ->selectRaw(
                "DATE((trips.departure_at AT TIME ZONE 'UTC') AT TIME ZONE ?) AS d,
         COALESCE(SUM(trips.seats_taken), 0) AS seats_taken",
                [$tz]
            )
            ->groupBy('d')
            ->pluck('seats_taken', 'd')
            ->toArray();

// ---------- Daily revenue по принятым заявкам ----------
        $dailyRevenue = RideRequest::query()
            ->join('trips', 'trips.id', '=', 'ride_requests.trip_id')
            ->where('trips.company_id', $company->id)
            ->whereBetween('ride_requests.created_at', [$from->copy()->tz('UTC'), $to->copy()->tz('UTC')])
            ->where('ride_requests.status', 'accepted')
            ->selectRaw(
                "DATE((ride_requests.created_at AT TIME ZONE 'UTC') AT TIME ZONE ?) AS d,
         SUM(ride_requests.seats * trips.price_amd) AS revenue",
                [$tz]
            )
            ->groupBy('d')
            ->pluck('revenue', 'd')
            ->toArray();

// ---------- Daily requests / accepted ----------
        $dailyReq = RideRequest::query()
            ->join('trips', 'trips.id', '=', 'ride_requests.trip_id')
            ->where('trips.company_id', $company->id)
            ->whereBetween('ride_requests.created_at', [$from->copy()->tz('UTC'), $to->copy()->tz('UTC')])
            ->selectRaw(
                "DATE((ride_requests.created_at AT TIME ZONE 'UTC') AT TIME ZONE ?) AS d,
         COUNT(*) AS req_all,
         SUM(CASE WHEN ride_requests.status = 'accepted' THEN 1 ELSE 0 END) AS req_accepted",
                [$tz]
            )
            ->groupBy('d')
            ->get()
            ->keyBy('d');

        // Собираем слитую серию (на каждый день 30-дневного окна)
        $seriesDaily = [];
        $cursor = $from->copy();
        while ($cursor->lte($to)) {
            $d = $cursor->format('Y-m-d');
            $seriesDaily[] = [
                'd' => $d,
                'trips' => (int)($dailyTrips[$d] ?? 0),
                'seats' => (int)($dailySeatsTaken[$d] ?? 0),
                'revenue' => (int)($dailyRevenue[$d] ?? 0),
                'requests' => (int)($dailyReq[$d]->req_all ?? 0),
                'accepted' => (int)($dailyReq[$d]->req_accepted ?? 0),
            ];
            $cursor->addDay();
        }

        // -------- Топ водителей ----------
        // по доходу и местам (принятые заявки), берём assigned_driver_id, если есть; иначе trips.user_id
        $topDrivers = RideRequest::query()
            ->join('trips', 'trips.id', '=', 'ride_requests.trip_id')
            ->leftJoin('users as drivers', DB::raw('COALESCE(trips.assigned_driver_id, trips.user_id)'), '=', 'drivers.id')
            ->where('trips.company_id', $company->id)
            ->whereBetween('ride_requests.created_at', [$from->copy()->tz('UTC'), $to->copy()->tz('UTC')])
            ->where('ride_requests.status', 'accepted')
            ->selectRaw("COALESCE(trips.assigned_driver_id, trips.user_id) as driver_id,
                         drivers.name as driver_name,
                         SUM(ride_requests.seats * trips.price_amd) as revenue,
                         SUM(ride_requests.seats) as seats,
                         COUNT(DISTINCT trips.id) as trips")
            ->groupBy('driver_id', 'driver_name')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get();

        // -------- Недавние поездки ----------
        $recentTrips = Trip::query()
            ->where('company_id', $company->id)
            ->with(['vehicle:id,brand,model,plate', 'assignedDriver:id,name'])
            ->orderByDesc('id')
            ->limit(10)
            ->get(['id', 'from_addr', 'to_addr', 'price_amd', 'seats_total', 'seats_taken', 'status', 'departure_at', 'vehicle_id', 'assigned_driver_id']);

        // -------- Ответ ----------
        return inertia('Company/Dashboard', [
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
            ],
            'kpis' => [
                'revenue_30d' => (int)$revenue30,
                'trips_30d' => (int)$trips30,
                'seats_sold_30d' => (int)$seatsSold30,
                'accept_rate_30d' => (float)$acceptRate,
                'avg_rating' => $avgRating,
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'funnel' => [
                'pending' => (int)($funnel['pending'] ?? 0),
                'accepted' => (int)($funnel['accepted'] ?? 0),
                'rejected' => (int)($funnel['rejected'] ?? 0),
                'cancelled' => (int)($funnel['cancelled'] ?? 0),
            ],
            'series' => [
                'daily' => $seriesDaily,
            ],
            'top_drivers' => $topDrivers->map(fn($r) => [
                'id' => (int)$r->driver_id,
                'name' => $r->driver_name ?: '—',
                'revenue' => (int)$r->revenue,
                'seats' => (int)$r->seats,
                'trips' => (int)$r->trips,
            ])->values(),
            'recent_trips' => $recentTrips->map(function ($t) {
                return [
                    'id' => $t->id,
                    'from' => $t->from_addr,
                    'to' => $t->to_addr,
                    'price_amd' => (int)$t->price_amd,
                    'seats' => (int)$t->seats_taken . '/' . (int)$t->seats_total,
                    'status' => $t->status,
                    'departure_at' => optional($t->departure_at)->toIso8601String(),
                    'vehicle' => $t->vehicle ? "{$t->vehicle->brand} {$t->vehicle->model} · {$t->vehicle->plate}" : null,
                    'driver' => $t->assignedDriver->name ?? null,
                ];
            })->values(),
        ]);
    }

    /**
     * Для MySQL CONVERT_TZ нужен офсет вида +04:00.
     */
    private function offsetForTz(string $tz): string
    {
        $dt = Carbon::now($tz);
        $offsetMinutes = $dt->offsetMinutes;
        $sign = $offsetMinutes >= 0 ? '+' : '-';
        $mm = abs($offsetMinutes);
        $hh = floor($mm / 60);
        $rem = $mm % 60;
        return sprintf('%s%02d:%02d', $sign, $hh, $rem);
    }
}
