<?php

namespace App\Http\Requests\Company\Member;

use App\Enums\CompanyRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMemberRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'role'  => ['required', Rule::in([
                CompanyRole::DRIVER->value,
                CompanyRole::DISPATCHER->value,
                CompanyRole::MANAGER->value,
            ])],
            'notes' => ['nullable','string','max:240'],
        ];
    }
}
