<?php

namespace App\Http\Controllers\Trip;

use App\Http\Controllers\Controller;
use App\Http\Requests\Trip\TripAmenitiesRequest;
use App\Http\Resources\AmenityResource;
use App\Models\AmenityCategory;
use App\Models\Trip;
use Illuminate\Http\Request;

class TripAmenitiesController extends Controller
{


    // GET /api/trips/{trip}/amenities/options
    public function options(Trip $trip)
    {
        $categories = AmenityCategory::query()
            ->where('is_active', true)
            ->with(['amenities' => function ($q) {
                $q->where('is_active', true)->orderBy('sort_order')->orderBy('name');
            }])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $out = $categories->map(fn ($cat) => [
            'id' => $cat->id,
            'name' => $cat->name,
            'slug' => $cat->slug,
            'amenities' => AmenityResource::collection($cat->amenities)->resolve(),
        ]);

        return response()->json($out);
    }

    // GET /api/trips/{trip}/amenities
    public function index(Trip $trip)
    {
        $amenities = $trip->amenities()->with('category')->orderBy('sort_order')->get();
        return AmenityResource::collection($amenities);
    }

    // PUT /api/trips/{trip}/amenities
    public function update(TripAmenitiesRequest $request, Trip $trip)
    {
        $ids = $request->validated('amenity_ids', []);
        $notes = $request->validated('notes');

        if ($notes !== null) {
            $payload = [];
            foreach ($ids as $id) {
                $payload[$id] = ['notes' => $notes];
            }
            $trip->amenities()->sync($payload);
        } else {
            $trip->amenities()->sync($ids);
        }

        return AmenityResource::collection($trip->amenities()->with('category')->get());
    }
}
