<?php
// app/Http/Requests/Driver/TripUpdateRequest.php
namespace App\Http\Requests\Driver;

use Illuminate\Foundation\Http\FormRequest;

class TripUpdateRequest extends FormRequest
{
    public function authorize(): bool { return auth()->check(); }

    public function rules(): array
    {
        return [
            'departure_at' => ['nullable','date'],
            'price_amd'    => ['nullable','integer','min:100'],
            'seats_total'  => ['nullable','integer','min:1','max:8'],
            'pay_methods'  => ['nullable','array'],
            'description'  => ['nullable','string','max:5000'],

            // разрешим редактирование типа и тарифов при черновике
            'type_ab_fixed'   => ['nullable','boolean'],
            'type_pax_to_pax' => ['nullable','boolean'],
            'type_pax_to_b'   => ['nullable','boolean'],
            'type_a_to_pax'   => ['nullable','boolean'],

            'start_free_km'     => ['nullable','numeric','min:0'],
            'start_amd_per_km'  => ['nullable','integer','min:0'],
            'start_max_km'      => ['nullable','numeric','min:0'],
            'end_free_km'       => ['nullable','numeric','min:0'],
            'end_amd_per_km'    => ['nullable','integer','min:0'],
            'end_max_km'        => ['nullable','numeric','min:0'],

            'amenities'    => ['sometimes','array'],
            'amenities.*'  => ['integer','exists:amenities,id'],
        ];
    }
}
