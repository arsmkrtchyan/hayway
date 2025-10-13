<?php
// app/Http/Controllers/Driver/TariffQuoteController.php
namespace App\Http\Controllers\Driver;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Services\Geo\DistanceService;
use App\Services\Tariff\TariffCalculator;
use Illuminate\Http\Request;

class TariffQuoteController extends Controller
{
    public function quote(Request $r, Trip $trip, DistanceService $geo, TariffCalculator $calc)
    {
        abort_unless(in_array(auth()->id(), array_filter([$trip->user_id, $trip->assigned_driver_id])), 403);

        $data = $r->validate([
            'side' => ['required','in:start,end,stop'],
            'lat'  => ['required','numeric','between:-90,90'],
            'lng'  => ['required','numeric','between:-180,180'],
            'stop_id' => ['nullable','integer','exists:trip_stops,id'],
        ]);

        $lat = (float)$data['lat']; $lng=(float)$data['lng'];

        if ($data['side']==='stop') {
            $stop = $trip->stops()->when($data['stop_id'] ?? null, fn($q)=>$q->where('id',$data['stop_id']))->firstOrFail();
            $dist = $geo->distanceKm($lat,$lng,(float)$stop->lat,(float)$stop->lng);
            $tar  = ['free_km'=>$stop->free_km,'amd_per_km'=>$stop->amd_per_km,'max_km'=>$stop->max_km];
            $res  = $calc->calc($tar,$dist);
            return response()->json(['mode'=>'stop','distance_km'=>$dist,'result'=>$res]);
        }

        if ($data['side']==='start') {
            // разрешено: AB и A→PAX
            if (!($trip->type_ab_fixed || $trip->type_a_to_pax)) return response()->json(['error'=>'START_NOT_APPLICABLE'],422);
            $dist = $geo->distanceKm($lat,$lng,(float)$trip->from_lat,(float)$trip->from_lng);
            $res  = $calc->calc($trip->tariffStart(), $dist);
            return response()->json(['mode'=>'start','distance_km'=>$dist,'result'=>$res]);
        }

        // side=end
        // разрешено: AB и PAX→B
        if (!($trip->type_ab_fixed || $trip->type_pax_to_b)) return response()->json(['error'=>'END_NOT_APPLICABLE'],422);
        $dist = $geo->distanceKm($lat,$lng,(float)$trip->to_lat,(float)$trip->to_lng);
        $res  = $calc->calc($trip->tariffEnd(), $dist);
        return response()->json(['mode'=>'end','distance_km'=>$dist,'result'=>$res]);
    }
}
