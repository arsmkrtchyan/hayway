<?php
// app/Services/OrderMatcher.php
namespace App\Services;

use App\Models\RiderOrder as Order;
use App\Models\Trip;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class OrderMatcher
{
    private function H(float $lat, float $lng, string $colLat, string $colLng): string {
        $lat=(float)$lat; $lng=(float)$lng;
        return "6371 * 2 * ASIN(SQRT(POWER(SIN(RADIANS($lat - $colLat)/2),2) + COS(RADIANS($lat))*COS(RADIANS($colLat))*POWER(SIN(RADIANS($lng - $colLng)/2),2)))";
    }

    /** Вернёт Builder Trip, подходящих под Order */
    public function buildQuery(Order $o): Builder
    {
        $q = Trip::query()
            ->where('status','published')
            ->whereNull('driver_finished_at')
            ->where('departure_at','>=', Carbon::now()->subMinutes(5)) // не показываем «прошедшие»
            ->with(['vehicle:id,brand,model,seats,user_id','driver:id,name'])
            ->select('trips.*');

        // seats
        if ($o->seats_required) {
            $q->whereRaw('(seats_total - seats_taken) >= ?', [(int)$o->seats_required]);
        }

        // price
        if ($o->max_price_amd) {
            $q->where('price_amd','<=',(int)$o->max_price_amd);
        }

        // types
        if (is_array($o->types) && count($o->types)) {
            $types = collect($o->types)->map(fn($v)=>strtoupper(trim($v)))->filter()->values();
            $q->where(function($w) use($types){
                if ($types->contains('AB'))       $w->orWhere('type_ab_fixed',true);
                if ($types->contains('PAX_PAX'))  $w->orWhere('type_pax_to_pax',true);
                if ($types->contains('PAX_B'))    $w->orWhere('type_pax_to_b',true);
                if ($types->contains('A_PAX'))    $w->orWhere('type_a_to_pax',true);
            });
        }

        // amenities AND
        if (is_array($o->amenities) && count($o->amenities)) {
            foreach ($o->amenities as $amenityId) {
                $q->whereHas('amenities', fn($qq)=>$qq->where('amenities.id', (int)$amenityId));
            }
        }

        // pay_methods JSON contains
        if ($o->pay_method) {
            $q->whereJsonContains('pay_methods', $o->pay_method);
        }

        // date range
        if ($o->date_from && $o->date_to) {
            $q->whereBetween('departure_at', [Carbon::parse($o->date_from)->startOfDay(), Carbon::parse($o->date_to)->endOfDay()]);
        } elseif ($o->date_from) {
            $q->where('departure_at','>=', Carbon::parse($o->date_from)->startOfDay());
        } elseif ($o->date_to) {
            $q->where('departure_at','<=', Carbon::parse($o->date_to)->endOfDay());
        }

        // гео: радиусы вокруг from/to
        $R = max(1, (int)($o->radius_km ?? 5));
        if ($o->from_lat && $o->from_lng) {
            $dStart = $this->H((float)$o->from_lat,(float)$o->from_lng,'from_lat','from_lng');
            $q->addSelect(DB::raw("($dStart) as d_start_km"))
              ->whereRaw("($dStart) <= COALESCE(start_max_km, {$R})");
        }
        if ($o->to_lat && $o->to_lng) {
            $dEnd = $this->H((float)$o->to_lat,(float)$o->to_lng,'to_lat','to_lng');
            $q->addSelect(DB::raw("($dEnd) as d_end_km"))
              ->whereRaw("($dEnd) <= COALESCE(end_max_km, {$R})");
        }

        return $q->orderBy('departure_at');
    }
}
