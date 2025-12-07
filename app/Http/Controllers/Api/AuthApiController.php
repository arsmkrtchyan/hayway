<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Enums\CompanyMemberStatus;
use App\Enums\CompanyRole;
use App\Models\User;
use App\Models\Driver;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

use Illuminate\Validation\ValidationException;
class AuthApiController extends Controller
{
    public function registerClient(Request $r)
    {
        $data = $r->validate([
            'name'     => ['required','string','max:255'],
         //   'number'     => ['required','integer','max:255'],
            'email'    => ['required','string','email','max:255','unique:users,email'],
            'password' => ['required','confirmed', Password::min(8)],
        ]);

        $user = User::create([
            'name'         => $data['name'],
      //      'number'       => $data['number'],
            'email'        => $data['email'],
            'password'     => Hash::make($data['password']),
            'role'         => 'client',
            'admin_status' => 'pending',
        ]);

        $user->sendEmailVerificationNotification();
        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'status' => 'ok',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
          //      'number' => $user->number,
                'email' => $user->email,
                'role' => $user->role,
                'admin_status' => $user->admin_status,
                'email_verified' => (bool) $user->email_verified_at,
            ],
            'token' => $token,
        ], 201);
    }

    public function registerDriver(Request $r)
    {
        $data = $r->validate([
            'name'     => ['required','string','max:255'],
            'email'    => ['required','string','email','max:255','unique:users,email'],
            'password' => ['required','confirmed', Password::min(8)],
        ]);

        $user = DB::transaction(function () use ($data) {
            $u = User::create([
                'name'         => $data['name'],
                'email'        => $data['email'],
                'password'     => Hash::make($data['password']),
                'role'         => 'driver',
                'admin_status' => 'pending',
            ]);

            Driver::create([
                'user_id'       => $u->id,
                'selfie_path'   => null,
                'car_photo_path'=> null,
            ]);

            return $u;
        });

        $user->sendEmailVerificationNotification();
        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'status' => 'ok',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'admin_status' => $user->admin_status,
                'email_verified' => (bool) $user->email_verified_at,
            ],
            'token' => $token,
        ], 201);
    }

    public function registerCompany(Request $r)
    {
        $data = $r->validate([
            'name'         => ['required','string','max:255'],
            'email'        => ['required','string','email','max:255','unique:users,email'],
            'password'     => ['required','confirmed', Password::min(8)],
            'company_name' => ['required','string','max:255'],
        ]);

        $result = DB::transaction(function () use ($data) {
            $u = User::create([
                'name'         => $data['name'],
                'email'        => $data['email'],
                'password'     => Hash::make($data['password']),
                'role'         => 'company',
                'admin_status' => 'pending',
            ]);

            $c = Company::create([
                'name'          => $data['company_name'],
                'email'         => $u->email,
                'owner_user_id' => $u->id,
                'status'        => 'pending',
                'logo_path'     => null,
            ]);

            // привязка к компании с ролью manager
            $u->companies()->attach($c->id, ['role' => 'manager']);

            return [$u, $c];
        });

        [$user, $company] = $result;

        $user->sendEmailVerificationNotification();
        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'status'  => 'ok',
            'user'    => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'admin_status' => $user->admin_status,
                'email_verified' => (bool) $user->email_verified_at,
            ],
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'status' => $company->status,
            ],
            'token'   => $token,
        ], 201);
    }


    public function login(\Illuminate\Http\Request $r)
    {
        $data = $r->validate([
            'email'       => ['required','email'],
            'password'    => ['required','string'],
            'device_name' => ['sometimes','string','max:100'],
        ]);

        $user = \App\Models\User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'invalid_credentials'], 401);
        }

        // Требуем верификацию почты
        if (is_null($user->email_verified_at)) {
            return response()->json(['message' => 'email_unverified'], 403);
        }

        // Политика допуска: водители и компании — только approved; клиентам можно и pending
        if (in_array($user->role, ['driver','company']) && $user->admin_status !== 'approved') {
            return response()->json(['message' => 'admin_approval_required'], 403);
        }

        $name  = $data['device_name'] ?? 'api';
        $token = $user->createToken($name)->plainTextToken;

        $companyMemberships = DB::table('company_members as cm')
            ->join('companies as c', 'c.id', '=', 'cm.company_id')
            ->where('cm.user_id', $user->id)
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
            'status' => 'ok',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'admin_status' => $user->admin_status,
                'email_verified' => true,
                'is_company_driver' => $isCompanyDriver,
                'company_memberships' => $companyMemberships->map(fn($m) => [
                    'company_id' => (int)$m->company_id,
                    'company_name' => $m->company_name,
                    'company_status' => $m->company_status,
                    'membership_status' => $m->membership_status ?? CompanyMemberStatus::ACTIVE->value,
                ])->values(),
            ],
            'token' => $token,
        ]);
    }

    public function logout(\Illuminate\Http\Request $r)
    {
        // отозвать текущий токен
        $r->user()->currentAccessToken()->delete();
        return response()->json(['status' => 'ok']);
    }

    public function logoutAll(\Illuminate\Http\Request $r)
    {
        // отозвать все токены пользователя
        $r->user()->tokens()->delete();
        return response()->json(['status' => 'ok']);
    }

}


