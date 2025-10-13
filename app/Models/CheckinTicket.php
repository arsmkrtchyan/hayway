<?php

// app/Models/CheckinTicket.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CheckinTicket extends Model
{
    protected $fillable = [
        'token','ride_request_id','trip_id','client_user_id','driver_user_id','expires_at','used_at'
    ];
    protected $casts = ['expires_at'=>'datetime','used_at'=>'datetime'];
}

