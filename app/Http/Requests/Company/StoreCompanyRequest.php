<?php

namespace App\Http\Requests\Company;

use Illuminate\Foundation\Http\FormRequest;

class StoreCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check(); // или policy('create', Company::class)
    }

    public function rules(): array
    {
        return [
            'name'     => ['required','string','max:255'],
            'email'    => ['nullable','email','max:255','unique:companies,email'],
            'phone'    => ['nullable','string','max:60'],
            'slug'     => ['nullable','string','max:120','unique:companies,slug'],
            'timezone' => ['nullable','string','max:64'],
            'locale'   => ['nullable','string','max:8'],
            'currency' => ['nullable','string','max:8'],
            'logo'     => ['nullable','image','max:4096'],
        ];
    }
}
