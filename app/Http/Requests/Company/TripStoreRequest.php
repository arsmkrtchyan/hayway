<?php
// app/Http/Requests/Company/TripStoreRequest.php
namespace App\Http\Requests\Company;

use Illuminate\Foundation\Http\FormRequest;

class TripStoreRequest extends FormRequest
{
    public function authorize(): bool { return auth()->check(); }

    public function rules(): array
    {
        return [
            'vehicle_id' => ['required','exists:vehicles,id'],
            'assigned_driver_id' => ['required','exists:users,id'],

            'from_lat'=>['required','numeric','between:-90,90'],
            'from_lng'=>['required','numeric','between:-180,180'],
            'from_addr'=>['required','string','max:255'],
            'to_lat'=>['required','numeric','between:-90,90'],
            'to_lng'=>['required','numeric','between:-180,180'],
            'to_addr'=>['required','string','max:255'],

            'departure_at'=>['required','date'],
            'seats_total'=>['required','integer','min:1','max:8'],
            'price_amd'=>['required','integer','min:100'],
            'pay_methods'=>['array'],
            'description'=>['nullable','string','max:5000'],

            // типы (ровно один true)
            'type_ab_fixed'=>['required','boolean'],
            'type_pax_to_pax'=>['required','boolean'],
            'type_pax_to_b'=>['required','boolean'],
            'type_a_to_pax'=>['required','boolean'],

            // Trip-тарифы
            'start_free_km'=>['nullable','numeric','min:0'],
            'start_amd_per_km'=>['nullable','integer','min:0'],
            'start_max_km'=>['nullable','numeric','min:0'],
            'end_free_km'=>['nullable','numeric','min:0'],
            'end_amd_per_km'=>['nullable','integer','min:0'],
            'end_max_km'=>['nullable','numeric','min:0'],

            // amenities
            'amenities'=>['sometimes','array'],
            'amenities.*'=>['integer','exists:amenities,id'],

            // stops (+ тарифы стопов)
            'stops'=>['sometimes','array','max:10'],
            'stops.*.lat'=>['required','numeric','between:-90,90'],
            'stops.*.lng'=>['required','numeric','between:-180,180'],
            'stops.*.name'=>['nullable','string','max:120'],
            'stops.*.addr'=>['nullable','string','max:255'],
            'stops.*.position'=>['nullable','integer','min:1'],
            'stops.*.free_km'=>['nullable','numeric','min:0'],
            'stops.*.amd_per_km'=>['nullable','integer','min:0'],
            'stops.*.max_km'=>['nullable','numeric','min:0'],
        ];
    }

    public function withValidator($v)
    {
        $v->after(function($v){
            $d = $this->all();
            $sum = intval($d['type_ab_fixed']??0)+intval($d['type_pax_to_pax']??0)+intval($d['type_pax_to_b']??0)+intval($d['type_a_to_pax']??0);
            if ($sum !== 1) $v->errors()->add('type','ровно один тип должен быть true');

            $hasStart = ($d['start_free_km']??null)!==null || ($d['start_amd_per_km']??null)!==null || ($d['start_max_km']??null)!==null;
            $hasEnd   = ($d['end_free_km']??null)!==null   || ($d['end_amd_per_km']??null)!==null   || ($d['end_max_km']??null)!==null;

            if (!empty($d['start_max_km']) && isset($d['start_free_km']) && floatval($d['start_max_km']) < floatval($d['start_free_km'])) {
                $v->errors()->add('start_max_km','start_max_km ≥ start_free_km');
            }
            if (!empty($d['end_max_km']) && isset($d['end_free_km']) && floatval($d['end_max_km']) < floatval($d['end_free_km'])) {
                $v->errors()->add('end_max_km','end_max_km ≥ end_free_km');
            }

            if (!empty($d['type_pax_to_pax']) && ($hasStart || $hasEnd)) {
                $v->errors()->add('tariff','для PAX→PAX trip-тарифы не применяются');
            }
            if (!empty($d['type_pax_to_b']) && $hasStart) {
                $v->errors()->add('start_tariff','для PAX→B trip-тариф только у B');
            }
            if (!empty($d['type_a_to_pax']) && $hasEnd) {
                $v->errors()->add('end_tariff','для A→PAX trip-тариф только у A');
            }
        });
    }
}
