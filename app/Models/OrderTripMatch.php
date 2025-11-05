<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderTripMatch extends Model {
  protected $fillable = ['order_id','trip_id','notified_at','ride_request_id'];
  public function order(){ return $this->belongsTo(RiderOrder::class); }
  public function trip(){ return $this->belongsTo(Trip::class); }
}
