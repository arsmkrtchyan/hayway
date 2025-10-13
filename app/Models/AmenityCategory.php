<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AmenityCategory extends Model
{
    protected $fillable = ['name', 'slug', 'sort_order', 'is_active'];

    public function amenities(): HasMany
    {
        return $this->hasMany(Amenity::class);
    }
}
