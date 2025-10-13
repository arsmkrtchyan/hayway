<?php

namespace App\Http\Controllers\Driver;

use App\Http\Controllers\Controller;
use App\Models\AmenityCategory;
use App\Models\Trip;
use Illuminate\Http\Request;

class TripAmenitiesController extends Controller
{
    /** Отдаём каталог + уже выбранные id для модалки */
    public function show(Trip $trip)
    {
        abort_unless($trip->user_id === auth()->id(), 403);

        $categories = AmenityCategory::with(['amenities' => function ($q) {
            $q->where('is_active', true)->orderBy('sort_order')->orderBy('id');
        }])
            ->where('is_active', true)
            ->orderBy('sort_order')->orderBy('id')
            ->get();

        // ФИКС: плучаем amenities.id, иначе массив будет пустым
        $selectedIds = $trip->amenities()->pluck('amenities.id')->all();

        return response()->json([
            'trip_id'      => $trip->id,
            'selected_ids' => $selectedIds,
            'categories'   => $categories,
        ]);
    }

    /** Сохраняем выбор (detach лишнее, attach новое) */
    public function update(Request $request, Trip $trip)
    {
        abort_unless($trip->user_id === auth()->id(), 403);

        $data = $request->validate([
            'amenity_ids'   => ['array'],
            'amenity_ids.*' => ['integer', 'exists:amenities,id'],
        ]);

        $ids = $data['amenity_ids'] ?? [];

        // sync корректно снимет галки и добавит новые
        $trip->amenities()->sync($ids);

        // вернём актуальный список
        $selectedIds = $trip->amenities()->pluck('amenities.id')->all();

        return response()->json(['ok' => true, 'selected_ids' => $selectedIds]);
    }
}
