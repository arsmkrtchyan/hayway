<?php
// app/Http/Requests/Company/TripUpdateRequest.php
namespace App\Http\Requests\Company;

use Illuminate\Foundation\Http\FormRequest;

class TripUpdateRequest extends FormRequest
{
    public function authorize(): bool { return auth()->check(); }

    public function rules(): array
    {
        return [
            'assigned_driver_id'=>['nullable','exists:users,id'],
            'vehicle_id'=>['nullable','exists:vehicles,id'],

            'from_lat'=>['nullable','numeric','between:-90,90'],
            'from_lng'=>['nullable','numeric','between:-180,180'],
            'from_addr'=>['nullable','string','max:255'],
            'to_lat'=>['nullable','numeric','between:-90,90'],
            'to_lng'=>['nullable','numeric','between:-180,180'],
            'to_addr'=>['nullable','string','max:255'],

            'departure_at'=>['nullable','date'],
            'seats_total'=>['nullable','integer','min:1','max:8'],
            'price_amd'=>['nullable','integer','min:100'],
            'pay_methods'=>['nullable','array'],
            'description'=>['nullable','string','max:5000'],

            'type_ab_fixed'=>['nullable','boolean'],
            'type_pax_to_pax'=>['nullable','boolean'],
            'type_pax_to_b'=>['nullable','boolean'],
            'type_a_to_pax'=>['nullable','boolean'],

            'start_free_km'=>['nullable','numeric','min:0'],
            'start_amd_per_km'=>['nullable','integer','min:0'],
            'start_max_km'=>['nullable','numeric','min:0'],
            'end_free_km'=>['nullable','numeric','min:0'],
            'end_amd_per_km'=>['nullable','integer','min:0'],
            'end_max_km'=>['nullable','numeric','min:0'],

            'amenities'=>['sometimes','array'],
            'amenities.*'=>['integer','exists:amenities,id'],
        ];
    }
}
