<?php

namespace App\Http\Controllers\Driver;

use App\Http\Controllers\Controller;
use App\Models\{Trip, Vehicle};
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use App\Models\{Amenity};

use Inertia\Inertia;
use Illuminate\Support\Carbon;

use App\Http\Requests\Driver\TripStoreRequest;
use App\Http\Requests\Driver\TripUpdateRequest;

class TripController extends Controller
{
    private function createFrom(TripStoreRequest $r, string $status): Trip
    {
        $vehicle = Vehicle::where('id',$r->vehicle_id)->where('user_id',auth()->id())->firstOrFail();

        $trip = Trip::create([
            'user_id'=>auth()->id(),
            'vehicle_id'=>$vehicle->id,
            'from_lat'=>$r->from_lat,'from_lng'=>$r->from_lng,'from_addr'=>$r->from_addr,
            'to_lat'=>$r->to_lat,'to_lng'=>$r->to_lng,'to_addr'=>$r->to_addr,
            'departure_at'=>$r->departure_at,
            'seats_total'=>$r->seats_total,
            'price_amd'=>$r->price_amd,
            'pay_methods'=>$r->pay_methods ?? ['cash'],
            'status'=>$status,
            'description'=>$r->input('description'),

            'type_ab_fixed'=>$r->boolean('type_ab_fixed'),
            'type_pax_to_pax'=>$r->boolean('type_pax_to_pax'),
            'type_pax_to_b'=>$r->boolean('type_pax_to_b'),
            'type_a_to_pax'=>$r->boolean('type_a_to_pax'),

            'start_free_km'=>$r->input('start_free_km'),
            'start_amd_per_km'=>$r->input('start_amd_per_km'),
            'start_max_km'=>$r->input('start_max_km'),
            'end_free_km'=>$r->input('end_free_km'),
            'end_amd_per_km'=>$r->input('end_amd_per_km'),
            'end_max_km'=>$r->input('end_max_km'),
        ]);

        // Привязки
        $amenities = (array) $r->input('amenities', []);
        if ($amenities) $trip->amenities()->sync($amenities);

        $stops = collect($r->input('stops', []))
            ->values()->take(10)
            ->map(fn($s,$i)=>[
                'position'=>$s['position'] ?? ($i+1),
                'name'=>$s['name'] ?? null,
                'addr'=>$s['addr'] ?? null,
                'lat'=>(float)$s['lat'],
                'lng'=>(float)$s['lng'],
                'free_km'    => $s['free_km']    ?? null,
                'amd_per_km' => $s['amd_per_km'] ?? null,
                'max_km'     => $s['max_km']     ?? null,

            ])->all();
        if ($stops) $trip->stops()->createMany($stops);

        // Нормализация тарифов по типу: обнулим неуместные
        $this->normalizeTariffs($trip);
        app(\App\Services\Geo\TripEtaService::class)->recalcAndSave($trip);

        return $trip;
    }

    private function normalizeTariffs(Trip $trip): void
    {
        if ($trip->type_pax_to_pax) {
            $trip->update([
                'start_free_km'=>null,'start_amd_per_km'=>null,'start_max_km'=>null,
                'end_free_km'=>null,'end_amd_per_km'=>null,'end_max_km'=>null,
            ]);
            return;
        }
        if ($trip->type_pax_to_b) {
            $trip->update([
                'start_free_km'=>null,'start_amd_per_km'=>null,'start_max_km'=>null,
            ]);
        }
        if ($trip->type_a_to_pax) {
            $trip->update([
                'end_free_km'=>null,'end_amd_per_km'=>null,'end_max_km'=>null,
            ]);
        }
    }

    public function store(TripStoreRequest $r)
    {
        $this->createFrom($r,'draft');
        return back()->with('ok','draft_saved');
    }

    public function storeAndPublish(TripStoreRequest $r)
    {
        $this->createFrom($r,'published');
        return back()->with('ok','published');
    }

    public function update(TripUpdateRequest $r, Trip $trip)
    {
        abort_unless($trip->user_id === auth()->id(), 403);

        $trip->update($r->only([
            'departure_at','price_amd','seats_total','pay_methods','description',
            'type_ab_fixed','type_pax_to_pax','type_pax_to_b','type_a_to_pax',
            'start_free_km','start_amd_per_km','start_max_km',
            'end_free_km','end_amd_per_km','end_max_km',
        ]));

        if ($r->has('amenities')) $trip->amenities()->sync((array)$r->input('amenities', []));

        $this->normalizeTariffs($trip);

        return back();
    }


    public function publish(Trip $trip)
    {
        abort_unless($trip->user_id === auth()->id(), 403);
        $trip->update(['status'=>'published']);
        return back();
    }

    public function archive(Trip $trip)
    {
        abort_unless($trip->user_id === auth()->id(), 403);
        $trip->update(['status'=>'archived']);
        return back();
    }


    /** (опционально) отдельный эндпоинт только для удобств */
    public function updateAmenities(Request $r, Trip $trip)
    {
        abort_unless($trip->user_id === auth()->id(), 403);
        $r->validate([
            'amenities' => ['required', 'array'],
            'amenities.*' => ['integer', 'exists:amenities,id'],
        ]);
        $trip->amenities()->sync($r->input('amenities'));
        return back()->with('ok', 'amenities_updated');
    }

    public function start(Trip $trip)
    {
        abort_unless($trip->user_id === auth()->id(), 403);

        if ($trip->driver_state === 'done') {
            return back()->with('warn', 'Արդեն ավարտված է');
        }

        $trip->update([
            'driver_state' => 'en_route',
            'driver_started_at' => Carbon::now(),
        ]);

        return back()->with('ok', 'Սկսվեց երթուղին');
    }

    // public function finish(Trip $trip)
    // {
    //     abort_unless($trip->user_id === auth()->id(), 403);

    //     if ($trip->driver_state !== 'en_route') {
    //         return back()->with('warn', 'Նախ պետք է սկսել երթուղին');
    //     }

    //     $trip->update([
    //         'driver_state' => 'done',
    //         'driver_finished_at' => Carbon::now(),
    //     ]);

    //     return back()->with('ok', 'Երթուղին ավարտվեց');
    // }

public function finish(Trip $trip)
{
    abort_unless($trip->user_id === auth()->id(), 403);

    if ($trip->driver_state !== 'en_route') {
        return back()->with('warn', 'Նախ պետք է սկսել երթուղին');
    }

    DB::transaction(function () use ($trip) {
        $now      = Carbon::now();
        $driverId = auth()->id();

        // 1) завершаем рейс
        $trip->update([
            'driver_state'       => 'done',
            'driver_finished_at' => $now,
        ]);

        // 2) все pending-заявки по этому trip → rejected
        $trip->rideRequests()
            ->where('status', 'pending')
            ->update([
                'status'             => 'rejected',
                'decided_by_user_id' => $driverId,
                'decided_at'         => $now,
            ]);
    });

    return back()->with('ok', 'Երթուղին ավարտվեց');
}




}
