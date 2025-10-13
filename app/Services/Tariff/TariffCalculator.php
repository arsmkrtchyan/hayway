<?php
// app/Services/Tariff/TariffCalculator.php
namespace App\Services\Tariff;

class TariffCalculator
{
    /**
     * @param array{free_km:float|null,amd_per_km:int|null,max_km:float|null} $tariff
     * @param float $distKm
     * @return array{allowed:bool,surcharge_amd:int,free_km:float,reason:?string}
     */
    public function calc(array $tariff, float $distKm): array
    {
        $free = max(0.0, floatval($tariff['free_km'] ?? 0));
        $rate = $tariff['amd_per_km'];
        $max  = $tariff['max_km'] ?? null;

        if ($distKm <= $free) {
            return ['allowed'=>true,'surcharge_amd'=>0,'free_km'=>$free,'reason'=>null];
        }
        if (is_null($rate)) {
            return ['allowed'=>false,'surcharge_amd'=>0,'free_km'=>$free,'reason'=>'NO_RATE'];
        }
        if (!is_null($max) && $distKm > floatval($max)) {
            return ['allowed'=>false,'surcharge_amd'=>0,'free_km'=>$free,'reason'=>'OVER_MAX'];
        }
        $surcharge = (int) round(($distKm - $free) * intval($rate));
        return ['allowed'=>true,'surcharge_amd'=>max(0,$surcharge),'free_km'=>$free,'reason'=>null];
    }
}
