<?php

namespace App\Http\Controllers\Api\CompaniesV2;

use App\Enums\CompanyMemberStatus;
use App\Enums\CompanyRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Company\Member\AttachExistingMemberRequest;
use App\Http\Requests\Company\Member\StoreNewMemberRequest;
use App\Http\Requests\Company\Member\UpdateMemberRoleRequest;
use App\Http\Resources\MemberResource;
use App\Models\Company;
use App\Models\User;
use App\Services\CompanyService;
use Illuminate\Http\Request;



class MembersController extends Controller
{
    protected CompanyService $service;

    public function __construct(CompanyService $service)
    {

        $this->service = $service;
    }


    /** GET /api/companies/v2/{company}/members */
    public function index(Request $r, Company $company)
    {
        $this->authorize('manageMembers', $company);

        $q       = trim((string)$r->query('q', ''));
        $role    = $r->query('role', 'all');       // all|owner|manager|dispatcher|driver
        $status  = $r->query('status', 'all');     // all|active|suspended
        $perPage = (int)($r->query('per_page', 30));

        $rel = $company->members()->select('users.id','users.name','users.email')
            ->withPivot(['role','status','rating','notes','added_by_user_id','created_at'])
            ->orderBy('company_members.role')
            ->orderBy('users.name');

        if ($q !== '') {
            $rel->where(function($qq) use ($q) {
                $qq->where('users.name','ilike',"%{$q}%")
                    ->orWhere('users.email','ilike',"%{$q}%");
            });
        }
        if (in_array($role, ['owner','manager','dispatcher','driver'], true)) {
            $rel->wherePivot('role', $role);
        }
        if (in_array($status, ['active','suspended'], true)) {
            $rel->wherePivot('status', $status);
        }

        $page = $rel->paginate($perPage)->appends($r->query());

        return response()->json([
            'company' => ['id'=>$company->id,'name'=>$company->name],
            'can' => ['create_manager' => $company->isOwner($r->user())],
            'data' => MemberResource::collection($page->items()),
            'meta' => [
                'total' => $page->total(),
                'per_page' => $page->perPage(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    /** POST /api/companies/v2/{company}/members/new */
    public function storeNew(StoreNewMemberRequest $request, Company $company)
    {
        $this->authorize('manageMembers', $company);

        // ограничение для MANAGER — не создавать MANAGER’ов
        $actorRole = $company->roleOf($request->user());
        if ($actorRole === CompanyRole::MANAGER->value && $request->input('role') === CompanyRole::MANAGER->value) {
            return response()->json(['message'=>'Manager չի կարող ստեղծել manager'], 422);
        }

        $user = $this->service->addNewMember($company, $request->user(), $request->validated());

        // вернуть карточку участника
        $member = $company->members()->where('users.id', $user->id)->firstOrFail();
        return (new MemberResource($member))->response()->setStatusCode(201);
    }

    /** POST /api/companies/v2/{company}/members/attach */
    public function attachExisting(AttachExistingMemberRequest $request, Company $company)
    {
        $this->authorize('manageMembers', $company);

        $actorRole = $company->roleOf($request->user());
        if ($actorRole === CompanyRole::MANAGER->value && $request->input('role') === CompanyRole::MANAGER->value) {
            return response()->json(['message'=>'Manager չի կարող նշանակել manager դեր'], 422);
        }

        $user = User::findOrFail((int)$request->input('user_id'));
        $this->service->attachExistingMember($company, $request->user(), $user, $request->input('role'), $request->input('notes'));

        $member = $company->members()->where('users.id', $user->id)->firstOrFail();
        return (new MemberResource($member))->response()->setStatusCode(201);
    }

    /** PUT /api/companies/v2/{company}/members/{member}/role */
    public function updateRole(UpdateMemberRoleRequest $request, Company $company, User $member)
    {
        $this->authorize('manageMembers', $company);

        $this->service->changeMemberRole($company, $request->user(), $member, $request->input('role'), $request->input('notes'));
        $fresh = $company->members()->where('users.id', $member->id)->firstOrFail();
        return new MemberResource($fresh);
    }

    /** PUT /api/companies/v2/{company}/members/{member}/suspend */
    public function suspend(Request $request, Company $company, User $member)
    {
        $this->authorize('manageMembers', $company);

        $this->service->setMemberStatus($company, $request->user(), $member, CompanyMemberStatus::SUSPENDED);
        $fresh = $company->members()->where('users.id', $member->id)->firstOrFail();
        return new MemberResource($fresh);
    }

    /** PUT /api/companies/v2/{company}/members/{member}/activate */
    public function activate(Request $request, Company $company, User $member)
    {
        $this->authorize('manageMembers', $company);

        $this->service->setMemberStatus($company, $request->user(), $member, CompanyMemberStatus::ACTIVE);
        $fresh = $company->members()->where('users.id', $member->id)->firstOrFail();
        return new MemberResource($fresh);
    }

    /** DELETE /api/companies/v2/{company}/members/{member} */
    public function destroy(Request $request, Company $company, User $member)
    {
        $this->authorize('manageMembers', $company);

        $this->service->removeMember($company, $request->user(), $member);
        return response()->json(['ok' => true]);
    }
}
