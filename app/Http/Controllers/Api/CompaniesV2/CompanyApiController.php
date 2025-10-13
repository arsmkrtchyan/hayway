<?php

namespace App\Http\Controllers\Api\CompaniesV2;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\Request;

class CompanyApiController extends Controller
{
    public function show(Company $company)
    {
        $this->authorize('view', $company);

        $company->loadCount(['vehicles','trips'])->load(['owner:id,name,email']);

        return response()->json([
            'data' => [
                'id'             => $company->id,
                'name'           => $company->name,
                'slug'           => $company->slug,
                'status'         => $company->status,
                'logo'           => $company->logo_path ? asset('storage/'.$company->logo_path) : null,
                'owner'          => ['id'=>$company->owner->id,'name'=>$company->owner->name,'email'=>$company->owner->email],
                'members_count'  => $company->members_count,
                'vehicles_count' => $company->vehicles_count,
                'trips_count'    => $company->trips_count,
                'timezone'       => $company->timezone,
                'locale'         => $company->locale,
                'currency'       => $company->currency,
                'phone'          => $company->phone,
            ]
        ]);
    }

    // ВАЖНО: без email
    public function update(Request $r, Company $company)
    {
        $this->authorize('update', $company);

        $data = $r->validate([
            'name'     => ['required','string','max:160'],
            'slug'     => ['nullable','string','max:160'],
            'phone'    => ['nullable','string','max:60'],
            'timezone' => ['nullable','string','max:64'],
            'locale'   => ['nullable','string','max:8'],
            'currency' => ['nullable','string','max:8'],
            'logo'     => ['nullable','file','mimes:jpg,jpeg,png,webp','max:4096'],
        ]);

        if ($r->hasFile('logo')) {
            $company->logo_path = $r->file('logo')->store('uploads/company-logos','public');
        }

        $company->fill([
            'name'     => $data['name'],
            'slug'     => $data['slug']     ?? $company->slug,
            'phone'    => $data['phone']    ?? $company->phone,
            'timezone' => $data['timezone'] ?? $company->timezone,
            'locale'   => $data['locale']   ?? $company->locale,
            'currency' => $data['currency'] ?? $company->currency,
        ])->save();

        return response()->json(['ok'=>true]);
    }

    // Удаление = пометить deleted
    public function destroy(Company $company)
    {
        $this->authorize('delete', $company);

        $company->update(['status' => 'deleted']);

        return response()->json(['ok'=>true,'status'=>'deleted']);
    }
}
