<?php

namespace App\Http\Controllers\Driver;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\Rating;
use Illuminate\Http\Request;

class TripDetailController extends Controller
{
    public function show(Request $request, Trip $trip)
    {
        $me = $request->user();
        abort_unless($trip->assigned_driver_id === $me->id, 403);

// nor block
$me->markNotificationsSeen();
  $trip->loadMissing([
        'company:id,name,rating',
        'vehicle:id,brand,model,color,plate',
        'stops:id,trip_id,position,name,addr,lat,lng',
    ]);

// nor blocki verj

        // $trip->loadMissing([
        //     'company:id,name,rating',
        //     'vehicle:id,brand,model,color,plate',
        //     'stops:id,trip_id,position,name,addr,lat,lng',
        // ]);

        // только принятые
        $accepted = $trip->rideRequests()
            ->where('status','accepted')
            ->with(['user:id,name,number,rating'])
            ->get(['id','trip_id','user_id','passenger_name','phone','seats','payment','status']);

        $ratingsByUserId = Rating::where('trip_id', $trip->id)
            ->get(['user_id','rating','description'])
            ->keyBy('user_id');

        return inertia('Driver/CompanyTripDetail', [
            'trip' => [
                'id' => $trip->id,
                'company' => $trip->company ? [
                    'id'=>$trip->company->id, 'name'=>$trip->company->name, 'rating'=>$trip->company->rating
                ] : null,
                'driver' => [
                    'id' => $me->id, 'name' => $me->name, 'phone' => $me->number, 'rating' => $me->rating,
                ],
                'vehicle' => $trip->vehicle ? [
                    'brand'=>$trip->vehicle->brand,'model'=>$trip->vehicle->model,'color'=>$trip->vehicle->color,'plate'=>$trip->vehicle->plate
                ] : null,
                'from_addr'=>$trip->from_addr, 'to_addr'=>$trip->to_addr,
                'from_lat'=>$trip->from_lat, 'from_lng'=>$trip->from_lng,
                'to_lat'=>$trip->to_lat, 'to_lng'=>$trip->to_lng,
                'departure_at'=>optional($trip->departure_at)->toIso8601String(),
                'seats_total'=>$trip->seats_total,
                'price_amd'=>$trip->price_amd,
                'pay_methods'=>$trip->pay_methods ?? [],
                'driver_state'=>$trip->driver_state,
                'stops'=>$trip->stops->map(fn($s)=>[
                    'position'=>$s->position,'name'=>$s->name,'addr'=>$s->addr,'lat'=>$s->lat,'lng'=>$s->lng
                ]),
            ],
            'requests' => $accepted->map(function ($r) use ($ratingsByUserId) {
                $rating = $ratingsByUserId->get($r->user_id);

                return [
                    'id'=>$r->id,
                    'user_id'=>$r->user_id,
                    'passenger_name'=>$r->passenger_name ?: ($r->user?->name ?? 'Passenger'),
                    'phone'=>$r->phone ?: $r->user?->number,
                    'seats'=>$r->seats,
                    'payment'=>$r->payment,
                    'status'=>$r->status,
                    'rating'=>$rating?->rating,
                    'rating_note'=>$rating?->description,
                    'user_rating'=>$r->user?->rating,
                ];
            }),
        ]);
    }
}
