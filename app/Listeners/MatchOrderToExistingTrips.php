<?php
// app/Listeners/MatchOrderToExistingTrips.php
namespace App\Listeners;

use App\Events\OrderCreated;
use App\Models\OrderTripMatch;
use App\Notifications\TripMatchedNotification;
use App\Services\OrderMatcher;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\DB;

class MatchOrderToExistingTrips implements ShouldQueue
{
    public function __construct(private OrderMatcher $matcher){}

    public function handle(OrderCreated $e): void
    {
        $o = $e->order;
        if ($o->status !== 'open') return;
        if ($o->hasPendingRequest()) return;

        $q = $this->matcher->buildQuery($o)->limit(30)->get(); // первые 30 ближайших
        foreach ($q as $trip) {
            $match = OrderTripMatch::firstOrCreate(
                ['order_id'=>$o->id,'trip_id'=>$trip->id],[]
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
