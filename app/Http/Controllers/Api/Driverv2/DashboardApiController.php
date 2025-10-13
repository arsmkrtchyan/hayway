<?php

namespace App\Http\Controllers\Api\Driverv2;

use App\Http\Controllers\Controller;
use App\Models\{Vehicle, Trip, RideRequest};

class DashboardApiController extends Controller
{
    public function index()
    {
        $uid = auth()->id();

        $vehicle = Vehicle::where('user_id',$uid)->first();

        $trips = Trip::query()
            ->where('user_id',$uid)
            ->with(['vehicle:id,brand,model,plate,color'])
            ->withCount(['requests as pending_requests_count' => fn($q)=>$q->where('status','pending')])
            ->latest()->limit(50)->get([
                'id','vehicle_id','from_addr','to_addr','departure_at',
                'seats_total','seats_taken','price_amd','status','driver_state',
            ]);

        $requests = RideRequest::with(['trip:id,from_addr,to_addr,departure_at'])
            ->whereHas('trip', fn($q)=>$q->where('user_id',$uid))
            ->latest()->limit(20)
            ->get(['id','trip_id','passenger_name','seats','payment','status','created_at']);

        return response()->json([
            'data' => [
                'vehicle' => $vehicle,
                'trips'   => $trips->map(fn($t)=>[
                    'id'=>$t->id,
                    'from_addr'=>$t->from_addr,'to_addr'=>$t->to_addr,
                    'departure_at'=>optional($t->departure_at)->toIso8601String(),
                    'seats_total'=>$t->seats_total,'seats_taken'=>$t->seats_taken,
                    'price_amd'=>$t->price_amd,'status'=>$t->status,'driver_state'=>$t->driver_state,
                    'vehicle'=>$t->vehicle?->only(['brand','model','plate','color']),
                    'pending_requests_count'=>$t->pending_requests_count ?? 0,
                ]),
                'latest_requests' => $requests->map(fn($r)=>[
                    'id'=>$r->id,'seats'=>$r->seats,'payment'=>$r->payment,'status'=>$r->status,
                    'passenger_name'=>$r->passenger_name,'created_at'=>optional($r->created_at)->toIso8601String(),
                    'trip'=>[
                        'id'=>$r->trip_id,'from_addr'=>$r->trip?->from_addr,'to_addr'=>$r->trip?->to_addr,
                        'departure_at'=>optional($r->trip?->departure_at)->toIso8601String(),
                    ],
                ]),
            ],
        ]);
    }
}
