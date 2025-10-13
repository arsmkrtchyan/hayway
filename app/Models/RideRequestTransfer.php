<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RideRequestTransfer extends Model
{
    protected $fillable = [
        'ride_request_id','from_trip_id','to_trip_id','company_id',
        'transferred_by_user_id','reason','transferred_at',
    ];

    protected $casts = [
        'transferred_at' => 'datetime',
    ];

    public function request(){ return $this->belongsTo(RideRequest::class, 'ride_request_id'); }
    public function fromTrip(){ return $this->belongsTo(Trip::class, 'from_trip_id'); }
    public function toTrip(){ return $this->belongsTo(Trip::class, 'to_trip_id'); }
    public function company(){ return $this->belongsTo(Company::class, 'company_id'); }
    public function actor(){ return $this->belongsTo(User::class, 'transferred_by_user_id'); }
}
