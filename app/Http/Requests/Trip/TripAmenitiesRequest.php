<?php

namespace App\Http\Requests\Trip;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TripAmenitiesRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Разрешение проверяется через policy (can:updateAmenities)
        return true;
    }

    public function rules(): array
    {
        return [
            'amenity_ids' => ['required', 'array', 'min:0'],
            'amenity_ids.*' => [
                'integer',
                Rule::exists('amenities', 'id')->where(fn ($q) => $q->where('is_active', true)),
            ],
            'notes' => ['nullable', 'string', 'max:240'],
        ];
    }
}
