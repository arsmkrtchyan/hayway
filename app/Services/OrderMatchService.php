<?php

namespace App\Services;

use App\Models\RiderOrder;
use App\Models\Trip;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class OrderMatchService
{
    public function matchForOrder(RiderOrder $o, int $radiusKm = 5, ?int $maxAddonAmd = null): Builder
    {
        $q = Trip::query();
        $this->applyCommon($q, $o);

        $hasFrom = is_numeric($o->from_lat) && is_numeric($o->from_lng);
        $hasTo   = is_numeric($o->to_lat)   && is_numeric($o->to_lng);

        if ($hasFrom && $hasTo) {
            return $this->qBoth($q,(float)$o->from_lat,(float)$o->from_lng,(float)$o->to_lat,(float)$o->to_lng,$radiusKm,$maxAddonAmd);
        }
        if ($hasFrom xor $hasTo) {
            return $this->qSingle($q,
                $hasFrom ? (float)$o->from_lat : null, $hasFrom ? (float)$o->from_lng : null,
                $hasTo   ? (float)$o->to_lat   : null, $hasTo   ? (float)$o->to_lng   : null,
                $radiusKm, $maxAddonAmd
            );
        }
        return $q->orderBy('departure_at');
    }

    private function H(float $lat, float $lng, string $colLat, string $colLng): string
    {
        $lat = (float)$lat; $lng = (float)$lng;
        return "6371 * 2 * ASIN(SQRT(POWER(SIN(RADIANS($lat - $colLat)/2),2) + COS(RADIANS($lat))*COS(RADIANS($colLat))*POWER(SIN(RADIANS($lng - $colLng)/2),2)))";
    }

    private function applyCommon(Builder $q, RiderOrder $o): void
    {
        $q->where('status','published')
            ->whereNull('driver_finished_at')
            ->whereRaw('(seats_total - seats_taken) >= ?', [max(1,(int)$o->seats)])
            ->with(['vehicle:id,brand,model,color,plate,seats,user_id','driver:id,name,rating,avatar_path','company:id,name,rating'])
            ->withCount(['rideRequests as pending_requests_count' => fn($qq)=>$qq->where('status','pending')]);

        if ($o->when_from && $o->when_to) {
            $q->whereBetween('departure_at', [$o->when_from, $o->when_to]);
        } elseif ($o->when_from) {
            $q->where('departure_at','>=',$o->when_from);
        } elseif ($o->when_to) {
            $q->where('departure_at','<=',$o->when_to);
        }

        if ($o->desired_price_amd) $q->where('price_amd','<=',(int)$o->desired_price_amd);
    }

    private function qBoth(Builder $q, float $fromLat, float $fromLng, float $toLat, float $toLng, int $R, ?int $maxAddon): Builder
    {
        $dStart = $this->H($fromLat,$fromLng,'from_lat','from_lng');
        $dEnd   = $this->H($toLat,$toLng,'to_lat','to_lng');

        $startZone = "CASE WHEN start_free_km IS NOT NULL AND ($dStart) <= start_free_km THEN 1
                           WHEN start_max_km  IS NOT NULL AND ($dStart) <= start_max_km  THEN 2 ELSE 9 END";
        $endZone   = "CASE WHEN end_free_km IS NOT NULL AND ($dEnd)   <= end_free_km   THEN 1
                           WHEN end_max_km   IS NOT NULL AND ($dEnd)   <= end_max_km   THEN 2 ELSE 9 END";

        $addonFrom = "CASE WHEN type_ab_fixed OR type_a_to_pax THEN
                        CASE WHEN start_free_km IS NULL THEN NULL
                             WHEN ($dStart) <= start_free_km THEN 0
                             WHEN start_max_km IS NOT NULL AND ($dStart) <= start_max_km
                                  THEN CEIL(GREATEST(($dStart - start_free_km),0)*COALESCE(start_amd_per_km,0))
                             ELSE NULL END
                      ELSE NULL END";

        $addonTo = "CASE WHEN type_ab_fixed OR type_pax_to_b THEN
                        CASE WHEN end_free_km IS NULL THEN NULL
                             WHEN ($dEnd) <= end_free_km THEN 0
                             WHEN end_max_km IS NOT NULL AND ($dEnd) <= end_max_km
                                  THEN CEIL(GREATEST(($dEnd - end_free_km),0)*COALESCE(end_amd_per_km,0))
                             ELSE NULL END
                      ELSE NULL END";

        $startLimit = "COALESCE(start_max_km, {$R})";
        $endLimit   = "COALESCE(end_max_km, {$R})";

        $rank = "
          CASE
            WHEN type_pax_to_pax AND ($dStart) <= {$R} AND ($dEnd) <= {$R} THEN 1
            WHEN type_ab_fixed AND ($dStart) <= {$startLimit} AND ($dEnd) <= {$endLimit} AND ($startZone)=1 AND ($endZone)=1 THEN 2
            WHEN type_ab_fixed AND ($dStart) <= {$startLimit} AND ($dEnd) <= {$endLimit} AND ( ($startZone)=1 OR ($endZone)=1 ) THEN 3
            WHEN type_ab_fixed AND ($dStart) <= {$startLimit} AND ($dEnd) <= {$endLimit} THEN 4
            WHEN type_a_to_pax AND ($startZone)=1 THEN 5
            WHEN type_pax_to_b AND ($endZone)=1   THEN 6
            WHEN type_a_to_pax AND ($dStart) <= {$startLimit} AND ($startZone)=2 THEN 7
            WHEN type_pax_to_b AND ($dEnd)   <= {$endLimit}   AND ($endZone)=2   THEN 8
            ELSE 99 END";

        $q->select([
            'trips.*',
            DB::raw("($dStart) as d_start_km"),
            DB::raw("($dEnd)   as d_end_km"),
            DB::raw("($startZone) as start_zone_code"),
            DB::raw("($endZone)   as end_zone_code"),
            DB::raw("($addonFrom) as addon_from_amd"),
            DB::raw("($addonTo)   as addon_to_amd"),
            DB::raw("($rank)      as rank_type"),
        ])
            ->where(function($w) use($dStart,$dEnd,$R,$startLimit,$endLimit){
                $w->where(function($x) use($R,$dStart,$dEnd){
                    $x->where('type_pax_to_pax',true)->whereRaw("($dStart) <= {$R}")->whereRaw("($dEnd) <= {$R}");
                })
                    ->orWhere(function($x) use($dStart,$dEnd,$startLimit,$endLimit){
                        $x->where('type_ab_fixed',true)->whereRaw("($dStart) <= {$startLimit}")->whereRaw("($dEnd) <= {$endLimit}");
                    })
                    ->orWhere(function($x) use($startLimit, $dStart){ $x->where('type_a_to_pax',true)->whereRaw("($dStart) <= {$startLimit}"); })
                    ->orWhere(function($x) use($endLimit, $dEnd){   $x->where('type_pax_to_b',true)->whereRaw("($dEnd)   <= {$endLimit}"); });
            });

        if ($maxAddon !== null) {
            $q->whereRaw('(COALESCE(('.$addonFrom.'),0)+COALESCE(('.$addonTo.'),0)) <= ?', [$maxAddon]);
        }

        return $q->orderBy('rank_type')
            ->orderByRaw('(COALESCE(('.$dStart.'),0)+COALESCE(('.$dEnd.'),0)) asc')
            ->orderBy('departure_at')->orderBy('price_amd');
    }

    private function qSingle(Builder $q, ?float $fromLat, ?float $fromLng, ?float $toLat, ?float $toLng, int $R, ?int $maxAddon): Builder
    {
        $hasFrom = $fromLat !== null && $fromLng !== null;
        $dStart  = $hasFrom ? $this->H($fromLat,$fromLng,'from_lat','from_lng') : '999999';
        $dEnd    = $hasFrom ? '999999' : $this->H($toLat,$toLng,'to_lat','to_lng');

        $startZone = "CASE WHEN start_free_km IS NOT NULL AND ($dStart) <= start_free_km THEN 1
                           WHEN start_max_km  IS NOT NULL AND ($dStart) <= start_max_km  THEN 2 ELSE 9 END";
        $endZone   = "CASE WHEN end_free_km IS NOT NULL AND ($dEnd)   <= end_free_km   THEN 1
                           WHEN end_max_km   IS NOT NULL AND ($dEnd)   <= end_max_km   THEN 2 ELSE 9 END";

        $addonFrom = "CASE WHEN type_ab_fixed OR type_a_to_pax THEN
                        CASE WHEN start_free_km IS NULL THEN NULL
                             WHEN ($dStart) <= start_free_km THEN 0
                             WHEN start_max_km IS NOT NULL AND ($dStart) <= start_max_km
                                  THEN CEIL(GREATEST(($dStart - start_free_km),0)*COALESCE(start_amd_per_km,0))
                             ELSE NULL END
                      ELSE NULL END";

        $addonTo = "CASE WHEN type_ab_fixed OR type_pax_to_b THEN
                        CASE WHEN end_free_km IS NULL THEN NULL
                             WHEN ($dEnd) <= end_free_km THEN 0
                             WHEN end_max_km IS NOT NULL AND ($dEnd) <= end_max_km
                                  THEN CEIL(GREATEST(($dEnd - end_free_km),0)*COALESCE(end_amd_per_km,0))
                             ELSE NULL END
                      ELSE NULL END";

        $limit = $hasFrom ? "COALESCE(start_max_km, {$R})" : "COALESCE(end_max_km, {$R})";

        $rank = $hasFrom ? "
           CASE
             WHEN type_pax_to_pax AND ($dStart) <= {$R} THEN 1
             WHEN type_ab_fixed  AND ($dStart) <= {$limit} THEN 2
             WHEN type_a_to_pax  AND ($startZone)=1 THEN 3
             WHEN type_a_to_pax  AND ($dStart) <= {$limit} AND ($startZone)=2 THEN 4
             WHEN type_pax_to_b  AND ($dStart) <= {$limit} THEN 5
             ELSE 99 END
        " : "
           CASE
             WHEN type_pax_to_pax AND ($dEnd) <= {$R} THEN 1
             WHEN type_ab_fixed  AND ($dEnd) <= {$limit} THEN 2
             WHEN type_pax_to_b  AND ($endZone)=1 THEN 3
             WHEN type_pax_to_b  AND ($dEnd) <= {$limit} AND ($endZone)=2 THEN 4
             WHEN type_a_to_pax  AND ($dEnd) <= {$limit} THEN 5
             ELSE 99 END
        ";

        $q->select([
            'trips.*',
            DB::raw("($dStart) as d_start_km"),
            DB::raw("($dEnd)   as d_end_km"),
            DB::raw("($startZone) as start_zone_code"),
            DB::raw("($endZone)   as end_zone_code"),
            DB::raw("($addonFrom) as addon_from_amd"),
            DB::raw("($addonTo)   as addon_to_amd"),
            DB::raw("($rank)      as rank_type"),
        ])
            ->whereRaw($hasFrom ? "($dStart) <= {$limit}" : "($dEnd) <= {$limit}");

        if ($maxAddon !== null) $q->whereRaw('(COALESCE(('.$addonFrom.'),0)+COALESCE(('.$addonTo.'),0)) <= ?', [$maxAddon]);

        return $q->orderBy('rank_type')
            ->orderByRaw($hasFrom ? "($dStart) asc" : "($dEnd) asc")
            ->orderBy('departure_at')->orderBy('price_amd');
    }
}
