<?php

namespace App\Http\Controllers\Driver;

use App\Http\Controllers\Controller;
use App\Models\{Trip, RideRequest};
use Illuminate\Http\Request;

class NotificationsController extends Controller
{
    /**
     * Состояние уведомлений по заявкам:
     * - open_pending: сколько всего pending по активным рейсам
     * - unread_count: сколько из них "новые" (после последнего просмотра)
     * - latest: последние pending (карточки)
     */
    public function pendingState(Request $request)
    {
        $user = $request->user();
        $uid  = $user->id;

        // 1) Активные рейсы где этот юзер – водитель или назначенный водитель
        $tripIds = Trip::query()
            ->where(function ($q) use ($uid) {
                $q->where('user_id', $uid)
                  ->orWhere('assigned_driver_id', $uid);
            })
            // исключаем завершённые
            ->where(function ($q) {
                $q->whereNull('driver_state')
                  ->orWhere('driver_state', '!=', 'done');
            })
            // исключаем архивные
            ->where(function ($q) {
                $q->whereNull('status')
                  ->orWhere('status', '!=', 'archived');
            })
            ->pluck('id');

        if ($tripIds->isEmpty()) {
            return response()->json([
                'open_pending' => 0,
                'unread_count' => 0,
                'latest'       => [],
            ])->header('Cache-Control', 'no-store');
        }

        // 2) Базовый запрос: pending по активным рейсам
        $base = RideRequest::query()
            ->with(['trip:id,from_addr,to_addr,departure_at,driver_state,status'])
            ->whereIn('trip_id', $tripIds)
            ->where('status', 'pending');

        // Всего незакрытых pending
        $openPending = (clone $base)->count();

        // 3) Не прочитанные (созданы после notifications_seen_at)
        $lastSeen = $user->notifications_seen_at;

        $unreadQuery = (clone $base);
        if ($lastSeen) {
            $unreadQuery->where('created_at', '>', $lastSeen);
        }
        $unreadCount = (clone $unreadQuery)->count();

        // 4) Последние pending для дропдауна
        $latest = (clone $base)
            ->latest('id')
            ->limit(5)
            ->get(['id','trip_id','passenger_name','seats','payment','created_at']);

        return response()->json([
            'open_pending' => $openPending,
            'unread_count' => $unreadCount,
            'latest'       => $latest->map(function (RideRequest $r) use ($lastSeen) {
                $isUnread = !$lastSeen || ($r->created_at && $r->created_at->gt($lastSeen));

                return [
                    'id'             => $r->id,
                    'passenger_name' => $r->passenger_name,
                    'seats'          => $r->seats,
                    'payment'        => $r->payment,
                    'created_at'     => $r->created_at?->toIso8601String(),
                    'is_unread'      => $isUnread,
                    'trip' => [
                        'id'           => $r->trip_id,
                        'from_addr'    => $r->trip?->from_addr,
                        'to_addr'      => $r->trip?->to_addr,
                        'departure_at' => optional($r->trip?->departure_at)->toIso8601String(),
                        'driver_state' => $r->trip?->driver_state,
                        'status'       => $r->trip?->status,
                    ],
                ];
            }),
        ])->header('Cache-Control', 'no-store');
    }

    /**
     * Пометить все уведомления как "прочитанные".
     * Вызывается, когда водитель открывает дропдаун.
     */
    // public function markAsSeen(Request $request)
    // {
    //     $user = $request->user();
    //     $user->forceFill([
    //         'notifications_seen_at' => now(),
    //     ])->save();

    //     return response()->json([
    //         'notifications_seen_at' => $user->notifications_seen_at?->toIso8601String(),
    //     ]);
    // }

public function markAsSeen(Request $request)
{
    $user = $request->user();
    $user->markNotificationsSeen();

    return response()->json([
        'notifications_seen_at' => $user->notifications_seen_at?->toIso8601String(),
    ]);
}


}
