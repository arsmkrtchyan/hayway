<?php
// app/Http/Controllers/Company/TripStopsController.php
namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\{Company, Trip};
use Illuminate\Http\Request;

class TripStopsController extends Controller
{
    public function replace(Request $r, Company $company, Trip $trip)
    {
        // право на управление компанией + трип принадлежит компании
        $this->authorize('manage', $company);
        abort_unless((int)$trip->company_id === (int)$company->id, 404);

        $data = $r->validate([
            'stops'               => ['present','array','max:10'],
            'stops.*.lat'         => ['nullable','numeric','between:-90,90'],
            'stops.*.lng'         => ['nullable','numeric','between:-180,180'],
            'stops.*.name'        => ['nullable','string','max:120'],
            'stops.*.addr'        => ['nullable','string','max:255'],
            'stops.*.position'    => ['nullable','integer','min:1'],
        ]);

        $stops = collect($data['stops'])
            ->values()
            ->map(fn($s,$i)=>[
                'position' => isset($s['position']) ? (int)$s['position'] : ($i+1),
                'name'     => $s['name'] ?? null,
                'addr'     => $s['addr'] ?? null,
                'lat'      => (float)$s['lat'],
                'lng'      => (float)$s['lng'],
            ])->all();

        $trip->stops()->delete();
        if (!empty($stops)) $trip->stops()->createMany($stops);

        return back()->with('ok','stops_saved');
    }
}
