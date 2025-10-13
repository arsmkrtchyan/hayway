<?php

namespace App\Http\Requests\Company;

use Illuminate\Foundation\Http\FormRequest;

class TransferRideRequest extends FormRequest
{
    public function authorize(): bool { return auth()->check(); }

    public function rules(): array
    {
        return [
            'to_trip_id' => ['required','exists:trips,id'],
            'reason'     => ['nullable','string','max:240'],
        ];
    }
}
