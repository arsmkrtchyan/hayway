<?php
// app/Http/Controllers/Api/Company/FleetApiController.php
namespace App\Http\Controllers\Api\Company;

use App\Http\Controllers\Controller;
use App\Models\{Company, Vehicle};
use Illuminate\Http\Request;

class FleetApiController extends Controller
{
    use _CompanyGuard;

    public function index(Request $r, Company $company)
    {
        $this->assertCanView($r, $company);

        $vehicles = $company->vehicles()->with('user:id,name')->get(['id','brand','model','plate','color','seats','user_id']);
        return response()->json([
            'data'=>$vehicles->map(fn($v)=>[
                'id'=>$v->id,'brand'=>$v->brand,'model'=>$v->model,'plate'=>$v->plate,
                'color'=>$v->color,'seats'=>(int)$v->seats,
                'user'=> $v->user ? ['id'=>$v->user->id,'name'=>$v->user->name] : null,
            ]),
        ]);
    }

    public function store(Request $r, Company $company)
    {
        $this->assertCanManage($r, $company);

        $data = $r->validate([
            'brand'=>'required|string|max:120',
            'model'=>'required|string|max:120',
            'plate'=>'nullable|string|max:50',
            'color'=>'nullable|string|max:20',
            'seats'=>'required|integer|min:1|max:8',
            'user_id'=>'nullable|exists:users,id',
        ]);

        $data['user_id']   = $data['user_id'] ?: $r->user()->id;
        $data['company_id']= $company->id;

        $v = Vehicle::create($data);

        return response()->json(['status'=>'ok','vehicle'=>[
            'id'=>$v->id,'brand'=>$v->brand,'model'=>$v->model,'plate'=>$v->plate,
            'color'=>$v->color,'seats'=>(int)$v->seats,
        ]], 201);
    }

    public function destroy(Request $r, Company $company, Vehicle $vehicle)
    {
        $this->assertCanManage($r, $company);
        abort_unless((int)$vehicle->company_id === (int)$company->id, 404);

        $vehicle->delete();
        return response()->json(['status'=>'ok']);
    }
}
