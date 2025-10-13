<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AmenityUpsertRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Авторизация через Policy (AmenityPolicy) в контроллере/маршрутах
        return true;
    }

    public function rules(): array
    {
        $amenity = $this->route('amenity'); // null для store

        return [
            'amenity_category_id' => ['nullable', 'integer', 'exists:amenity_categories,id'],
            'name' => ['required', 'string', 'max:120'],
            'slug' => [
                'nullable', 'string', 'max:120',
                Rule::unique('amenities', 'slug')->ignore($amenity?->id),
            ],
            'icon' => ['nullable', 'string', 'max:120'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'meta' => ['nullable', 'array'],
        ];
    }

    public function validated($key = null, $default = null)
    {
        $data = parent::validated();
        // если slug не задан — строим из name
        if (empty($data['slug']) && !empty($data['name'])) {
            $data['slug'] = str($data['name'])->slug('-');
        }
        return $data;
    }
}
