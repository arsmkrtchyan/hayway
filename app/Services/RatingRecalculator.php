<?php

namespace App\Services;

use App\Models\Trip;
use Illuminate\Support\Facades\DB;

class RatingRecalculator
{
    /** Складываем последовательно: start=5; foreach r: start=(start+r)/2; округляем до 2 знаков */
    private static function foldAverage(array $ratings): float
    {
        $cur = 5.00;
        foreach ($ratings as $r) {
            $cur = round( ($cur + (float)$r) / 2.0, 2);
        }
        return $cur;
    }

    /** Все отзывы для SOLO-поездок конкретного водителя (без company/assigned) */
    private static function ratingsForSoloDriver(int $driverUserId): array
    {
        return DB::table('ratings')
            ->join('trips','ratings.trip_id','=','trips.id')
            ->whereNull('trips.company_id')
            ->whereNull('trips.assigned_driver_id')
            ->where('trips.user_id',$driverUserId)
            ->orderBy('ratings.created_at')
            ->orderBy('ratings.id')
            ->pluck('ratings.rating')->all();
    }

    /** Все отзывы по поездкам (company+assigned) конкретного водителя внутри одной компании */
    private static function ratingsForCompanyMember(int $companyId, int $driverUserId): array
    {
        return DB::table('ratings')
            ->join('trips','ratings.trip_id','=','trips.id')
            ->where('trips.company_id',$companyId)
            ->where('trips.assigned_driver_id',$driverUserId)
            ->orderBy('ratings.created_at')
            ->orderBy('ratings.id')
            ->pluck('ratings.rating')->all();
    }

    /** Все отзывы по поездкам компании (все её выходы) */
    private static function ratingsForCompany(int $companyId): array
    {
        return DB::table('ratings')
            ->join('trips','ratings.trip_id','=','trips.id')
            ->where('trips.company_id',$companyId)
            ->orderBy('ratings.created_at')
            ->orderBy('ratings.id')
            ->pluck('ratings.rating')->all();
    }

    /** Глобально для водителя: SOLO + все company-поездки, где он назначен */
    private static function ratingsForDriverGlobal(int $driverUserId): array
    {
        return DB::table('ratings')
            ->join('trips','ratings.trip_id','=','trips.id')
            ->where(function($q) use ($driverUserId){
                $q->where(function($qq) use ($driverUserId){
                    $qq->whereNull('trips.company_id')
                        ->whereNull('trips.assigned_driver_id')
                        ->where('trips.user_id',$driverUserId);
                })->orWhere('trips.assigned_driver_id',$driverUserId);
            })
            ->orderBy('ratings.created_at')
            ->orderBy('ratings.id')
            ->pluck('ratings.rating')->all();
    }

    /** Вызвать после создания/обновления отзыва по конкретному trip */
    public static function recalcForTrip(Trip $trip): void
    {
        $trip->refresh();

        $isSolo = is_null($trip->company_id) && is_null($trip->assigned_driver_id);

        if ($isSolo) {
            $driverUserId = (int)$trip->user_id;

            // SOLO-витрина: users + drivers
            $soloFold = self::foldAverage(self::ratingsForSoloDriver($driverUserId));
            DB::table('users')->where('id',$driverUserId)->update(['rating'=>$soloFold]);
            DB::table('drivers')->where('user_id',$driverUserId)->update(['rating'=>$soloFold]);

            // Глобально (на случай, если у водителя есть и company-поездки)
            $globalFold = self::foldAverage(self::ratingsForDriverGlobal($driverUserId));
            DB::table('users')->where('id',$driverUserId)->update(['rating'=>$globalFold]);

            return;
        }

        // COMPANY-кейс
        $companyId  = (int)$trip->company_id;
        $driverId   = (int)$trip->assigned_driver_id;

        // company_member (конкретный водитель в этой компании)
        $memberFold = self::foldAverage(self::ratingsForCompanyMember($companyId, $driverId));
        DB::table('company_members')
            ->where(['company_id'=>$companyId,'user_id'=>$driverId])
            ->update(['rating'=>$memberFold]);

        // company (в целом)
        $companyFold = self::foldAverage(self::ratingsForCompany($companyId));
        DB::table('companies')->where('id',$companyId)->update(['rating'=>$companyFold]);

        // user (глобально по всем типам его поездок)
        $globalFold = self::foldAverage(self::ratingsForDriverGlobal($driverId));
        DB::table('users')->where('id',$driverId)->update(['rating'=>$globalFold]);
    }
}
