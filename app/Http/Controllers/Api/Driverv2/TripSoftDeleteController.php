<?php

namespace App\Http\Controllers\Api\DriverV2;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use Illuminate\Http\Request;

class TripSoftDeleteController extends Controller
{
    // Список мягко удалённых трипов текущего водителя
    public function trashed(Request $r)
    {
        $uid = $r->user()->id;

        $per  = max(1, min(50, (int)$r->input('page.size', 20)));
        $list = Trip::onlyTrashed()
            ->where('user_id', $uid)
            ->latest('deleted_at')
            ->paginate($per)
            ->withQueryString();

        $data = $list->getCollection()->map(fn(Trip $t) => [
            'id'            => $t->id,
            'from_addr'     => $t->from_addr,
            'to_addr'       => $t->to_addr,
            'departure_at'  => optional($t->departure_at)->toIso8601String(),
            'deleted_at'    => optional($t->deleted_at)->toIso8601String(),
            'status'        => $t->status,
            'driver_state'  => $t->driver_state,
        ])->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'page'      => $list->currentPage(),
                'per_page'  => $list->perPage(),
                'total'     => $list->total(),
                'last_page' => $list->lastPage(),
            ],
        ]);
    }

    // Мягкое удаление своего трипа
    public function destroy(Request $r, Trip $trip)
    {
        abort_unless($trip->user_id === $r->user()->id, 403);
        $trip->delete(); // Soft delete
        return response()->json(['data' => ['id' => $trip->id, 'status' => 'soft_deleted']]);
    }

    // Восстановление (нужен withTrashed в маршруте)
    public function restore(Request $r, Trip $trip)
    {
        abort_unless($trip->user_id === $r->user()->id, 403);
        $trip->restore();
        return response()->json(['data' => ['id' => $trip->id, 'status' => 'restored']]);
    }

    // Окончательное удаление (нужен withTrashed в маршруте)
    public function forceDestroy(Request $r, Trip $trip)
    {
        abort_unless($trip->user_id === $r->user()->id, 403);
        $trip->forceDelete();
        return response()->json(['data' => ['id' => $trip->id, 'status' => 'force_deleted']]);
    }
}
