<?php

namespace App\Models;

use App\Enums\CompanyMemberStatus;
use App\Enums\CompanyRole;
use Illuminate\Database\Eloquent\Relations\Pivot;

class CompanyMember extends Pivot
{
    protected $table = 'company_members';

    protected $fillable = [
        'company_id',
        'user_id',
        'role',
        'status',
        'rating',
        'notes',
        'added_by_user_id',
    ];

    protected $casts = [
        'rating' => 'float',
    ];

    public function isActive(): bool
    {
        return $this->status === CompanyMemberStatus::ACTIVE->value;
    }

    public function roleIs(CompanyRole $role): bool
    {
        return $this->role === $role->value;
    }
}
