<?php
// app/Http/Controllers/Api/Company/MemberApiController.php
namespace App\Http\Controllers\Api\Company;

use App\Http\Controllers\Controller;
use App\Models\{Company, User};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class MemberApiController extends Controller
{
    use _CompanyGuard;

    public function index(Request $r, Company $company)
    {
        $this->assertCanView($r, $company);

        $members = $company->members()->get(['users.id','users.name','users.email','company_members.role']);
        return response()->json([
            'data'=>$members->map(fn($m)=>[
                'id'=>$m->id,'name'=>$m->name,'email'=>$m->email,'role'=>$m->role,
            ]),
        ]);
    }

    public function store(Request $r, Company $company)
    {
        $this->assertCanManage($r, $company);

        $data = $r->validate([
            'name'=>'required|string|max:255',
            'email'=>['required','email','max:255', Rule::unique('users','email')],
            'password'=>'required|string|min:8',
            'role'=>['required', Rule::in(['driver','dispatcher'])],
        ]);

        $user = User::create([
            'name'=>$data['name'],
            'email'=>$data['email'],
            'password'=>Hash::make($data['password']),
            'role'=>'driver',
            'admin_status'=>'pending',
        ]);

        $company->members()->attach($user->id, ['role'=>$data['role']]);
        $user->sendEmailVerificationNotification();

        return response()->json(['status'=>'ok','member'=>[
            'id'=>$user->id,'name'=>$user->name,'email'=>$user->email,'role'=>$data['role']
        ]], 201);
    }

    public function update(Request $r, Company $company, User $user)
    {
        $this->assertCanManage($r, $company);
        $r->validate(['role'=>['required', Rule::in(['driver','dispatcher'])]]);

        abort_unless($company->members()->where('users.id',$user->id)->exists(), 404);
        $company->members()->updateExistingPivot($user->id, ['role'=>$r->role]);

        return response()->json(['status'=>'ok']);
    }

    public function destroy(Request $r, Company $company, User $user)
    {
        $this->assertCanManage($r, $company);

        if ((int)$company->owner_user_id === (int)$user->id) {
            return response()->json(['message'=>'cannot_remove_owner'], 409);
        }
        $company->members()->detach($user->id);
        return response()->json(['status'=>'ok']);
    }
}
