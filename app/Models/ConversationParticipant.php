<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConversationParticipant extends Model
{
    protected $fillable = [
        'conversation_id','user_id','role',
        'last_read_message_id','last_seen_at','typing_until',
    ];
    protected $casts = ['last_seen_at'=>'datetime','typing_until'=>'datetime'];

    public function conversation(){ return $this->belongsTo(Conversation::class); }
    public function user(){ return $this->belongsTo(User::class); }
}
