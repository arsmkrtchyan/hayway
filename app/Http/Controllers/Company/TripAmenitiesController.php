<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\{AmenityCategory, Company, Trip};
use Illuminate\Http\Request;

class TripAmenitiesController extends Controller
{
    public function show(Company $company, Trip $trip)
    {
        $this->authorize('manage', $company);
        abort_unless((int)$trip->company_id === (int)$company->id, 404);

        $categories = AmenityCategory::with(['amenities' => function ($q) {
            $q->where('is_active', true)->orderBy('sort_order')->orderBy('id');
        }])->where('is_active', true)->orderBy('sort_order')->orderBy('id')->get();

        $selectedIds = $trip->amenities()->pluck('amenities.id')->all();

        return response()->json([
            'trip_id'      => $trip->id,
            'selected_ids' => $selectedIds,
            'categories'   => $categories,
        ]);
    }

    public function update(Request $request, Company $company, Trip $trip)
    {
        $this->authorize('manage', $company);
        abort_unless((int)$trip->company_id === (int)$company->id, 404);

        $data = $request->validate([
            'amenity_ids'   => ['array'],
            'amenity_ids.*' => ['integer','exists:amenities,id'],
        ]);

        $trip->amenities()->sync($data['amenity_ids'] ?? []);

        $selectedIds = $trip->amenities()->pluck('amenities.id')->all();

        return response()->json(['ok'=>true,'selected_ids'=>$selectedIds]);
    }
}
