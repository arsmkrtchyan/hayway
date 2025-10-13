<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DriverOffer extends Model
{
    protected $table = 'driver_offers';

    protected $fillable = [
        'order_id','trip_id','driver_user_id',
        'price_amd','seats','status','valid_until','meta',
    ];

    protected $casts = [
        'valid_until' => 'datetime',
        'meta'        => 'array',
    ];

    public function order()  { return $this->belongsTo(RiderOrder::class,'order_id'); }
    public function trip()   { return $this->belongsTo(Trip::class,'trip_id'); }
    public function driver() { return $this->belongsTo(User::class,'driver_user_id'); }
}
