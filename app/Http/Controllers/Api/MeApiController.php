<?php

namespace App\Http\Controllers\Api;

use App\Enums\CompanyMemberStatus;
use App\Enums\CompanyRole;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MeApiController extends Controller
{
    public function show(Request $r)
    {
        $u = $r->user();

        $companyMemberships = DB::table('company_members as cm')
            ->join('companies as c', 'c.id', '=', 'cm.company_id')
            ->where('cm.user_id', $u->id)
            ->where('cm.role', CompanyRole::DRIVER->value)
            ->select(
                'c.id as company_id',
                'c.name as company_name',
                'c.status as company_status',
                'cm.status as membership_status'
            )
            ->get();

        $isCompanyDriver = $companyMemberships->contains(function ($m) {
            $status = $m->membership_status ?? CompanyMemberStatus::ACTIVE->value;
            return $status === CompanyMemberStatus::ACTIVE->value;
        });

        return response()->json([
            'id'            => $u->id,
            'name'          => $u->name,
            'email'         => $u->email,
            'role'          => $u->role,
            'admin_status'  => $u->admin_status,
            'email_verified'=> (bool)$u->email_verified_at,
            'is_company_driver' => $isCompanyDriver,
            'company_memberships' => $companyMemberships->map(fn($m) => [
                'company_id' => (int)$m->company_id,
                'company_name' => $m->company_name,
                'company_status' => $m->company_status,
                'membership_status' => $m->membership_status ?? CompanyMemberStatus::ACTIVE->value,
            ])->values(),
        ]);
    }
}
