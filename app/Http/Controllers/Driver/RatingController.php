<?php

namespace App\Http\Controllers\Driver;

use App\Http\Controllers\Controller;
use App\Models\Rating;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RatingController extends Controller
{
    public function bulkStore(Request $request)
    {
        $data = $request->validate([
            'trip' => ['required','integer','exists:trips,id'],
            'ratings' => ['required','array','min:1'],
            'ratings.*.user_id' => ['required','integer','exists:users,id'],
            'ratings.*.rating' => ['required','numeric','min:1','max:5'],
            'ratings.*.description' => ['nullable','string','max:1000'],
        ]);

        $trip = Trip::findOrFail($data['trip']);
        $me = $request->user();
        abort_unless($trip->assigned_driver_id === $me->id, 403);
        abort_unless($trip->driver_state === 'done', 422, 'Տվյալ երթուղին պետք է ավարտված լինի');

        // Разрешаем оценивать только пассажиров, которые "accepted" на этом рейсе
        $acceptedUserIds = $trip->rideRequests()
            ->where('status','accepted')->pluck('user_id')->filter()->unique()->all();

        DB::transaction(function () use ($data, $acceptedUserIds) {
            $impacted = collect($data['ratings'])
                ->pluck('user_id')
                ->filter(fn($id) => in_array($id, $acceptedUserIds, true))
                ->unique()
                ->values();

            $snapshots = [];
            foreach ($impacted as $uid) {
                $snapshots[$uid] = [
                    'initial_rating' => (float) (User::whereKey($uid)->value('rating') ?? 5),
                    'initial_list' => Rating::where('user_id', $uid)
                        ->orderBy('created_at')
                        ->orderBy('id')
                        ->get(['id','rating','created_at'])
                        ->map(fn($r) => ['id'=>$r->id,'rating'=>(float)$r->rating,'created_at'=>$r->created_at])
                        ->all(),
                ];
            }

            // upsert оценок (у тебя есть unique(trip_id,user_id))
            foreach ($data['ratings'] as $row) {
                if (!in_array($row['user_id'], $acceptedUserIds, true)) {
                    continue;
                }

                Rating::updateOrCreate(
                    ['trip_id'=>$data['trip'],'user_id'=>$row['user_id']],
                    ['rating'=>$row['rating'],'description'=>$row['description'] ?? null]
                );
            }

            foreach ($impacted as $uid) {
                $snapshot = $snapshots[$uid] ?? null;
                $initialRating = (float)($snapshot['initial_rating'] ?? 5);
                $initialList = $snapshot['initial_list'] ?? [];

                $updatedList = Rating::where('user_id', $uid)
                    ->orderBy('created_at')
                    ->orderBy('id')
                    ->get(['id','rating','created_at'])
                    ->map(fn($r) => ['id'=>$r->id,'rating'=>(float)$r->rating,'created_at'=>$r->created_at])
                    ->all();

                $base = $this->deriveBaseline($initialRating, $initialList);
                $newRating = $this->foldRatings($base, $updatedList);

                User::whereKey($uid)->update(['rating' => $newRating]);
            }
        });

        return back()->with('ok','Գնահատականները պահպանված են');
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
            $sum += ((float)($row['rating'] ?? 0)) / (2 ** $power);
        }

        return (2 ** $count) * ($currentAggregate - $sum);
    }

    private function foldRatings(float $baseline, array $ratings): float
    {
        $current = $baseline;
        foreach ($ratings as $row) {
            $current = ($current + (float)($row['rating'] ?? 0)) / 2;
        }

        $bounded = max(0, min(5, $current));
        return round($bounded, 2);
    }
}
