<?php
//
//namespace App\Models;
//
//use Carbon\Carbon;
//use Illuminate\Database\Eloquent\Builder;
//use Illuminate\Database\Eloquent\Factories\HasFactory;
//use Illuminate\Database\Eloquent\Model;
//
//class RiderOrder extends Model
//{
//    use HasFactory;
//
//    protected $table = 'rider_orders';
//
//    protected $fillable = [
//        'client_user_id',
//        'from_lat','from_lng','from_addr','from_addr_search',
//        'to_lat','to_lng','to_addr','to_addr_search',
//        'when_from','when_to','seats','payment',
//        'desired_price_amd','status','meta',
//    ];
//
//    protected $casts = [
//        'when_from' => 'datetime',
//        'when_to'   => 'datetime',
//        'meta'      => 'array',
//    ];
//public function scopeNearPoint(Builder $q, ?float $lat, ?float $lng, float $km): Builder
//{
//    if ($lat === null || $lng === null) return $q->whereRaw('1=0');
//    // Haversine (км)
//    $expr = "(6371*acos(least(1, cos(radians(?))*cos(radians(from_lat))*cos(radians(from_lng)-radians(?)) + sin(radians(?))*sin(radians(from_lat)))))";
//    $expr2= "(6371*acos(least(1, cos(radians(?))*cos(radians(to_lat  ))*cos(radians(to_lng  )-radians(?)) + sin(radians(?))*sin(radians(to_lat  )))))";
//    return $q->where(function($w) use($expr,$expr2,$lat,$lng,$km){
//        $w->whereRaw("$expr <= ?", [$lat,$lng,$lat,$km])
//          ->orWhereRaw("$expr2<= ?", [$lat,$lng,$lat,$km]);
//    });
//}
//public function scopeCityLike(Builder $q, string $token): Builder
//{
//    $t = '%'.mb_strtolower($token).'%';
//    return $q->where(function($w) use($t){
//        $w->whereRaw('LOWER(from_addr_search) LIKE ?', [$t])
//          ->orWhereRaw('LOWER(to_addr_search)   LIKE ?', [$t]);
//    });
//}
//
//public function scopeSeatsLe(Builder $q, int $seats): Builder
//{
//    return $q->where(function($w) use($seats){
//        $w->whereNull('seats')->orWhere('seats','<=',$seats);
//    });
//}
//
//    /* relations */
//    public function client()
//    {
//        return $this->belongsTo(User::class, 'client_user_id');
//    }
//
//    public function offers()
//    {
//        return $this->hasMany(DriverOffer::class, 'order_id');
//    }
//
//    /* scopes */
//    public function scopeOpen(Builder $q): Builder
//    {
//        return $q->where('status','open');
//    }
//
//    public function scopeTimeWindowIntersect(Builder $q, ?Carbon $from, ?Carbon $to): Builder
//    {
//        if ($from && $to) {
//            return $q->where(function($w) use ($from,$to) {
//                $w->whereNull('when_from')->orWhere('when_from','<=',$to);
//            })->where(function($w) use ($from,$to) {
//                $w->whereNull('when_to')->orWhere('when_to','>=',$from);
//            });
//        }
//        if ($from) return $q->where(function($w) use ($from) {
//            $w->whereNull('when_to')->orWhere('when_to','>=',$from);
//        });
//        if ($to) return $q->where(function($w) use ($to) {
//            $w->whereNull('when_from')->orWhere('when_from','<=',$to);
//        });
//        return $q;
//    }
//}


namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RiderOrder extends Model
{
    protected $table = 'rider_orders';

    protected $fillable = [
        'client_user_id',
        'from_lat', 'from_lng', 'from_addr', 'from_addr_search',
        'to_lat', 'to_lng', 'to_addr', 'to_addr_search',
        'when_from', 'when_to', 'seats', 'payment',
        'desired_price_amd', 'status', 'meta',
    ];

    protected $casts = [
        'when_from' => 'datetime',
        'when_to' => 'datetime',
        'meta' => 'array',
        'from_lat' => 'float',
        'from_lng' => 'float',
        'to_lat' => 'float',
        'to_lng' => 'float',
    ];

    public function client()
    {
        return $this->belongsTo(User::class, 'client_user_id');
    }
public function user()
{
    return $this->belongsTo(\App\Models\User::class, 'client_user_id');
}
    public function matches(){ return $this->hasMany(OrderTripMatch::class); }
public function hasPendingRequest(): bool {
  return $this->rideRequests()->whereIn('status',['pending','accepted'])->exists();
}
}
