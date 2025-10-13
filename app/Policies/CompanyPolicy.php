<?php
//
//namespace App\Policies;
//
//use App\Models\Company;
//use App\Models\User;
//
//class CompanyPolicy
//{
//    // видеть компанию
//    public function view(User $user, Company $company): bool
//    {
//        return $company->owner_user_id === $user->id
//            || $user->companies()->where('company_id', $company->id)->exists();
//    }
//
//    // управлять (owner/dispatcher)
//    public function manage(User $user, Company $company): bool
//    {
//        if ($company->owner_user_id === $user->id) return true;
//        $role = $user->roleInCompany($company);
//        return in_array($role, ['owner','dispatcher'], true);
//    }
//}


namespace App\Policies;

use App\Enums\CompanyRole;
use App\Models\Company;
use App\Models\User;

class CompanyPolicy
{
    /** Любой участник или владелец может видеть компанию */
    public function view(User $user, Company $company): bool
    {
        if ($company->isOwner($user)) return true;
        return $company->members()->where('users.id', $user->id)->exists();
    }

    /** Управление базовыми настройками компании: owner|manager */
    public function manage(User $user, Company $company): bool
    {
        if ($company->isOwner($user)) return true;
        $role = $company->roleOf($user);
        return in_array($role, [CompanyRole::MANAGER->value], true);
    }

    /** Управление участниками: owner|manager (но менеджер с ограничениями по ролям) */
    public function manageMembers(User $user, Company $company): bool
    {
        return $this->manage($user, $company);
    }

    /** Удаление самой компании — только владелец */
    public function delete(User $user, Company $company): bool
    {
        return $company->isOwner($user);
    }

    /** Создание компании — любой аутентифицированный пользователь (можно ужесточить) */
    public function create(User $user): bool
    {
        return (bool)$user->id;
    }

    /** Обновлять настройки: owner|manager */
    public function update(User $user, Company $company): bool
    {
        return $this->manage($user, $company);
    }
}
