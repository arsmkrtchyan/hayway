<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;


class RideRequest extends Model
{
//    protected $fillable = [
//        'trip_id','user_id','passenger_name','phone','description',
//        'seats','payment','status','decided_by_user_id','decided_at'
//    ];
    protected $fillable = [
        'trip_id','user_id','passenger_name','phone','description',
        'seats','payment','status','meta','decided_by_user_id','decided_at',
        'is_checked_in','checked_in_at','price_amd','created_by_user_id','order_id',
    ];

    protected $casts = [
        'meta' => 'array',
        'is_checked_in' => 'bool',
        'checked_in_at' => 'datetime',
        'price_amd' => 'int',
        'decided_at' => 'datetime',
    ];
public function order()  { return $this->belongsTo(RiderOrder::class, 'order_id'); }

    public function trip(){ return $this->belongsTo(\App\Models\Trip::class); }
    public function user(){ return $this->belongsTo(\App\Models\User::class); }
    public function decidedBy()
    {
        return $this->belongsTo(\App\Models\User::class, 'decided_by_user_id');
    }
    public function creator()
    {
        return $this->belongsTo(User::class,'created_by_user_id');
    }
}
