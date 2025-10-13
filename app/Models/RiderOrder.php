<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RiderOrder extends Model
{
    use HasFactory;

    protected $table = 'rider_orders';

    protected $fillable = [
        'client_user_id',
        'from_lat','from_lng','from_addr','from_addr_search',
        'to_lat','to_lng','to_addr','to_addr_search',
        'when_from','when_to','seats','payment',
        'desired_price_amd','status','meta',
    ];

    protected $casts = [
        'when_from' => 'datetime',
        'when_to'   => 'datetime',
        'meta'      => 'array',
    ];

    /* relations */
    public function client()
    {
        return $this->belongsTo(User::class, 'client_user_id');
    }

    public function offers()
    {
        return $this->hasMany(DriverOffer::class, 'order_id');
    }

    /* scopes */
    public function scopeOpen(Builder $q): Builder
    {
        return $q->where('status','open');
    }

    public function scopeTimeWindowIntersect(Builder $q, ?Carbon $from, ?Carbon $to): Builder
    {
        if ($from && $to) {
            return $q->where(function($w) use ($from,$to) {
                $w->whereNull('when_from')->orWhere('when_from','<=',$to);
            })->where(function($w) use ($from,$to) {
                $w->whereNull('when_to')->orWhere('when_to','>=',$from);
            });
        }
        if ($from) return $q->where(function($w) use ($from) {
            $w->whereNull('when_to')->orWhere('when_to','>=',$from);
        });
        if ($to) return $q->where(function($w) use ($to) {
            $w->whereNull('when_from')->orWhere('when_from','<=',$to);
        });
        return $q;
    }
}
