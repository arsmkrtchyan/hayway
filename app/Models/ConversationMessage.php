<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConversationMessage extends Model
{
    protected $fillable = [
        'conversation_id','sender_id','client_mid','type','body',
        'attachment_path','attachment_mime','attachment_size','meta','edited_at','deleted_at'
    ];
    protected $casts = ['edited_at'=>'datetime','deleted_at'=>'datetime','meta'=>'array'];

    public function conversation(){ return $this->belongsTo(Conversation::class); }
    public function sender(){ return $this->belongsTo(User::class,'sender_id'); }
}
