<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatUpload extends Model
{
    protected $fillable = ['user_id','path','mime','size','expires_at'];
    protected $casts = ['expires_at'=>'datetime'];
}
