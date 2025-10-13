<?php

namespace App\Http\Requests\Company\Member;

use App\Enums\CompanyRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreNewMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // проверка прав в контроллере через policy(manageMembers)
    }

    public function rules(): array
    {
        return [
            'name'     => ['required','string','max:255'],
            'email'    => ['required','email','max:255','unique:users,email'],
            'password' => ['required','string','min:8','max:120'],
            'role'     => ['required', Rule::in([
                CompanyRole::DRIVER->value,
                CompanyRole::DISPATCHER->value,
                CompanyRole::MANAGER->value, // запретим менеджеру выдавать эту роль в контроллере
            ])],
            'notes'    => ['nullable','string','max:240'],
        ];
    }
}
