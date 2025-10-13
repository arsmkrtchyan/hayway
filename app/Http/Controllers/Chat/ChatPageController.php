<?php

// app/Http/Controllers/Chat/ChatPageController.php
namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Models\{Conversation, ConversationMessage, ConversationParticipant};
use Illuminate\Http\Request;
use Inertia\Inertia;

class ChatPageController extends Controller
{
    public function index(Request $r) {
        $u = $r->user();
        $items = Conversation::query()
            ->where(fn($q)=>$q->where('driver_user_id',$u->id)->orWhere('client_user_id',$u->id))
            ->with(['messages'=>fn($q)=>$q->latest()->limit(1)])
            ->latest('updated_at')
            ->paginate(30)
            ->through(function($c) use ($u){
                $meIsDriver = $c->driver_user_id === $u->id;
                $otherId = $meIsDriver ? $c->client_user_id : $c->driver_user_id;
                $mePart = $c->participants->firstWhere('user_id',$u->id)
                    ?: ConversationParticipant::where('conversation_id',$c->id)->where('user_id',$u->id)->first();
                $otherPart = $c->participants->firstWhere('user_id',$otherId)
                    ?: ConversationParticipant::where('conversation_id',$c->id)->where('user_id',$otherId)->first();

                $last = $c->messages->first();
                $unread = ConversationMessage::where('conversation_id',$c->id)
                    ->when($mePart?->last_read_message_id, fn($q,$rid)=>$q->where('id','>', $rid))
                    ->where('sender_id','!=',$u->id)
                    ->count();

                $online = $otherPart && optional($otherPart->last_seen_at)->gt(now()->subSeconds(45));

                return [
                    'id'=>$c->id,
                    'ride_request_id'=>$c->ride_request_id,
                    'trip_id'=>$c->trip_id,
                    'status'=>$c->status,
                    'last_message'=> $last ? [
                        'id'=>$last->id,'body'=>$last->body,'created_at'=>$last->created_at->toIso8601String()
                    ] : null,
                    'unread'=>$unread,
                    'online'=>$online ? true:false,
                ];
            });

        return Inertia::render('Chat/Index', ['items'=>$items]);
    }

    public function show(Request $r, Conversation $conversation) {
        $this->authorize('access', $conversation);
        $u = $r->user();

        $me = $conversation->participants()->where('user_id',$u->id)->first();
        $otherId = $conversation->driver_user_id === $u->id ? $conversation->client_user_id : $conversation->driver_user_id;
        $other = $conversation->participants()->where('user_id',$otherId)->first();

        $messages = $conversation->messages()
            ->latest()->limit(30)->get()->sortBy('id')->values()
            ->map(fn($m)=>[
                'id'=>$m->id, 'mine'=>$m->sender_id===$u->id, 'body'=>$m->body,
                'attachment'=> $m->attachment_path ? [
                    'url'=>route('storage.public', ['path' => $m->attachment_path]) ?? asset('storage/'.$m->attachment_path),
                    'mime'=>$m->attachment_mime,'size'=>$m->attachment_size
                ] : null,
                'created_at'=>$m->created_at->toIso8601String()
            ]);

        return Inertia::render('Chat/Room', [
            'conversation'=>[
                'id'=>$conversation->id,'status'=>$conversation->status,'trip_id'=>$conversation->trip_id
            ],
            'me'=>['last_read_id'=>$me?->last_read_message_id],
            'peer'=>[
                'user_id'=>$otherId,
                'online'=> $other && optional($other->last_seen_at)->gt(now()->subSeconds(45)),
            ],
            'initialMessages'=>$messages,
        ]);
    }
}

