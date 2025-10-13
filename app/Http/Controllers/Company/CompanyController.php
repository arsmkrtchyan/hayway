<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\StoreCompanyRequest;
use App\Http\Requests\Company\UpdateCompanyRequest;
use App\Models\Company;
use App\Services\CompanyService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CompanyController extends Controller
{

    /** Селектор компаний пользователя (если одна — редирект на show) */
    public function index()
    {
        $u = auth()->user();

        $companies = Company::forUser($u->id)
            ->withCount(['vehicles','trips'])
            ->with(['owner:id,name'])
            ->orderBy('id','desc')
            ->get(['id','name','slug','status','owner_user_id','logo_path','members_count']);

        if ($companies->count() === 1) {
   //         return redirect()->route('companies.show', $companies->first());
            return redirect()->route('company.dashboard.show', $companies->first());

        }

        return Inertia::render('Company/SelectCompany', [
            'companies' => $companies->map(fn($c)=>[
                'id'            => $c->id,
                'name'          => $c->name,
                'slug'          => $c->slug,
                'status'        => $c->status,
                'logo'          => $c->logo_path ? asset('storage/'.$c->logo_path) : null,
                'members_count' => $c->members_count,
                'vehicles'      => $c->vehicles_count,
                'trips'         => $c->trips_count,
                'owner'         => ['id'=>$c->owner->id,'name'=>$c->owner->name],
            ]),
        ]);
    }

    public function create()
    {
        $this->authorize('create', Company::class);
        return Inertia::render('Company/Create');
    }

    public function store(StoreCompanyRequest $request)
    {
        $this->authorize('create', Company::class);
        $company = $this->service->createCompany($request->user(), $request->validated());
//
//        return redirect()->route('companies.show', $company)
//            ->with('ok','Ընկերությունը ստեղծվեց։');
        // Было: ->route('companies.show', $company)
        return redirect()->route('company.dashboard.show', $company)
            ->with('ok','Ընկերությունը ստեղծվեց։');
    }

    public function show(Company $company)
    {
        $this->authorize('view', $company);

        $company->loadCount(['vehicles','trips'])
            ->load(['owner:id,name']);

        return Inertia::render('Company/Dashboard', [
            'company' => [
                'id'            => $company->id,
                'name'          => $company->name,
                'slug'          => $company->slug,
                'status'        => $company->status,
                'logo'          => $company->logo_path ? asset('storage/'.$company->logo_path) : null,
                'owner'         => ['id'=>$company->owner->id,'name'=>$company->owner->name],
                'members_count' => $company->members_count,
                'vehicles_count'=> $company->vehicles_count,
                'trips_count'   => $company->trips_count,
                'timezone'      => $company->timezone,
                'locale'        => $company->locale,
                'currency'      => $company->currency,
            ],
        ]);
    }

    public function edit(Company $company)
    {
        $this->authorize('update', $company);

        return Inertia::render('Company/Edit', [
            'company' => [
                'id'   => $company->id,
                'name' => $company->name,
                'slug' => $company->slug,
                'email'=> $company->email,
                'phone'=> $company->phone,
                'timezone'=>$company->timezone,
                'locale'=>$company->locale,
                'currency'=>$company->currency,
                'logo'=> $company->logo_path ? asset('storage/'.$company->logo_path) : null,
            ]
        ]);
    }

    public function update(UpdateCompanyRequest $request, Company $company)
    {
        $this->authorize('update', $company);
        $this->service->updateCompany($company, $request->validated());
//
//        return redirect()->route('companies.show', $company)
//            ->with('ok','Տվյալները թարմացվեցին։');
        // Было: ->route('companies.show', $company)
        return redirect()->route('company.dashboard.show', $company)
            ->with('ok','Տվյալները թարմացվեցին։');
    }

    public function destroy(Company $company)
    {
        $this->authorize('delete', $company);

        // по желанию: защита от удаления с активными сущностями
        if ($company->trips()->exists() || $company->vehicles()->exists()) {
            return back()->with('warn','Չի հաջողվել ջնջել. կան կապված տվյալներ (երթուղիներ կամ մեքենաներ)։');
        }

        $company->delete();

        return redirect()->route('companies.index')->with('ok','Ընկերությունը ջնջվեց։');
    }
}
