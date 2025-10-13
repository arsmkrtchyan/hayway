<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TripStopRequest extends Model
{
    protected $fillable = [
        'conversation_id','trip_id','requester_id','status',
        'name','addr','lat','lng',
        'old_duration_sec','new_duration_sec','old_order','new_order',
        'decided_by','decided_at','request_message_id','result_message_id',
    ];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'old_order' => 'array',
        'new_order' => 'array',
    ];

    public function conversation(){ return $this->belongsTo(Conversation::class); }
    public function trip(){ return $this->belongsTo(Trip::class); }
    public function requester(){ return $this->belongsTo(User::class, 'requester_id'); }
    public function decider(){ return $this->belongsTo(User::class, 'decided_by'); }
}
