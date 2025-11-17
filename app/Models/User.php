<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Laravel\Sanctum\HasApiTokens;
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable,HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name','email','password','role','admin_status','avatar_path','rating','number','icon'
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
   protected function casts(): array
{
    return [
        'email_verified_at'    => 'datetime',
        'password'             => 'hashed',
        'notifications_seen_at'=> 'datetime',
    ];
}
    public function isAdmin(): bool { return $this->role === 'admin'; }
    public function isApproved(): bool { return $this->admin_status === 'approved'; }

    public function markNotificationsSeen(): void
    {
        $this->forceFill([
            'notifications_seen_at' => now(),
        ])->save();
    }


    public function driver() { return $this->hasOne(Driver::class); }
//    public function companies() { return $this->belongsToMany(Company::class)->withTimestamps(); }
//    public function ownedCompanies() { return $this->hasMany(Company::class, 'owner_user_id'); }
    public function companies()
    {
        // ЯВНО указываем pivot-таблицу и доп. поле role
        return $this->belongsToMany(Company::class, 'company_members')
            ->withTimestamps()
            ->withPivot('role');
    }

    public function ownedCompanies()
    {
        return $this->hasMany(Company::class, 'owner_user_id');
    }

    public function roleInCompany(Company $company): ?string
    {
        $m = $this->companies()->where('company_id', $company->id)->first();
        if ($m) return $m->pivot->role;
        if ($company->owner_user_id === $this->id) return 'owner';
        return null;
    }
}
