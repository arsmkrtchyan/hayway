<?php
namespace App\Http\Controllers\Auth;


use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\{RegisterClientRequest, RegisterDriverRequest, RegisterCompanyRequest};
use App\Models\{User, Driver, Company};
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;


class RoleRegisterController extends Controller
{
    public function choice() { return Inertia::render('Auth/RegisterChoice'); }


    public function clientForm() { return Inertia::render('Auth/RegisterClient'); }
    public function driverForm() { return Inertia::render('Auth/RegisterDriver'); }
    public function companyForm() { return Inertia::render('Auth/RegisterCompany'); }


    public function storeClient(RegisterClientRequest $r) {
        $user = User::create([
            'name' => $r->name,
            'email' => $r->email,
            'password' => Hash::make($r->password),
            'role' => 'client',
            'admin_status' => 'approved',
        ]);
        $user->sendEmailVerificationNotification();
        Auth::login($user);
        return redirect()->route('dashboard');
    }


    public function storeDriver(RegisterDriverRequest $r) {
        $user = User::create([
            'name' => $r->name,
            'email' => $r->email,
            'password' => Hash::make($r->password),
            'role' => 'driver',
            'admin_status' => 'pending',
        ]);
        $selfie = $r->file('selfie')->store('uploads/kyc','public');
        $car = $r->file('car_photo')->store('uploads/car','public');
        Driver::create(['user_id'=>$user->id,'selfie_path'=>$selfie,'car_photo_path'=>$car]);
        $user->sendEmailVerificationNotification();
        Auth::login($user);
        return redirect()->route('pending');
    }


    public function storeCompany(RegisterCompanyRequest $r) {
        $user = User::create([
            'name' => $r->name,
            'email' => $r->email,
            'password' => Hash::make($r->password),
            'role' => 'company',
            'admin_status' => 'pending',
        ]);
        $logo = $r->file('logo') ? $r->file('logo')->store('uploads/logo','public') : null;
        $company = Company::create([
            'name' => $r->company_name,
            'email' => $user->email,
            'owner_user_id' => $user->id,
            'status' => 'pending',
            'logo_path' => $logo,
        ]);
        $user->companies()->attach($company->id, ['role'=>'manager']);
        $user->sendEmailVerificationNotification();
        Auth::login($user);
        return redirect()->route('pending');
    }
}
