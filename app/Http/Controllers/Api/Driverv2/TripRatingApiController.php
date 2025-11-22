<?php

namespace App\Http\Controllers\Api\Driverv2;

use App\Http\Controllers\Controller;
use App\Models\{Rating, Trip, User};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TripRatingApiController extends Controller
{
    public function rateUser(Request $r, Trip $trip)
    {
        $me = $r->user();

        $allowedDriverIds = array_filter([$trip->assigned_driver_id, $trip->user_id], fn ($v) => !is_null($v));
        abort_unless(in_array(optional($me)->id, $allowedDriverIds, true), 403);
        abort_unless($trip->driver_state === 'done', 422, 'Տվյալ երթուղին պետք է ավարտված լինի');

        $data = $r->validate([
            'user_id' => ['required', 'exists:users,id'],
            'rating' => ['required', 'numeric', 'min:1', 'max:5'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $acceptedUserIds = $trip->rideRequests()
            ->where('status', 'accepted')
            ->pluck('user_id')
            ->filter()
            ->unique()
            ->all();

        abort_unless(in_array($data['user_id'], $acceptedUserIds, true), 422, 'Թույլատրվում է գնահատել միայն մասնակցած ուղևորներին');

        DB::transaction(function () use ($data, $trip) {
            $userId = $data['user_id'];

            $snapshot = [
                'initial_rating' => (float) (User::whereKey($userId)->value('rating') ?? 5),
                'initial_list' => Rating::where('user_id', $userId)
                    ->orderBy('created_at')
                    ->orderBy('id')
                    ->get(['id', 'rating', 'created_at'])
                    ->map(fn ($r) => [
                        'id' => $r->id,
                        'rating' => (float) $r->rating,
                        'created_at' => $r->created_at,
                    ])
                    ->all(),
            ];

            Rating::updateOrCreate(
                ['trip_id' => $trip->id, 'user_id' => $userId],
                ['rating' => $data['rating'], 'description' => $data['description'] ?? null]
            );

            $updatedList = Rating::where('user_id', $userId)
                ->orderBy('created_at')
                ->orderBy('id')
                ->get(['id', 'rating', 'created_at'])
                ->map(fn ($r) => [
                    'id' => $r->id,
                    'rating' => (float) $r->rating,
                    'created_at' => $r->created_at,
                ])
                ->all();

            $base = $this->deriveBaseline($snapshot['initial_rating'], $snapshot['initial_list']);
            $newRating = $this->foldRatings($base, $updatedList);

            User::whereKey($userId)->update(['rating' => $newRating]);
        });

        return response()->json(['data' => ['status' => 'rated']]);
    }

    private function deriveBaseline(float $currentAggregate, array $ratings): float
    {
        $count = count($ratings);
        if ($count === 0) {
            return $currentAggregate;
        }

        $sum = 0.0;
        foreach ($ratings as $index => $row) {
            $power = $count - $index; // 1-based power
            $sum += ((float) ($row['rating'] ?? 0)) / (2 ** $power);
        }

        return (2 ** $count) * ($currentAggregate - $sum);
    }

    private function foldRatings(float $baseline, array $ratings): float
    {
        $current = $baseline;
        foreach ($ratings as $row) {
            $current = ($current + (float) ($row['rating'] ?? 0)) / 2;
        }

        $bounded = max(0, min(5, $current));
        return round($bounded, 2);
    }
}
