<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRiderOrderRequest extends FormRequest
{
    public function authorize(): bool { return auth()->check(); }

    public function rules(): array
    {
        return [
            'from_lat' => ['nullable','numeric','between:-90,90'],
            'from_lng' => ['nullable','numeric','between:-180,180'],
            'from_addr'=> ['nullable','string','max:255'],
            'to_lat'   => ['nullable','numeric','between:-90,90'],
            'to_lng'   => ['nullable','numeric','between:-180,180'],
            'to_addr'  => ['nullable','string','max:255'],
            'when_from'=> ['nullable','date'],
            'when_to'  => ['nullable','date','after_or_equal:when_from'],
            'seats'    => ['required','integer','min:1','max:6'],
            'payment'  => ['nullable','in:cash,card'],
            'desired_price_amd' => ['nullable','integer','min:0'],
            'meta'     => ['nullable','array'],
        ];
    }
}
