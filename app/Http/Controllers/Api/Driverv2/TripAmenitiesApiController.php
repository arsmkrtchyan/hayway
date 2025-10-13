<?php

namespace App\Http\Controllers\Api\Driverv2;

use App\Http\Controllers\Controller;
use App\Models\{Trip, AmenityCategory};
use Illuminate\Http\Request;

class TripAmenitiesApiController extends Controller
{
    public function show(Trip $trip)
    {
        abort_unless($trip->user_id === auth()->id(), 403);

        $categories = AmenityCategory::with(['amenities'=>fn($q)=>$q->where('is_active',true)->orderBy('sort_order')->orderBy('id')])
            ->where('is_active',true)->orderBy('sort_order')->orderBy('id')->get();

        $selectedIds = $trip->amenities()->pluck('amenities.id')->all();

        return response()->json([
            'data'=>[
                'trip_id'=>$trip->id,
                'selected_ids'=>$selectedIds,
                'categories'=>$categories,
            ],
        ]);
    }

    public function update(Request $r, Trip $trip)
    {
        abort_unless($trip->user_id === auth()->id(), 403);

        $data = $r->validate([
            'amenity_ids'=>['array'],
            'amenity_ids.*'=>['integer','exists:amenities,id'],
        ]);

        $trip->amenities()->sync($data['amenity_ids'] ?? []);
        $selected = $trip->amenities()->pluck('amenities.id')->all();

        return response()->json(['data'=>['ok'=>true,'selected_ids'=>$selected]]);
    }
}
