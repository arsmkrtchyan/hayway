<?php

namespace App\Observers;

use App\Models\Trip;
use App\Models\RiderOrder;
use App\Services\OrderMatchService;
use App\Notifications\NewTripForOrder;
use Illuminate\Support\Facades\Notification;

class TripObserver
{
    public function __construct(private OrderMatchService $svc) {}

    public function saved(Trip $trip): void
    {
        if (!in_array($trip->status, ['published'])) return;

        RiderOrder::query()
            ->where('status','open')
            ->where(function($w) use($trip){ $w->whereNull('when_from')->orWhere('when_from','<=',$trip->departure_at); })
            ->where(function($w) use($trip){ $w->whereNull('when_to')->orWhere('when_to','>=',$trip->departure_at); })
            ->chunkById(200, function($orders) use($trip){
                foreach ($orders as $o) {
                    $q = $this->svc->matchForOrder($o, 5, null);
                    $hit = $q->where('trips.id',$trip->id)->first();
                    if ($hit && $o->client?->email) {
                        Notification::route('mail', $o->client->email)->notify(new NewTripForOrder($o, $hit));
                    }
                }
            });
    }
}
