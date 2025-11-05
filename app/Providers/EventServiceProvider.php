<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use App\Models\RiderOrder;
use App\Models\Trip;
use App\Observers\RiderOrderObserver;
use App\Observers\TripObserver;

class EventServiceProvider extends ServiceProvider
{
    protected $listen = [ 
            \App\Events\TripPublished::class   => [\App\Listeners\MatchTripToOrders::class],
    \App\Events\OrderCreated::class    => [\App\Listeners\MatchOrderToExistingTrips::class],
    \App\Events\RideRequestCreated::class => [\App\Listeners\StopFurtherMatches::class],

    ];

    public function boot(): void
    {
        RiderOrder::observe($this->app->make(RiderOrderObserver::class));
        Trip::observe($this->app->make(TripObserver::class));
    }
}
