<?php

namespace App\Http\Requests\Company;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // проверим в контроллере через $this->authorize('update', $company)
    }

    public function rules(): array
    {
        $companyId = $this->route('company')?->id ?? null;

        return [
            'name'     => ['required','string','max:255'],
            'email'    => ['nullable','email','max:255', Rule::unique('companies','email')->ignore($companyId)],
            'phone'    => ['nullable','string','max:60'],
            'slug'     => ['nullable','string','max:120', Rule::unique('companies','slug')->ignore($companyId)],
            'timezone' => ['nullable','string','max:64'],
            'locale'   => ['nullable','string','max:8'],
            'currency' => ['nullable','string','max:8'],
            'logo'     => ['nullable','image','max:4096'],
        ];
    }
}
