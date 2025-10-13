<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Amenity extends Model
{
    protected $fillable = [
        'amenity_category_id', 'name', 'slug', 'icon', 'is_active', 'sort_order', 'meta'
    ];

    protected $casts = [
        'is_active' => 'bool',
        'meta' => 'array',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(AmenityCategory::class, 'amenity_category_id');
    }

    public function trips(): BelongsToMany
    {
        return $this->belongsToMany(Trip::class)
            ->withPivot(['selected_at', 'notes'])
            ->withTimestamps();
    }
}
