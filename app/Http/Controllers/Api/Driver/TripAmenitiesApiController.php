<?php

namespace App\Http\Controllers\Api\Driver;

use App\Http\Controllers\Controller;
use App\Models\AmenityCategory;
use App\Models\Trip;
use Illuminate\Http\Request;

class TripAmenitiesApiController extends Controller
{
    private function ensureRole(Request $r): void
    {
        $ok = in_array($r->user()->role, ['driver','company','admin'], true);
        abort_unless($ok, 403, 'forbidden');
    }

    // Каталог + выбранные id по trip
    public function show(Request $r, Trip $trip)
    {
        $this->ensureRole($r);
        abort_unless($trip->user_id === $r->user()->id, 403);

        $categories = AmenityCategory::with(['amenities' => function ($q) {
            $q->where('is_active', true)->orderBy('sort_order')->orderBy('id');
        }])
            ->where('is_active', true)
            ->orderBy('sort_order')->orderBy('id')
            ->get();

        $selectedIds = $trip->amenities()->pluck('amenities.id')->all();

        return response()->json([
            'trip_id'      => $trip->id,
            'selected_ids' => $selectedIds,
            'categories'   => $categories,
        ]);
    }

    // Обновить выбранные удобства
    public function update(Request $r, Trip $trip)
    {
        $this->ensureRole($r);
        abort_unless($trip->user_id === $r->user()->id, 403);

        $data = $r->validate([
            'amenity_ids'   => ['array'],
            'amenity_ids.*' => ['integer','exists:amenities,id'],
        ]);

        $trip->amenities()->sync($data['amenity_ids'] ?? []);

        return response()->json([
            'ok' => true,
            'selected_ids' => $trip->amenities()->pluck('amenities.id')->all(),
        ]);
    }
}
