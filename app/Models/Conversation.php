<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    protected $fillable = [
        'ride_request_id','driver_user_id','client_user_id','status','last_message_id'
    ];

    public function messages(){ return $this->hasMany(ConversationMessage::class); }
    public function participants(){ return $this->hasMany(ConversationParticipant::class); }

    public function scopeForPair($q, int $driverId, int $clientId) {
        return $q->where('driver_user_id',$driverId)->where('client_user_id',$clientId);
    }
}
