<?php

namespace App\Http\Controllers\Api\CompanyV1;

use App\Http\Controllers\Controller;
use App\Models\{Trip, Company};
use Illuminate\Http\Request;

class TripSoftDeleteController extends Controller
{
    // Список мягко удалённых трипов компании, к которой у пользователя есть доступ
    public function trashed(Request $r)
    {
        $uid = $r->user()->id;
        $companyId = (int) $r->input('company_id'); // можно передавать явно

        abort_unless($companyId > 0, 422, 'company_id required');

        // Проверка доступа к компании (owner или member)
        $can = Company::forUser($uid)->where('id', $companyId)->exists();
        abort_unless($can, 403);

        $per  = max(1, min(50, (int)$r->input('page.size', 20)));
        $list = Trip::onlyTrashed()
            ->where('company_id', $companyId)
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

    // Мягкое удаление трипа компании
    public function destroy(Request $r, Trip $trip)
    {
        $uid = $r->user()->id;
        abort_unless($trip->company_id, 404);
        $can = Company::forUser($uid)->where('id', $trip->company_id)->exists();
        abort_unless($can, 403);

        $trip->delete();
        return response()->json(['data' => ['id' => $trip->id, 'status' => 'soft_deleted']]);
    }

    // Восстановление
    public function restore(Request $r, Trip $trip)
    {
        $uid = $r->user()->id;
        abort_unless($trip->company_id, 404);
        $can = Company::forUser($uid)->where('id', $trip->company_id)->exists();
        abort_unless($can, 403);

        $trip->restore();
        return response()->json(['data' => ['id' => $trip->id, 'status' => 'restored']]);
    }

    // Окончательное удаление
    public function forceDestroy(Request $r, Trip $trip)
    {
        $uid = $r->user()->id;
        abort_unless($trip->company_id, 404);
        $can = Company::forUser($uid)->where('id', $trip->company_id)->exists();
        abort_unless($can, 403);

        $trip->forceDelete();
        return response()->json(['data' => ['id' => $trip->id, 'status' => 'force_deleted']]);
    }
}
