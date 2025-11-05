<?php

namespace App\Listeners;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
// app/Listeners/StopFurtherMatches.php
namespace App\Listeners;

use App\Events\RideRequestCreated;
use App\Models\Order;
use App\Models\OrderTripMatch;
use App\Models\RiderOrder;
use Illuminate\Contracts\Queue\ShouldQueue;

class StopFurtherMatches implements ShouldQueue
{
    public function handle(RideRequestCreated $e): void
    {
        $rr = $e->rideRequest;        // содержит order_id и trip_id
        /** @var Order $order */
        $order = RiderOrder::find($rr->order_id);
        if (!$order) return;

        // помечаем матч и стопим будущие уведомления
        OrderTripMatch::where('order_id',$order->id)
            ->where('trip_id',$rr->trip_id)
            ->update(['ride_request_id'=>$rr->id]);

        $order->update(['status'=>'requested','stopped_at'=>now()]);
    }
}
