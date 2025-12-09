<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectReview extends Model
{
    protected $fillable = ['user_id', 'rating', 'comment', 'is_public'];

    protected $casts = [
        'rating' => 'float',
        'is_public' => 'bool',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
