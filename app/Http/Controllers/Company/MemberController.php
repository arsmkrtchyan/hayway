<?php





namespace App\Http\Controllers\Company;

use App\Enums\CompanyMemberStatus;
use App\Enums\CompanyRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Company\Member\AttachExistingMemberRequest;
use App\Http\Requests\Company\Member\StoreNewMemberRequest;
use App\Http\Requests\Company\Member\UpdateMemberRoleRequest;
use App\Models\Company;
use App\Models\User;
use App\Services\CompanyService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class MemberController extends Controller implements HasMiddleware
{
    private CompanyService $service;

    public static function middleware(): array
    {
        return [
            new Middleware('auth'),
            new Middleware('verified'),
        ];
    }

    public function __construct(CompanyService $service)
    {
        $this->service = $service;
    }

    public function index(Company $company)
    {
        $this->authorize('manageMembers', $company);

        $members = $company->members()
            ->select('users.id','users.name','users.email')
            ->withPivot(['role','status','notes','added_by_user_id','created_at'])
            ->orderBy('company_members.role')
            ->orderBy('users.name')
            ->get();

        return Inertia::render('Company/Members', [
            'company' => ['id'=>$company->id,'name'=>$company->name],
            'members' => $members->map(fn(User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->membership->role,
                'status' => $u->membership->status,
                'notes' => $u->membership->notes,
                'added_by_user_id' => $u->membership->added_by_user_id,
                'joined_at' => optional($u->membership->created_at)->toDateTimeString(),
            ]),
            'can' => [
                'create_manager' => $company->isOwner(auth()->user()),
            ],
        ]);
    }

    public function storeNew(StoreNewMemberRequest $request, Company $company)
    {
        $this->authorize('manageMembers', $company);

        $role = $request->input('role');
        if ($company->roleOf($request->user()) === CompanyRole::MANAGER->value
            && $role === CompanyRole::MANAGER->value) {
            return back()->withErrors(['role' => 'Manager չի կարող ստեղծել manager։'])->withInput();
        }

        $this->service->addNewMember($company, $request->user(), $request->validated());

        return back()->with('ok', 'Անձնակազմը ավելացվեց: Ուղարկվեց էլ․ հասցեի հաստատման նամակ։');
    }

    public function attachExisting(AttachExistingMemberRequest $request, Company $company)
    {
        $this->authorize('manageMembers', $company);

        $role = $request->input('role');
        if ($company->roleOf($request->user()) === CompanyRole::MANAGER->value
            && $role === CompanyRole::MANAGER->value) {
            return back()->withErrors(['role' => 'Manager չի կարող նշանակել manager դեր։'])->withInput();
        }

        $user = User::findOrFail((int)$request->input('user_id'));

        $this->service->attachExistingMember(
            $company,
            $request->user(),
            $user,
            $role,
            $request->input('notes')
        );

        return back()->with('ok', 'Օգտատերը հաջողությամբ միացվեց ընկերությանը։');
    }

    public function updateRole(UpdateMemberRoleRequest $request, Company $company, User $member)
    {
        $this->authorize('manageMembers', $company);

        $this->service->changeMemberRole($company, $request->user(), $member, $request->input('role'), $request->input('notes'));

        return back()->with('ok', 'Դերը թարմացվեց։');
    }

    public function suspend(Request $request, Company $company, User $member)
    {
        $this->authorize('manageMembers', $company);

        $this->service->setMemberStatus($company, $request->user(), $member, CompanyMemberStatus::SUSPENDED);

        return back()->with('ok', 'Օգտատերը ժամանակավորապես կանգնեցվեց։');
    }

    public function activate(Request $request, Company $company, User $member)
    {
        $this->authorize('manageMembers', $company);

        $this->service->setMemberStatus($company, $request->user(), $member, CompanyMemberStatus::ACTIVE);

        return back()->with('ok', 'Օգտատերը ակտիվացվեց։');
    }

    public function destroy(Request $request, Company $company, User $member)
    {
        $this->authorize('manageMembers', $company);

        $this->service->removeMember($company, $request->user(), $member);

        return back()->with('ok', 'Աշխատակիցը հեռացվեց ընկերությունից։');
    }
}
