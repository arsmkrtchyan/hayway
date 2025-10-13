<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\{Company, Vehicle};
use Illuminate\Http\Request;

class FleetController extends Controller
{
    public function index(Company $company)
    {
        $this->authorize('view', $company);

        $vehicles = $company->vehicles()
            ->with('user:id,name') // владелец / ответственный
            ->get(['id','brand','model','plate','color','seats','user_id']);

        return inertia('Company/Fleet', [
            'company'=>['id'=>$company->id,'name'=>$company->name],
            'vehicles'=>$vehicles,
        ]);
    }

    public function store(Request $r, Company $company)
    {
        $this->authorize('manage', $company);

        $data = $r->validate([
            'brand'=>'required|string|max:120',
            'model'=>'required|string|max:120',
            'plate'=>'nullable|string|max:50',
            'color'=>'nullable|string|max:20',
            'seats'=>'required|integer|min:1|max:8',
            'user_id'=>'nullable|exists:users,id', // ответственный водитель
        ]);

        if (empty($data['user_id'])) {
            $data['user_id'] = auth()->id();
        }

        $data['company_id'] = $company->id;

        Vehicle::create($data);

        return back()->with('ok', 'Մեքենան ավելացվեց');
    }
    public function destroy(Company $company, Vehicle $vehicle)
    {
        $this->authorize('manage', $company);

        if ((int)$vehicle->company_id !== (int)$company->id) {
            abort(404);
        }

        $vehicle->delete(); // trips с FK к vehicle_id удалятся по cascade, если так настроено
        return back()->with('ok','Մեքենան ջնջվեց');
    }

}
