<?php

namespace App\Http\Controllers\Api\Driverv2;

use App\Http\Controllers\Controller;
use App\Models\{Trip, Rating, User};
use Illuminate\Http\Request;

class TripRatingApiController extends Controller
{
    public function rateUser(Request $r, Trip $trip)
    {
        abort_unless(in_array(auth()->id(), array_filter([$trip->user_id, $trip->assigned_driver_id])), 403);
        abort_unless($trip->driver_state === 'done', 403);

        $data = $r->validate([
            'user_id'=>['required','exists:users,id'],
            'rating'=>['required','numeric','min:1','max:5'],
            'description'=>['nullable','string','max:2000'],
        ]);

        Rating::updateOrCreate(
            ['trip_id'=>$trip->id,'user_id'=>$data['user_id']],
            ['rating'=>$data['rating'],'description'=>$data['description'] ?? null]
        );

        $u = User::findOrFail($data['user_id']);
        $new = round(((float)($u->rating ?? 5) + (float)$data['rating'])/2, 2);
        $u->update(['rating'=>$new]);

        return response()->json(['data'=>['status'=>'rated']]);
    }
}
