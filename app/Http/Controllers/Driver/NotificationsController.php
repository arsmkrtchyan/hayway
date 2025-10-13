<?php

namespace App\Http\Controllers\Driver;

use App\Http\Controllers\Controller;
use App\Models\{Trip, RideRequest};
use Illuminate\Http\Request;

class NotificationsController extends Controller
{
    public function pendingState(Request $request)
    {
        $uid = auth()->id();

        // Трипы, где водитель — владелец или назначенный (assigned_driver_id)
        $tripIds = Trip::query()
            ->where(function ($q) use ($uid) {
                $q->where('user_id', $uid)
                    ->orWhere('assigned_driver_id', $uid);
            })
            ->pluck('id');

        if ($tripIds->isEmpty()) {
            return response()->json([
                'total_pending' => 0,
                'latest'        => [],
            ])->header('Cache-Control', 'no-store');
        }

        $total = RideRequest::whereIn('trip_id', $tripIds)
            ->where('status', 'pending')
            ->count();

        $latest = RideRequest::with(['trip:id,from_addr,to_addr,departure_at'])
            ->whereIn('trip_id', $tripIds)
            ->where('status', 'pending')
            ->latest('id')
            ->limit(5)
            ->get(['id','trip_id','passenger_name','seats','payment','created_at']);

        return response()->json([
            'total_pending' => $total,
            'latest' => $latest->map(fn($r)=>[
                'id' => $r->id,
                'passenger_name' => $r->passenger_name,
                'seats' => $r->seats,
                'payment' => $r->payment,
                'created_at' => $r->created_at?->toIso8601String(),
                'trip' => [
                    'id' => $r->trip_id,
                    'from_addr' => $r->trip?->from_addr,
                    'to_addr' => $r->trip?->to_addr,
                    'departure_at' => optional($r->trip?->departure_at)->toIso8601String(),
                ],
            ]),
        ])->header('Cache-Control', 'no-store');
    }
}
