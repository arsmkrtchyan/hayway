<?php
// app/Listeners/MatchTripToOrders.php
namespace App\Listeners;

use App\Events\TripPublished;
use App\Models\Order;
use App\Models\OrderTripMatch;
use App\Models\RiderOrder;
use App\Notifications\TripMatchedNotification;
use App\Services\OrderMatcher;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\DB;

class MatchTripToOrders implements ShouldQueue
{
    public function __construct(private OrderMatcher $matcher){}

    public function handle(TripPublished $e): void
    {
        $trip = $e->trip;

        // открытые заявки без активных ride_request’ов
        $orders = RiderOrder::query()
            ->where('status','open')
            ->whereNull('stopped_at')
            ->where('client_user_id','<>',$trip->user_id) // не слать самому себе
            ->get();

        foreach ($orders as $o) {
            // если по этой заявке уже есть pending/accepted request — пропускаем
            if ($o->hasPendingRequest()) continue;

            // быстрый матч ровно к этому trip’у (чтобы не дергать весь список)
            $q = $this->matcher->buildQuery($o)->where('trips.id',$trip->id);
            if (!$q->exists()) continue;

            // idempotent: не дублировать
            $match = OrderTripMatch::firstOrCreate(
                ['order_id'=>$o->id,'trip_id'=>$trip->id],
                []
            );

            if (!$match->notified_at) {
                DB::transaction(function() use($o,$trip,$match){
                    $o->user->notify(new TripMatchedNotification($trip));
                    $match->update(['notified_at'=>now()]);
                });
            }
        }
    }
}
