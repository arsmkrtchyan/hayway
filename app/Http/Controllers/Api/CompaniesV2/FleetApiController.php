<?php

namespace App\Http\Controllers\Api\CompaniesV2;

use App\Http\Controllers\Controller;
use App\Models\{Company, Vehicle};
use Illuminate\Http\Request;

class FleetApiController extends Controller
{
    public function index(Company $company)
    {
        $this->authorize('view', $company);

        $vehicles = $company->vehicles()
            ->with('user:id,name')
            ->get(['id','brand','model','plate','color','seats','user_id']);

        return response()->json(['items'=>$vehicles]);
    }

    // user_id принудительно = owner_user_id
    public function store(Request $r, Company $company)
    {
        $this->authorize('manage', $company);

        $data = $r->validate([
            'brand' => 'required|string|max:120',
            'model' => 'required|string|max:120',
            'plate' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
            'seats' => 'required|integer|min:1|max:8',
        ]);

        $v = Vehicle::create([
            'company_id' => $company->id,
            'user_id'    => $company->owner_user_id,  // <— как просили
            'brand'      => $data['brand'],
            'model'      => $data['model'],
            'plate'      => $data['plate'] ?? null,
            'color'      => $data['color'] ?? null,
            'seats'      => $data['seats'],
            'status'     => 'active',
        ]);

        return response()->json(['data'=>$v], 201);
    }

    public function destroy(Company $company, Vehicle $vehicle)
    {
        $this->authorize('manage', $company);
        if ((int)$vehicle->company_id !== (int)$company->id) abort(404);

        $vehicle->delete();

        return response()->json(['ok'=>true]);
    }
}
