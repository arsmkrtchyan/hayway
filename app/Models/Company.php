<?php



namespace App\Models;

use App\Enums\CompanyRole;
use App\Enums\CompanyStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    protected $fillable = [
        'name', 'slug', 'email', 'phone', 'owner_user_id', 'status', 'logo_path',
        'timezone', 'locale', 'currency', 'settings', 'rating',
    ];

    protected $casts = [
        'settings' => 'array',
        'rating' => 'float',
    ];

    /* Владелец */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    /* Все участники с атрибутами membership (pivot) */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'company_members')
            ->using(CompanyMember::class)
            ->as('membership')
            ->withPivot(['role', 'status', 'rating', 'notes', 'added_by_user_id'])
            ->withTimestamps();
    }
    public function users(): BelongsToMany
    {
        return $this->members();
    }
    /* Удобные фильтры по ролям */
    public function managers(): BelongsToMany
    {
        return $this->members()->wherePivot('role', CompanyRole::MANAGER->value);
    }

    public function dispatchers(): BelongsToMany
    {
        return $this->members()->wherePivot('role', CompanyRole::DISPATCHER->value);
    }

    public function drivers(): BelongsToMany
    {
        return $this->members()->wherePivot('role', CompanyRole::DRIVER->value);
    }

    /* Связи, которые уже есть у вас */
    public function vehicles(): HasMany
    {
        return $this->hasMany(Vehicle::class);
    }

    public function trips(): HasMany
    {
        return $this->hasMany(Trip::class);
    }

    /* Скоуп: компании, к которым пользователь имеет доступ (владелец или член) */
    public function scopeForUser($q, int $userId)
    {
        return $q->where('owner_user_id', $userId)
            ->orWhereHas('members', fn($qq) => $qq->where('users.id', $userId));
    }

    public function isOwner(User $u): bool
    {
        return (int)$this->owner_user_id === (int)$u->id;
    }

    public function roleOf(User $u): ?string
    {
        if ($this->isOwner($u)) return CompanyRole::OWNER->value;
        $m = $this->members()->where('users.id', $u->id)->first();
        return $m?->membership?->role;
    }

    public function statusIs(CompanyStatus $s): bool
    {
        return $this->status === $s->value;
    }
}
