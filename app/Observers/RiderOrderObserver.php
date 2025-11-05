<?php

namespace App\Observers;

use App\Models\RiderOrder;
use App\Services\OrderMatchService;
use App\Notifications\NewTripForOrder;
use Illuminate\Support\Facades\Notification;

class RiderOrderObserver
{
    public function __construct(private OrderMatchService $svc) {}

    public function created(RiderOrder $order): void { $this->notify($order); }
    public function updated(RiderOrder $order): void
    {
        if ($order->wasChanged(['from_lat','from_lng','to_lat','to_lng','when_from','when_to','status']) && $order->status==='open') {
            $this->notify($order);
        }
    }

    private function notify(RiderOrder $order): void
    {

        $q = $this->svc->matchForOrder($order, 5, null);
        $trips = $q->limit(5)->get();
        foreach ($trips as $trip) {
            if ($trip && $order->client){
                \Illuminate\Support\Facades\Notification::send($order->client, new NewTripForOrder($order,$trip));
            }
            // дедуп через cache (ключ внутри Notification middleware можно добавить при желании)
            Notification::route('mail', $order->client?->email)->notify(new NewTripForOrder($order, $trip));
        }
    }
}
