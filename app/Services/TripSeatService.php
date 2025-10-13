<?php

namespace App\Services;

use App\Models\Trip;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TripSeatService
{
    /** Проверка наличия мест с FOR UPDATE */
    public function ensureCapacity(Trip $trip, int $seats): void
    {
        DB::table('trips')->where('id', $trip->id)->lockForUpdate()->first();
        $trip->refresh();
        $free = max(0, (int)$trip->seats_total - (int)$trip->seats_taken);
        if ($seats > $free) {
            throw ValidationException::withMessages([
                'seats' => 'Չկա բավարար ազատ տեղ։'
            ]);
        }
    }

    /** Резервирование мест (инкремент seats_taken) под accepted-заявку */
    public function reserve(Trip $trip, int $seats): void
    {
        DB::table('trips')->where('id', $trip->id)->lockForUpdate()->first();
        $trip->refresh();
        $free = max(0, (int)$trip->seats_total - (int)$trip->seats_taken);
        if ($seats > $free) {
            throw ValidationException::withMessages(['seats' => 'Չկա բավարար ազատ տեղ։']);
        }
        $trip->increment('seats_taken', $seats);
    }

    /** Освобождение мест (декремент seats_taken) — при отмене/переносе accepted */
    public function release(Trip $trip, int $seats): void
    {
        DB::table('trips')->where('id', $trip->id)->lockForUpdate()->first();
        $trip->refresh();
        $new = max(0, (int)$trip->seats_taken - $seats);
        $trip->update(['seats_taken' => $new]);
    }
}
