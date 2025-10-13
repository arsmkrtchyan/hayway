<?php
// app/Http/Controllers/Api/Company/CompanyApiController.php
namespace App\Http\Controllers\Api\Company;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Company;

class CompanyApiController extends Controller
{
    use _CompanyGuard;

    public function index(Request $r)
    {
        $u = $r->user();
        $companies = $u->ownedCompanies()->select('id','name','status','owner_user_id')
            ->get()
            ->merge(
                $u->companies()->select('companies.id','companies.name','companies.status','companies.owner_user_id')->get()
            )
            ->unique('id')
            ->values();

        return response()->json([
            'data' => $companies->map(fn($c)=>[
                'id'=>$c->id,'name'=>$c->name,'status'=>$c->status,
            ]),
        ]);
    }

    public function show(Request $r, Company $company)
    {
        $this->assertCanView($r, $company);

        $company->loadCount(['vehicles','trips'])->load(['owner:id,name']);

        $pending = $company->trips()
            ->withCount(['rideRequests as pending_requests_count'=>fn($q)=>$q->where('status','pending')])
            ->get()->sum('pending_requests_count');

        return response()->json([
            'data'=>[
                'id'=>$company->id,
                'name'=>$company->name,
                'status'=>$company->status,
                'owner'=>['id'=>$company->owner->id,'name'=>$company->owner->name],
                'vehicles_count'=>$company->vehicles_count,
                'trips_count'=>$company->trips_count,
                'pending_requests'=>$pending,
            ],
        ]);
    }
}