//namespace App\Http\Controllers\Api;
//
//use App\Http\Controllers\Controller;
//use App\Models\{User, Driver, Company};
//use Illuminate\Http\Request;
//use Illuminate\Support\Facades\{Hash, Storage, RateLimiter};
//use Illuminate\Validation\Rules\Password;
//use Illuminate\Validation\ValidationException;
//
//class AuthApiController extends Controller
//{
//    /* ===== helpers ===== */
//    private function userPayload(User $u): array
//    {
//        return [
//            'id' => $u->id,
//            'name' => $u->name,
//            'email' => $u->email,
//            'role' => $u->role,
//            'admin_status' => $u->admin_status,
//            'rating' => (float)($u->rating ?? 5),
//            'avatar_url' => $u->avatar_path ? Storage::disk('public')->url($u->avatar_path) : null,
//            'email_verified_at' => optional($u->email_verified_at)?->toIso8601String(),
//        ];
//    }
//
//    private function issueToken(User $u, ?string $as = null, array $abilities = ['*']): string
//    {
//        $name = $as ?? ('api-' . request()->ip());
//        return $u->createToken($name, $abilities, now()->addMinutes(config('sanctum.expiration')))->plainTextToken;
//    }
//
//    private function ensureEmailVerified(User $u): void
//    {
//        if ($u instanceof \Illuminate\Contracts\Auth\MustVerifyEmail && !$u->hasVerifiedEmail()) {
//            throw ValidationException::withMessages([
//                'email' => 'Email is not verified',
//            ])->status(403);
//        }
//    }
//
//    /* ===== public ===== */
//
//    // POST /api/login
//    public function login(Request $r)
//    {
//        $data = $r->validate([
//            'email' => ['required', 'email'],
//            'password' => ['required', 'string'],
//            'device' => ['nullable', 'string', 'max:60'],
//        ]);
//
//        $key = 'login:' . sha1(($data['email'] ?? '') . '|' . ($r->ip() ?? ''));
//        if (RateLimiter::tooManyAttempts($key, 10)) {
//            $seconds = RateLimiter::availableIn($key);
//            throw ValidationException::withMessages(['email' => "Too many attempts. Retry in {$seconds}s"]);
//        }
//
//        $u = User::where('email', $data['email'])->first();
//        if (!$u || !Hash::check($data['password'], $u->password)) {
//            RateLimiter::hit($key, 60);
//            throw ValidationException::withMessages(['email' => 'Invalid credentials']);
//        }
//
//        RateLimiter::clear($key);
//        $this->ensureEmailVerified($u);
//
//        $abilities = ['*']; // при желании: по ролям ['client:basic'] и т.д.
//        $token = $this->issueToken($u, $data['device'] ?? null, $abilities);
//
//        return response()->json(['data' => [
//            'user' => $this->userPayload($u),
//            'token' => $token,
//            'type' => 'Bearer',
//        ]]);
//    }
//
//    // POST /api/logout
//    public function logout(Request $r)
//    {
//        $r->user()?->currentAccessToken()?->delete();
//        return response()->json(['data' => ['ok' => true]]);
//    }
//
//    // POST /api/logout-all
//    public function logoutAll(Request $r)
//    {
//        $r->user()?->tokens()?->delete();
//        return response()->json(['data' => ['ok' => true]]);
//    }
//
//    // GET /api/me
//    public function me(Request $r)
//    {
//        return response()->json(['data' => $this->userPayload($r->user())]);
//    }
//
//    // POST /api/register/client
//    public function registerClient(Request $r)
//    {
//        $v = $r->validate([
//            'name' => ['required', 'string', 'max:255'],
//
//            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
//            'password' => ['required', 'confirmed', Password::defaults()],
//        ]);
//
//        $u = User::create([
//            'name' => $v['name'],
//            'email' => $v['email'],
//            'password' => Hash::make($v['password']),
//            'role' => 'client',
//            'admin_status' => 'approved',
//        ]);
//
//        $u->sendEmailVerificationNotification();
//
//        $token = $this->issueToken($u, 'api-register');
//        return response()->json(['data' => [
//            'user' => $this->userPayload($u),
//            'token' => $token,
//            'type' => 'Bearer',
//            'note' => 'Verify email to use all features',
//        ]], 201);
//    }
//
//    // POST /api/register/driver  (multipart/form-data)
//    public function registerDriver(Request $r)
//    {
//        $v = $r->validate([
//            'name' => ['required', 'string', 'max:255'],
//            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
//            'password' => ['required', 'confirmed', Password::defaults()],
//            'selfie' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
//            'car_photo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
//        ]);
//
//        $u = User::create([
//            'name' => $v['name'],
//            'email' => $v['email'],
//            'password' => Hash::make($v['password']),
//            'role' => 'driver',
//            'admin_status' => 'pending',
//        ]);
//
//        $selfie = $r->file('selfie')->store('uploads/kyc', 'public');
//        $car = $r->file('car_photo')->store('uploads/car', 'public');
//        Driver::create(['user_id' => $u->id, 'selfie_path' => $selfie, 'car_photo_path' => $car]);
//
//        $u->sendEmailVerificationNotification();
//
//        $token = $this->issueToken($u, 'api-register');
//        return response()->json(['data' => [
//            'user' => $this->userPayload($u),
//            'token' => $token,
//            'type' => 'Bearer',
//            'note' => 'Pending admin approval. Verify email.',
//        ]], 201);
//    }
//
//    // POST /api/register/company  (multipart/form-data)
//    public function registerCompany(Request $r)
//    {
//        $v = $r->validate([
//            'name' => ['required', 'string', 'max:255'], // контактное имя владельца
//            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
//            'password' => ['required', 'confirmed', Password::defaults()],
//            'company_name' => ['required', 'string', 'max:255'],
//            'logo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
//        ]);
//
//        $u = User::create([
//            'name' => $v['name'],
//            'email' => $v['email'],
//            'password' => Hash::make($v['password']),
//            'role' => 'company',
//            'admin_status' => 'pending',
//        ]);
//
//        $logo = $r->file('logo') ? $r->file('logo')->store('uploads/logo', 'public') : null;
//
//        $company = Company::create([
//            'name' => $v['company_name'],
//            'email' => $u->email,
//            'owner_user_id' => $u->id,
//            'status' => 'pending',
//            'logo_path' => $logo,
//        ]);
//
//        // привяжем владельца как manager
//        $u->companies()->attach($company->id, ['role' => 'manager']);
//
//        $u->sendEmailVerificationNotification();
//
//        $token = $this->issueToken($u, 'api-register');
//        return response()->json(['data' => [
//            'user' => $this->userPayload($u),
//            'company' => [
//                'id' => $company->id,
//                'name' => $company->name,
//                'email' => $company->email,
//                'status' => $company->status,
//                'logo_url' => $logo ? Storage::disk('public')->url($logo) : null,
//            ],
//            'token' => $token,
//            'type' => 'Bearer',
//            'note' => 'Pending admin approval. Verify email.',
//        ]], 201);
//    }
//}
//// app/Http/Controllers/Api/AuthApiController.php
//
////
////namespace App\Http\Controllers\Api;
////use App\Http\Controllers\Controller;
////use App\Models\{User, Driver, Company};
////use Illuminate\Http\Request;
////use Illuminate\Support\Facades\{Hash, Storage, RateLimiter};
////use Illuminate\Validation\Rules\Password;
////use Illuminate\Validation\ValidationException;
////
////class AuthApiController extends Controller
////{
////    private function normalizePhone(?string $v): ?string {
////        if ($v === null) return null;
////        $d = preg_replace('/\D+/', '', $v);           // только цифры
////        if ($d === '') return null;
////        if (strlen($d) < 8 || strlen($d) > 15) {
////            throw ValidationException::withMessages(['number' => 'Phone must be 8..15 digits']);
////        }
////        return $d; // храним без +
////    }
////
////    private function userPayload(User $u): array {
////        return [
////            'id'=>$u->id,'name'=>$u->name,'email'=>$u->email,
////            'number'=>$u->number, // <-- добавлено
////            'role'=>$u->role,'admin_status'=>$u->admin_status,
////            'rating'=>(float)($u->rating ?? 5),
////            'avatar_url'=>$u->avatar_path ? Storage::disk('public')->url($u->avatar_path) : null,
////            'email_verified_at'=>optional($u->email_verified_at)?->toIso8601String(),
////        ];
////    }
////
////    private function issueToken(User $u, ?string $as = null, array $abilities = ['*']): string {
////        $name = $as ?? ('api-'.request()->ip());
////        return $u->createToken($name, $abilities, now()->addMinutes(config('sanctum.expiration')))->plainTextToken;
////    }
////
////    private function ensureEmailVerified(User $u): void {
////        if ($u instanceof \Illuminate\Contracts\Auth\MustVerifyEmail && !$u->hasVerifiedEmail()) {
////            throw ValidationException::withMessages(['email' => 'Email is not verified'])->status(403);
////        }
////    }
////
////    // ===== AUTH =====
////
////    // POST /api/login   { login: "mail@x.com" | "+374..." | "374...", password, device? }
////    // также поддерживает {email, ...} или {number, ...}
////    public function login(Request $r) {
////        $data = $r->validate([
////            'login'   => ['nullable','string','max:100'],
////            'email'   => ['nullable','string','max:100'],
////            'number'  => ['nullable','string','max:32'],
////            'password'=> ['required','string'],
////            'device'  => ['nullable','string','max:60'],
////        ]);
////
////        $login = $data['login'] ?? $data['email'] ?? $data['number'] ?? null;
////        if (!$login) throw ValidationException::withMessages(['login'=>'login/email/number required']);
////
////        $key = 'login:'.sha1($login.'|'.($r->ip() ?? ''));
////        if (RateLimiter::tooManyAttempts($key, 10)) {
////            $sec = RateLimiter::availableIn($key);
////            throw ValidationException::withMessages(['login'=>"Too many attempts. Retry in {$sec}s"]);
////        }
////
////        // определить способ
////        if (str_contains($login, '@')) {
////            $u = User::where('email', $login)->first();
////        } else {
////            $num = $this->normalizePhone($login);
////            $u = $num ? User::where('number', $num)->first() : null;
////        }
////
////        if (!$u || !Hash::check($data['password'], $u->password)) {
////            RateLimiter::hit($key, 60);
////            throw ValidationException::withMessages(['login'=>'Invalid credentials']);
////        }
////
////        RateLimiter::clear($key);
////        $this->ensureEmailVerified($u);
////
////        $token = $this->issueToken($u, $data['device'] ?? null);
////        return response()->json(['data'=>[
////            'user'=>$this->userPayload($u),
////            'token'=>$token,
////            'type'=>'Bearer',
////        ]]);
////    }
////
////    // GET /api/me
////    public function me(Request $r) { return response()->json(['data'=>$this->userPayload($r->user())]); }
////
////    // POST /api/logout
////    public function logout(Request $r) {
////        $r->user()?->currentAccessToken()?->delete();
////        return response()->json(['data'=>['ok'=>true]]);
////    }
////
////    // POST /api/logout-all
////    public function logoutAll(Request $r) {
////        $r->user()?->tokens()?->delete();
////        return response()->json(['data'=>['ok'=>true]]);
////    }
////
////    // POST /api/register/client
////    public function registerClient(Request $r) {
////        $v = $r->validate([
////            'name'     => ['required','string','max:255'],
////            'number'   => ['required','string','max:32'],
////            'email'    => ['required','email','max:255','unique:users,email'],
////            'password' => ['required','confirmed', Password::defaults()],
////        ]);
////        $num = $this->normalizePhone($v['number']);
////        if (User::where('number',$num)->exists()) {
////            throw ValidationException::withMessages(['number'=>'Phone already taken']);
////        }
////
////        $u = User::create([
////            'name'=>$v['name'],
////            'number'=>$num,         // <-- сохраняем цифры-only
////            'email'=>$v['email'],
////            'password'=>Hash::make($v['password']),
////            'role'=>'client',
////            'admin_status'=>'approved',
////        ]);
////
////        $u->sendEmailVerificationNotification();
////        $token = $this->issueToken($u,'api-register');
////
////        return response()->json(['data'=>[
////            'user'=>$this->userPayload($u),
////            'token'=>$token,
////            'type'=>'Bearer',
////            'note'=>'Verify email to use all features'
////        ]], 201);
////    }
////
////    // POST /api/register/driver (multipart)
////    public function registerDriver(Request $r) {
////        $v = $r->validate([
////            'name'       => ['required','string','max:255'],
////            'number'     => ['required','string','max:32'],
////            'email'      => ['required','email','max:255','unique:users,email'],
////            'password'   => ['required','confirmed', Password::defaults()],
////            'selfie'     => ['required','file','mimes:jpg,jpeg,png,webp','max:8192'],
////            'car_photo'  => ['required','file','mimes:jpg,jpeg,png,webp','max:8192'],
////        ]);
////        $num = $this->normalizePhone($v['number']);
////        if (User::where('number',$num)->exists()) {
////            throw ValidationException::withMessages(['number'=>'Phone already taken']);
////        }
////
////        $u = User::create([
////            'name'=>$v['name'],
////            'number'=>$num,
////            'email'=>$v['email'],
////            'password'=>Hash::make($v['password']),
////            'role'=>'driver',
////            'admin_status'=>'pending',
////        ]);
////
////        $selfie = $r->file('selfie')->store('uploads/kyc','public');
////        $car    = $r->file('car_photo')->store('uploads/car','public');
////        \App\Models\Driver::create(['user_id'=>$u->id,'selfie_path'=>$selfie,'car_photo_path'=>$car]);
////
////        $u->sendEmailVerificationNotification();
////        $token = $this->issueToken($u,'api-register');
////
////        return response()->json(['data'=>[
////            'user'=>$this->userPayload($u),
////            'token'=>$token,
////            'type'=>'Bearer',
////            'note'=>'Pending admin approval. Verify email.'
////        ]], 201);
////    }
////
////    // POST /api/register/company (multipart)
////    public function registerCompany(Request $r) {
////        $v = $r->validate([
////            'name'         => ['required','string','max:255'],
////            'number'       => ['required','string','max:32'],
////            'email'        => ['required','email','max:255','unique:users,email'],
////            'password'     => ['required','confirmed', Password::defaults()],
////            'company_name' => ['required','string','max:255'],
////            'logo'         => ['nullable','file','mimes:jpg,jpeg,png,webp','max:8192'],
////        ]);
////        $num = $this->normalizePhone($v['number']);
////        if (User::where('number',$num)->exists()) {
////            throw ValidationException::withMessages(['number'=>'Phone already taken']);
////        }
////
////        $u = User::create([
////            'name'=>$v['name'],
////            'number'=>$num,
////            'email'=>$v['email'],
////            'password'=>Hash::make($v['password']),
////            'role'=>'company',
////            'admin_status'=>'pending',
////        ]);
////
////        $logo = $r->file('logo') ? $r->file('logo')->store('uploads/logo','public') : null;
////
////        $company = Company::create([
////            'name'=>$v['company_name'],
////            'email'=>$u->email,
////            'owner_user_id'=>$u->id,
////            'status'=>'pending',
////            'logo_path'=>$logo,
////        ]);
////        $u->companies()->attach($company->id, ['role'=>'manager']);
////
////        $u->sendEmailVerificationNotification();
////        $token = $this->issueToken($u,'api-register');
////
////        return response()->json(['data'=>[
////            'user'=>$this->userPayload($u),
////            'company'=>[
////                'id'=>$company->id,'name'=>$company->name,'email'=>$company->email,'status'=>$company->status,
////                'logo_url'=>$logo ? Storage::disk('public')->url($logo) : null,
////            ],
////            'token'=>$token,
////            'type'=>'Bearer',
////            'note'=>'Pending admin approval. Verify email.'
////        ]], 201);
////    }
////}
