<?php
//
//namespace App\Http\Controllers\Driver;
//
//use App\Http\Controllers\Controller;
//use App\Models\Trip;
//use Illuminate\Http\Request;
//
//class TripStopsController extends Controller
//{
//    public function replace(Request $r, Trip $trip)
//    {
//        abort_unless($trip->user_id === auth()->id(), 403);
//
//        $data = $r->validate([
//            'stops'               => ['required','array','max:10'],
//            'stops.*.lat'         => ['required','numeric','between:-90,90'],
//            'stops.*.lng'         => ['required','numeric','between:-180,180'],
//            'stops.*.name'        => ['nullable','string','max:120'],
//            'stops.*.addr'        => ['nullable','string','max:255'],
//            'stops.*.position'    => ['nullable','integer','min:1'],
//        ]);
//
//        $stops = collect($data['stops'])
//            ->values()
//            ->map(fn($s,$i)=>[
//                'position' => isset($s['position']) ? (int)$s['position'] : ($i+1),
//                'name'     => $s['name'] ?? null,
//                'addr'     => $s['addr'] ?? null,
//                'lat'      => (float)$s['lat'],
//                'lng'      => (float)$s['lng'],
//            ])->all();
//
//        $trip->stops()->delete();
//        if (!empty($stops)) {
//            $trip->stops()->createMany($stops);
//        }
//
//        return back()->with('ok','stops_saved');
//    }
//}


namespace App\Http\Controllers\Driver;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use Illuminate\Http\Request;

class TripStopsController extends Controller
{
    public function replace(Request $r, Trip $trip)
    {
        abort_unless($trip->user_id === auth()->id(), 403);

        $data = $r->validate([
            'stops'               => ['required','array','max:10'],
            'stops.*.lat'         => ['required','numeric','between:-90,90'],
            'stops.*.lng'         => ['required','numeric','between:-180,180'],
            'stops.*.name'        => ['nullable','string','max:120'],
            'stops.*.addr'        => ['nullable','string','max:255'],
            'stops.*.position'    => ['nullable','integer','min:1'],

            // тарифы стопа (опц.)
            'stops.*.free_km'     => ['nullable','numeric','min:0'],
            'stops.*.amd_per_km'  => ['nullable','integer','min:0'],
            'stops.*.max_km'      => ['nullable','numeric','min:0'],
        ]);

        // В PAX→PAX стоп-тарифы не применяются
        $allowStopTariff = !$trip->type_pax_to_pax;

        $stops = collect($data['stops'])->values()->map(function($s,$i) use ($allowStopTariff){
            $row = [
                'position' => $s['position'] ?? ($i+1),
                'name'     => $s['name'] ?? null,
                'addr'     => $s['addr'] ?? null,
                'lat'      => (float)$s['lat'],
                'lng'      => (float)$s['lng'],
            ];
            if ($allowStopTariff) {
                $row['free_km']    = $s['free_km']    ?? null;
                $row['amd_per_km'] = $s['amd_per_km'] ?? null;
                $row['max_km']     = $s['max_km']     ?? null;
            }
            return $row;
        })->all();

        $trip->stops()->delete();
        if ($stops) $trip->stops()->createMany($stops);
        app(\App\Services\Geo\TripEtaService::class)->recalcAndSave($trip);
        return back()->with('ok','stops_saved');
    }
    public function update(Request $r, Trip $trip)
    {
        abort_unless(in_array(auth()->id(), array_filter([$trip->user_id, $trip->assigned_driver_id])), 403);

        $data = $r->validate([
            'stops' => ['array','max:10'],
            'stops.*.lat' => ['required','numeric','between:-90,90'],
            'stops.*.lng' => ['required','numeric','between:-180,180'],
            'stops.*.addr'=> ['nullable','string','max:500'],
            'stops.*.name'=> ['nullable','string','max:200'],
            'stops.*.position'=> ['required','integer','min:1'],
        ]);

        // Полная перезапись
        $trip->stops()->delete();

        if (!empty($data['stops'])) {
            $trip->stops()->createMany(
                collect($data['stops'])->sortBy('position')->values()->map(fn($s)=>[
                    'lat'=>$s['lat'],
                    'lng'=>$s['lng'],
                    'addr'=>$s['addr'] ?? null,
                    'name'=>$s['name'] ?? null,
                    'position'=>$s['position'],
                ])->all()
            );
        }

        return back()->with('ok','Կանգառները պահպանված են');
    }
}
