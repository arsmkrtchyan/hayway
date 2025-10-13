<?php
namespace App\Http\Controllers\Driver;
use App\Http\Controllers\Controller;
use App\Models\{Vehicle, Trip, RideRequest};
use Inertia\Inertia;


class DashboardController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $vehicle = Vehicle::where('user_id',$user->id)->first();
//        $trips = Trip::withCount(['requests as pending_requests_count' => function($q){ $q->where('status','pending'); }])
//            ->where('user_id',$user->id)->latest()->get();
        $trips = \App\Models\Trip::query()
            ->where('user_id', auth()->id())
            ->with(['vehicle', 'amenities:id,amenity_category_id,name,slug'])
            ->withCount(['requests as pending_requests_count' => fn($q) => $q->where('status','pending')])
            ->latest()
            ->get();
        $requests = RideRequest::with('trip')->whereHas('trip', fn($q)=>$q->where('user_id',$user->id))
            ->latest()->limit(20)->get();
        return Inertia::render('Driver/Dashboard', compact('vehicle','trips','requests'));
    }
    public function car()
    {
        $vehicle = Vehicle::where('user_id', auth()->id())->first();
        return Inertia::render('Driver/Car', compact('vehicle'));
    }

    // Страница «Make Trip»
    public function makeTrip()
    {
        $vehicle = Vehicle::where('user_id', auth()->id())->first();

        // Если нужно — можно отдать готовый каталог удобств сюда (или фронт возьмёт через /amenities-catalog)
        $amenityCategories = []; // можно оставить пустым — страница сама подтянет через /amenities-catalog
        return Inertia::render('Driver/MakeTrip', compact('vehicle','amenityCategories'));
    }

    // Страница «My Trips»
    public function myTrips()
    {
        $trips = Trip::query()
            ->where('user_id', auth()->id())
            ->with(['vehicle', 'amenities:id,amenity_category_id,name,slug'])
            ->withCount(['requests as pending_requests_count' => fn($q) => $q->where('status','pending')])
            ->latest()
            ->get();

        return Inertia::render('Driver/MyTrips', compact('trips'));
    }
}
