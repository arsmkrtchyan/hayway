<?php

namespace App\Http\Controllers\Api\Driverv2;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class CompanyJobsApiController extends Controller
{
    public function index(Request $r)
    {
        $me = $r->user();

        $trips = Trip::query()
            ->with(['company:id,name','vehicle:id,brand,model,plate'])
            ->withCount([
                'rideRequests as pending_requests_count'=>fn($q)=>$q->where('status','pending'),
                'rideRequests as accepted_requests_count'=>fn($q)=>$q->where('status','accepted'),
            ])
            ->where('assigned_driver_id',$me->id)
            ->orderByDesc('departure_at')
            ->get([
                'id','company_id','vehicle_id','assigned_driver_id',
                'from_addr','to_addr','from_lat','from_lng','to_lat','to_lng',
                'departure_at','seats_total','seats_taken','price_amd','pay_methods','status',
                'driver_state','driver_started_at','driver_finished_at',
            ]);

        $map = fn($t)=>[
            'id'=>$t->id,
            'company'=>$t->company?->only(['id','name']),
            'vehicle'=>$t->vehicle?->only(['id','brand','model','plate']),
            'from_addr'=>$t->from_addr,'to_addr'=>$t->to_addr,
            'from_lat'=>$t->from_lat,'from_lng'=>$t->from_lng,'to_lat'=>$t->to_lat,'to_lng'=>$t->to_lng,
            'departure_at'=>optional($t->departure_at)->toIso8601String(),
            'seats_total'=>$t->seats_total,'seats_taken'=>$t->seats_taken,
            'price_amd'=>$t->price_amd,'pay_methods'=>$t->pay_methods,'status'=>$t->status,
            'driver_state'=>$t->driver_state,
            'driver_started_at'=>optional($t->driver_started_at)->toIso8601String(),
            'driver_finished_at'=>optional($t->driver_finished_at)->toIso8601String(),
            'pending_requests_count'=>$t->pending_requests_count ?? 0,
            'accepted_requests_count'=>$t->accepted_requests_count ?? 0,
        ];

        return response()->json([
            'data'=>[
                'active'=>$trips->where('driver_state','en_route')->values()->map($map)->values(),
                'upcoming'=>$trips->filter(fn($t)=>in_array($t->status,['published','draft']) && $t->driver_state==='assigned')->values()->map($map)->values(),
                'done'=>$trips->where('driver_state','done')->take(20)->values()->map($map)->values(),
            ],
        ]);
    }

    public function start(Request $r, Trip $trip)
    {
        $me = $r->user();
        if ($trip->assigned_driver_id !== $me->id) abort(403);
        if ($trip->driver_state === 'done') return response()->json(['error'=>'already_finished'], 409);
        $trip->update(['driver_state'=>'en_route','driver_started_at'=>Carbon::now()]);
        return response()->json(['data'=>['id'=>$trip->id,'driver_state'=>'en_route']]);
    }

    public function finish(Request $r, Trip $trip)
    {
        $me = $r->user();
        if ($trip->assigned_driver_id !== $me->id) abort(403);
        if ($trip->driver_state !== 'en_route') return response()->json(['error'=>'not_started'], 409);
        $trip->update(['driver_state'=>'done','driver_finished_at'=>Carbon::now()]);
        return response()->json(['data'=>['id'=>$trip->id,'driver_state'=>'done']]);
    }
}
