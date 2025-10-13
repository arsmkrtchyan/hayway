<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDriverOfferRequest extends FormRequest
{
    public function authorize(): bool { return auth()->check(); }

    public function rules(): array
    {
        return [
            'order_id' => ['required','integer','exists:rider_orders,id'],
            'trip_id'  => ['required','integer','exists:trips,id'],
            'price_amd'=> ['required','integer','min:0'],
            'seats'    => ['required','integer','min:1','max:6'],
            'valid_until' => ['nullable','date','after:now'],
            'meta'     => ['nullable','array'],
        ];
    }
}
