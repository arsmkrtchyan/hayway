<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OrdersNearbyForTripRequest extends FormRequest
{
    public function authorize(): bool { return auth()->check(); }

    public function rules(): array
    {
        return [
            'mode' => ['nullable','in:radius,corridor'],
            'radius_km' => ['nullable','numeric','min:1'],           // для mode=radius
            'corridor_km' => ['nullable','numeric','min:1','max:50'],// для mode=corridor
            'time_from' => ['nullable','date'],
            'time_to'   => ['nullable','date','after_or_equal:time_from'],
            'min_seats' => ['nullable','integer','min:1','max:6'],
            'max_price_amd' => ['nullable','integer','min:0'],
        ];
    }
}
