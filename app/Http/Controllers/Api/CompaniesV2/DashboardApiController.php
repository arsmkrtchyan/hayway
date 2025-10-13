<?php

namespace App\Http\Controllers\Api\CompaniesV2;

use App\Http\Controllers\Controller;
use App\Models\{Company, RideRequest, Trip};
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

use Illuminate\Http\Request;
class DashboardApiController extends Controller
{
    public function show(Company $company)
    {
        $this->authorize('view', $company);

  $company->loadCount(['vehicles','trips'])->load(['owner:id,name,email']);

      

        $tz = $company->timezone ?: config('app.timezone','UTC');
        $to = Carbon::now($tz)->endOfDay();
        $from = (clone $to)->subDays(29)->startOfDay();

        $revenue30 = RideRequest::query()
            ->join('trips','trips.id','=','ride_requests.trip_id')
            ->where('trips.company_id',$company->id)
            ->whereBetween('ride_requests.created_at', [$from->copy()->tz('UTC'), $to->copy()->tz('UTC')])
            ->where('ride_requests.status','accepted')
            ->sum(DB::raw('ride_requests.seats * trips.price_amd'));

        $trips30 = Trip::where('company_id',$company->id)
            ->whereBetween('departure_at', [$from->copy()->tz('UTC'), $to->copy()->tz('UTC')])
            ->count();

        $seatsSold30 = RideRequest::query()
            ->join('trips','trips.id','=','ride_requests.trip_id')
            ->where('trips.company_id',$company->id)
            ->whereBetween('ride_requests.created_at', [$from->copy()->tz('UTC'), $to->copy()->tz('UTC')])
            ->where('ride_requests.status','accepted')
            ->sum('ride_requests.seats');

        $funnel = RideRequest::query()
            ->join('trips','trips.id','=','ride_requests.trip_id')
            ->where('trips.company_id',$company->id)
            ->whereBetween('ride_requests.created_at', [$from->copy()->tz('UTC'), $to->copy()->tz('UTC')])
            ->selectRaw('ride_requests.status AS rr_status, COUNT(*) AS c')
            ->groupBy('ride_requests.status')
            ->pluck('c','rr_status');

        $accepted = (int)($funnel['accepted'] ?? 0);
        $totalReq = array_sum($funnel->toArray());
        $acceptRate = $totalReq>0 ? round($accepted/$totalReq,4) : 0;

        $dailyRevenue = RideRequest::query()
            ->join('trips','trips.id','=','ride_requests.trip_id')
            ->where('trips.company_id',$company->id)
            ->whereBetween('ride_requests.created_at', [$from->copy()->tz('UTC'), $to->copy()->tz('UTC')])
            ->where('ride_requests.status','accepted')
            ->selectRaw("DATE((ride_requests.created_at AT TIME ZONE 'UTC') AT TIME ZONE ?) AS d,
                         SUM(ride_requests.seats * trips.price_amd) AS revenue", [$tz])
            ->groupBy('d')->pluck('revenue','d')->toArray();

        $dailyTrips = Trip::query()
            ->where('trips.company_id',$company->id)
            ->whereBetween('trips.departure_at', [$from->copy()->tz('UTC'), $to->copy()->tz('UTC')])
            ->selectRaw("DATE((trips.departure_at AT TIME ZONE 'UTC') AT TIME ZONE ?) AS d, COUNT(*) AS trips",[$tz])
            ->groupBy('d')->pluck('trips','d')->toArray();

        $dailySeatsTaken = Trip::query()
            ->where('trips.company_id',$company->id)
            ->whereBetween('trips.departure_at', [$from->copy()->tz('UTC'), $to->copy()->tz('UTC')])
            ->selectRaw("DATE((trips.departure_at AT TIME ZONE 'UTC') AT TIME ZONE ?) AS d,
                         COALESCE(SUM(trips.seats_taken),0) AS seats_taken",[$tz])
            ->groupBy('d')->pluck('seats_taken','d')->toArray();

        $dailyReq = RideRequest::query()
            ->join('trips','trips.id','=','ride_requests.trip_id')
            ->where('trips.company_id',$company->id)
            ->whereBetween('ride_requests.created_at', [$from->copy()->tz('UTC'), $to->copy()->tz('UTC')])
            ->selectRaw("DATE((ride_requests.created_at AT TIME ZONE 'UTC') AT TIME ZONE ?) AS d,
                         COUNT(*) AS req_all,
                         SUM(CASE WHEN ride_requests.status='accepted' THEN 1 ELSE 0 END) AS req_accepted",[$tz])
            ->groupBy('d')->get()->keyBy('d');

        $seriesDaily = [];
        $cursor = $from->copy();
        while ($cursor->lte($to)) {
            $d = $cursor->format('Y-m-d');
            $seriesDaily[] = [
                'd'        => $d,
                'trips'    => (int)($dailyTrips[$d] ?? 0),
                'seats'    => (int)($dailySeatsTaken[$d] ?? 0),
                'revenue'  => (int)($dailyRevenue[$d] ?? 0),
                'requests' => (int)($dailyReq[$d]->req_all ?? 0),
                'accepted' => (int)($dailyReq[$d]->req_accepted ?? 0),
            ];
            $cursor->addDay();
        }

        return response()->json([
            'company'=>[
                'id'=>$company->id,
                'name'=>$company->name,
                'slug'=>$company->slug,
                'status'=>$company->status,
                'logo'=>$company->logo_path ? asset('storage/'.$company->logo_path) : null,
                'owner'=>['id'=>$company->owner->id,'name'=>$company->owner->name,'email'=>$company->owner->email],
                'members_count'=>$company->members_count,
                'vehicles_count'=>$company->vehicles_count,
                'trips_count'=>$company->trips_count,
                'timezone'=>$company->timezone,
                'locale'=>$company->locale,
                'currency'=>$company->currency,
                'phone'=>$company->phone,
            ],
            
            'kpis'=>[
                'revenue_30d'=>(int)$revenue30,
                'trips_30d'  =>(int)$trips30,
                'seats_sold_30d'=>(int)$seatsSold30,
                'accept_rate_30d'=>(float)$acceptRate,
                'from'=>$from->toDateString(),'to'=>$to->toDateString(),
            ],
            'funnel'=>[
                'pending'=>(int)($funnel['pending']??0),
                'accepted'=>(int)($funnel['accepted']??0),
                'rejected'=>(int)($funnel['rejected']??0),
                'cancelled'=>(int)($funnel['cancelled']??0),
            ],
            'series'=>['daily'=>$seriesDaily],
        ]);
    }



      

}
