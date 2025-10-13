<?php

namespace App\Http\Controllers\Api\Driverv2;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use Illuminate\Http\Request;

class TripStopsApiController extends Controller
{
    public function replace(Request $r, Trip $trip)
    {
        abort_unless($trip->user_id === auth()->id(), 403);

        $data = $r->validate([
            'stops'=>['required','array','max:10'],
            'stops.*.lat'=>['required','numeric','between:-90,90'],
            'stops.*.lng'=>['required','numeric','between:-180,180'],
            'stops.*.name'=>['nullable','string','max:120'],
            'stops.*.addr'=>['nullable','string','max:255'],
            'stops.*.position'=>['nullable','integer','min:1'],
        ]);

        $stops = collect($data['stops'])->values()->map(fn($s,$i)=>[
            'position'=>isset($s['position'])?(int)$s['position']:($i+1),
            'name'=>$s['name']??null,'addr'=>$s['addr']??null,
            'lat'=>(float)$s['lat'],'lng'=>(float)$s['lng'],
        ])->all();

        $trip->stops()->delete();
        if (!empty($stops)) $trip->stops()->createMany($stops);

        return response()->json(['data'=>['status'=>'stops_saved']]);
    }
}
