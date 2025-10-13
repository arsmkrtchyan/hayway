<?php

namespace App\Services;

use App\Enums\CompanyMemberStatus;
use App\Enums\CompanyRole;
use App\Enums\CompanyStatus;
use App\Models\Company;
use App\Models\CompanyMember;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class CompanyService
{
    public function createCompany(User $owner, array $data): Company
    {
        return DB::transaction(function () use ($owner, $data) {
            $logoPath = null;
            /** @var UploadedFile|null $logo */
            $logo = $data['logo'] ?? null;
            if ($logo instanceof UploadedFile) {
                $logoPath = $logo->store('uploads/company-logos', 'public');
            }

            /** @var Company $company */
            $company = Company::create([
                'name'         => $data['name'],
                'slug'         => $data['slug'] ?? null,
                'email'        => $data['email'] ?? null,
                'phone'        => $data['phone'] ?? null,
                'timezone'     => $data['timezone'] ?? null,
                'locale'       => $data['locale']   ?? 'hy',
                'currency'     => $data['currency'] ?? 'AMD',
                'owner_user_id'=> $owner->id,
                'status'       => CompanyStatus::APPROVED->value, // можно оставить pending
                'logo_path'    => $logoPath,
                'settings'     => [],
            ]);

            // Владелец автоматически становится участником с ролью owner
            $company->members()->attach($owner->id, [
                'role'             => CompanyRole::OWNER->value,
                'status'           => CompanyMemberStatus::ACTIVE->value,
                'added_by_user_id' => $owner->id,
            ]);

            $company->increment('members_count');

            return $company;
        });
    }

    public function updateCompany(Company $company, array $data): Company
    {
        return DB::transaction(function () use ($company, $data) {
            if (!empty($data['logo']) && $data['logo'] instanceof \Illuminate\Http\UploadedFile) {
                // удалять старый логотип по желанию
                $company->logo_path = $data['logo']->store('uploads/company-logos','public');
            }

            $company->fill([
                'name'     => $data['name'],
                'slug'     => $data['slug'] ?? $company->slug,
                'email'    => $data['email'] ?? null,
                'phone'    => $data['phone'] ?? null,
                'timezone' => $data['timezone'] ?? null,
                'locale'   => $data['locale'] ?? $company->locale,
                'currency' => $data['currency'] ?? $company->currency,
            ])->save();

            return $company;
        });
    }

    /** Создать нового пользователя и сразу привязать к компании с ролью */
    public function addNewMember(Company $company, User $actor, array $payload): User
    {
        $this->assertCanAssignRole($company, $actor, $payload['role']);

        return DB::transaction(function () use ($company, $actor, $payload) {
            /** @var User $user */
            $user = User::create([
                'name'         => $payload['name'],
                'email'        => $payload['email'],
                'password'     => bcrypt($payload['password']),
                'role'         => 'client', // системная роль — не критична, управление через pivot
                'admin_status' => 'approved',
            ]);

            $this->attachMember($company, $user, $actor, $payload['role'], $payload['notes'] ?? null);

            // Можно отправить верификацию email
            $user->sendEmailVerificationNotification();

            return $user;
        });
    }

    /** Привязать уже существующего пользователя к компании с ролью */
    public function attachExistingMember(Company $company, User $actor, User $user, string $role, ?string $notes = null): void
    {
        $this->assertCanAssignRole($company, $actor, $role);

        $exists = $company->members()->where('users.id', $user->id)->exists();
        if ($exists) {
            throw ValidationException::withMessages(['user_id' => 'Այս օգտատերը արդեն հանդիսանում է անձնակազմի անդամ։']);
        }

        $this->attachMember($company, $user, $actor, $role, $notes);
    }

    /** Смена роли участника */
    public function changeMemberRole(Company $company, User $actor, User $member, string $newRole, ?string $notes = null): void
    {
        $this->assertCanAssignRole($company, $actor, $newRole);

        // запрет на изменение роли владельца
        if ($company->isOwner($member)) {
            throw ValidationException::withMessages(['role' => 'Սեփականատիրոջ դերը հնարավոր չէ փոխել։']);
        }

        // менеджеру запрещаем назначать/снимать manager
        $actorRole = $company->roleOf($actor);
        if ($actorRole === CompanyRole::MANAGER->value && $newRole === CompanyRole::MANAGER->value) {
            throw ValidationException::withMessages(['role' => 'Manager չի կարող նշանակել manager դեր։']);
        }

        $company->members()->updateExistingPivot($member->id, [
            'role'  => $newRole,
            'notes' => $notes,
        ]);
    }

    /** Удалить участника */
    public function removeMember(Company $company, User $actor, User $member): void
    {
        // Нельзя удалить владельца
        if ($company->isOwner($member)) {
            throw ValidationException::withMessages(['user_id' => 'Հնարավոր չէ հեռացնել ընկերության սեփականատիրոջը։']);
        }

        // Менеджер не может удалять менеджера
        $actorRole  = $company->roleOf($actor);
        $memberRole = $company->roleOf($member);
        if ($actorRole === CompanyRole::MANAGER->value && $memberRole === CompanyRole::MANAGER->value) {
            throw ValidationException::withMessages(['user_id' => 'Manager չի կարող հեռացնել manager-ին։']);
        }

        DB::transaction(function () use ($company, $member) {
            $company->members()->detach($member->id);
            $company->decrement('members_count');
        });
    }

    /** Приостановить / активировать участника */
    public function setMemberStatus(Company $company, User $actor, User $member, CompanyMemberStatus $status): void
    {
        if ($company->isOwner($member)) {
            throw ValidationException::withMessages(['user_id' => 'Սեփականատիրոջ կարգավիճակը հնարավոր չէ փոփոխել։']);
        }

        $actorRole  = $company->roleOf($actor);
        $memberRole = $company->roleOf($member);
        if ($actorRole === CompanyRole::MANAGER->value && $memberRole === CompanyRole::MANAGER->value) {
            throw ValidationException::withMessages(['user_id' => 'Manager չի կարող փոխել manager-ի կարգավիճակը։']);
        }

        $company->members()->updateExistingPivot($member->id, [
            'status' => $status->value,
        ]);
    }

    private function attachMember(Company $company, User $user, User $actor, string $role, ?string $notes): void
    {
        $company->members()->attach($user->id, [
            'role'             => $role,
            'status'           => CompanyMemberStatus::ACTIVE->value,
            'notes'            => $notes,
            'added_by_user_id' => $actor->id,
        ]);
        $company->increment('members_count');
    }

    private function assertCanAssignRole(Company $company, User $actor, string $role): void
    {
        $actorRole = $company->roleOf($actor);
        if ($company->isOwner($actor)) {
            if (!in_array($role, array_map(fn($r)=>$r->value, CompanyRole::manageableByOwner()), true)) {
                throw ValidationException::withMessages(['role' => 'Անթույլատրելի դեր։']);
            }
            return;
        }
        if ($actorRole === CompanyRole::MANAGER->value) {
            if (!in_array($role, array_map(fn($r)=>$r->value, CompanyRole::manageableByManager()), true)) {
                throw ValidationException::withMessages(['role' => 'Manager չի կարող նշանակել այս դերը։']);
            }
            return;
        }
        throw ValidationException::withMessages(['role' => 'Անբավարար իրավունքներ։']);
    }
}
