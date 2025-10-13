<?php

namespace App\Http\Requests\Client;

use Illuminate\Foundation\Http\FormRequest;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool { return auth()->check(); }

    public function rules(): array
    {
        return [
            'seats'          => ['required','integer','min:1','max:8'],
            'payment'        => ['required','in:cash,card'],
            'passenger_name' => ['nullable','string','max:255'],
            'phone'          => ['nullable','string','max:60'],
            'description'    => ['nullable','string','max:2000'],
        ];
    }
}
