<?php

namespace App\Http\Controllers\Driver;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\RideRequest;
use App\Models\Rating;
use Inertia\Inertia;

class TripShowController extends Controller
{
    public function show(Trip $trip)
    {
        abort_unless(in_array(auth()->id(), array_filter([$trip->user_id, $trip->assigned_driver_id])), 403);

        $trip->load(['stops' => function($q){ $q->orderBy('position'); }]);

//        $requests = RideRequest::query()
//            ->where('trip_id', $trip->id)
//            ->orderBy('id','desc')
//            ->get(['id','trip_id','user_id','passenger_name','phone','seats','payment','status']);

        $requests = \App\Models\RideRequest::query()
            ->where('trip_id', $trip->id)
            ->orderBy('id','desc')
            ->get([
                'id','trip_id','user_id','passenger_name','phone',
                'seats','payment','status',
                'price_amd','meta', // добавлено
            ]);



        // уже оставленные рейтинги (для скрытия формы)
        $ratings = Rating::where('trip_id', $trip->id)->get(['user_id','rating','description']);
        $ratingsByUserId = $ratings->keyBy('user_id');

        return Inertia::render('Driver/TripShow', [
            'trip' => $trip,
            'requests' => $requests,
            'ratingsByUserId' => $ratingsByUserId,
        ]);
    }
}
