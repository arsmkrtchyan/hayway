<?php

// app/Http/Controllers/Chat/ChatApiController.php
namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Models\{Conversation, ConversationMessage, ConversationParticipant, ChatUpload};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class ChatApiController extends Controller
{
    public function list(Request $r) {
        $u = $r->user();
        $count = Conversation::where(fn($q)=>$q->where('driver_user_id',$u->id)->orWhere('client_user_id',$u->id))
            ->count();
        return response()->json(['count'=>$count]);
    }

    public function poll(Request $r, Conversation $conversation) {
        Gate::authorize('access', $conversation);
        $u = $r->user();
        $sinceId = (int) $r->query('since_id', 0);

        $messages = ConversationMessage::where('conversation_id',$conversation->id)
            ->when($sinceId>0, fn($q)=>$q->where('id','>',$sinceId))
            ->orderBy('id')
            ->limit(200)
            ->get()
            ->map(fn($m)=>[
                'id'=>$m->id,'mine'=>$m->sender_id===$u->id,'body'=>$m->body,
                'attachment'=>$m->attachment_path ? [
                    'url'=>asset('storage/'.$m->attachment_path),
                    'mime'=>$m->attachment_mime,'size'=>$m->attachment_size
                ] : null,
                'created_at'=>$m->created_at->toIso8601String()
            ])->values();

        $me = ConversationParticipant::firstOrCreate(
            ['conversation_id'=>$conversation->id,'user_id'=>$u->id],
            ['role'=> $conversation->driver_user_id===$u->id ? 'driver':'client']
        );
        $otherId = $conversation->driver_user_id === $u->id ? $conversation->client_user_id : $conversation->driver_user_id;
        $other = ConversationParticipant::firstOrCreate(
            ['conversation_id'=>$conversation->id,'user_id'=>$otherId]
        );

        $online = optional($other->last_seen_at)->gt(now()->subSeconds(45));
        $typing = optional($other->typing_until)->gt(now());

        return response()->json([
            'messages'=>$messages,
            'peer'=>['online'=>$online,'typing'=>$typing],
            'read'=>[
                'me_last_read_id'=>$me->last_read_message_id,
                'peer_last_read_id'=>$other->last_read_message_id
            ],
        ]);
    }

    public function history(Request $r, Conversation $conversation){
        Gate::authorize('access', $conversation);
        $beforeId = (int) $r->query('before_id', 0);
        $limit = min(50, (int)$r->query('limit', 30));
        $u = $r->user();

        $q = ConversationMessage::where('conversation_id',$conversation->id);
        if ($beforeId>0) $q->where('id','<',$beforeId);
        $msgs = $q->orderByDesc('id')->limit($limit)->get()->sortBy('id')->values()->map(fn($m)=>[
            'id'=>$m->id,'mine'=>$m->sender_id===$u->id,'body'=>$m->body,
            'attachment'=>$m->attachment_path ? [
                'url'=>asset('storage/'.$m->attachment_path),
                'mime'=>$m->attachment_mime,'size'=>$m->attachment_size
            ] : null,
            'created_at'=>$m->created_at->toIso8601String()
        ]);
        return response()->json(['messages'=>$msgs]);
    }

    public function send(Request $r, Conversation $conversation) {
        Gate::authorize('access', $conversation);
        $u = $r->user();
        $data = $r->validate([
            'client_mid'=>['required','string','max:100'],
            'body'=>['nullable','string','max:4000'],
            'upload_id'=>['nullable','integer','exists:chat_uploads,id'],
        ]);

        // идемпотентность
        $exists = ConversationMessage::where([
            'conversation_id'=>$conversation->id,
            'sender_id'=>$u->id,
            'client_mid'=>$data['client_mid']
        ])->first();
        if ($exists) {
            return response()->json(['ok'=>true,'message_id'=>$exists->id]);
        }

        $att = null;
        if (!empty($data['upload_id'])) {
            $att = ChatUpload::where('id',$data['upload_id'])
                ->where('user_id',$u->id)
                ->where(function($q){ $q->whereNull('expires_at')->orWhere('expires_at','>', now()); })
                ->firstOrFail();
        }

        $msg = new ConversationMessage([
            'conversation_id'=>$conversation->id,
            'sender_id'=>$u->id,
            'client_mid'=>$data['client_mid'],
            'body'=>$data['body'] ?? null,
        ]);
        if ($att) {
            $msg->attachment_path = $att->path;
            $msg->attachment_mime = $att->mime;
            $msg->attachment_size = $att->size;
        }
        $msg->save();

        $conversation->update(['last_message_id'=>$msg->id, 'updated_at'=>now()]);

        return response()->json(['ok'=>true,'message_id'=>$msg->id]);
    }

    public function read(Request $r, Conversation $conversation) {
        Gate::authorize('access', $conversation);
        $lastVisibleId = (int) $r->input('last_visible_id', 0);
        if ($lastVisibleId<=0) return response()->json(['ok'=>true]);
        $u = $r->user();

        $me = ConversationParticipant::firstOrCreate(
            ['conversation_id'=>$conversation->id,'user_id'=>$u->id],
            ['role'=> $conversation->driver_user_id===$u->id ? 'driver':'client']
        );
        if (is_null($me->last_read_message_id) || $lastVisibleId > $me->last_read_message_id) {
            $me->last_read_message_id = $lastVisibleId;
            $me->save();
        }
        return response()->json(['ok'=>true]);
    }

    public function typing(Request $r, Conversation $conversation) {
        Gate::authorize('access', $conversation);
        $is = (bool)$r->boolean('is_typing');
        $u = $r->user();
        $me = ConversationParticipant::firstOrCreate(
            ['conversation_id'=>$conversation->id,'user_id'=>$u->id],
            ['role'=> $conversation->driver_user_id===$u->id ? 'driver':'client']
        );
        $me->typing_until = $is ? now()->addSeconds(8) : null;
        $me->save();
        return response()->json(['ok'=>true]);
    }

    public function heartbeat(Request $r, Conversation $conversation) {
        Gate::authorize('access', $conversation);
        $u = $r->user();
        ConversationParticipant::updateOrCreate(
            ['conversation_id'=>$conversation->id,'user_id'=>$u->id],
            ['last_seen_at'=>now(),'role'=> $conversation->driver_user_id===$u->id ? 'driver':'client']
        );
        return response()->json(['ok'=>true]);
    }

    public function upload(Request $r) {
        $r->validate([
            'file'=>['required','file','max:8192','mimes:jpg,jpeg,png,webp,gif,pdf,txt,doc,docx']
        ]);
        $f = $r->file('file');
        $path = $f->store('chat', 'public');
        $up = ChatUpload::create([
            'user_id'=>$r->user()->id,
            'path'=>$path,
            'mime'=>$f->getClientMimeType(),
            'size'=>$f->getSize(),
            'expires_at'=>now()->addMinutes(30),
        ]);
        return response()->json(['upload_id'=>$up->id, 'url'=>asset('storage/'.$path), 'mime'=>$up->mime, 'size'=>$up->size]);
    }
}
