<?php
namespace App\Http\Controllers\Admin;
use App\Http\Controllers\Controller;
use App\Models\{User, Company};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;


class ApprovalController extends Controller
{
    public function index() {
        Gate::authorize('admin');
        $drivers = User::with('driver')
            ->where('role','driver')->where('admin_status','pending')->latest()->get();
        $companies = Company::with('owner')
            ->where('status','pending')->latest()->get();
        return Inertia::render('Admin/Dashboard', compact('drivers','companies'));
    }


    public function approveDriver(User $user) {
        Gate::authorize('admin');
        abort_unless($user->role === 'driver', 404);
        $user->update(['admin_status'=>'approved']);
        return back();
    }
    public function rejectDriver(User $user) {
        Gate::authorize('admin');
        abort_unless($user->role === 'driver', 404);
        $user->update(['admin_status'=>'rejected']);
        return back();
    }


    public function approveCompany(Company $company) {
        Gate::authorize('admin');
        $company->update(['status'=>'approved']);
        $company->owner->update(['admin_status'=>'approved']);
        return back();
    }
    public function rejectCompany(Company $company) {
        Gate::authorize('admin');
        $company->update(['status'=>'rejected']);
        $company->owner->update(['admin_status'=>'rejected']);
        return back();
    }
}
