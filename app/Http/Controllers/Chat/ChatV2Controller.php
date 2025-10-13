<?php
namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Models\{
    Conversation,
    ConversationMessage,
    ConversationParticipant,
    ChatUpload,
    RideRequest,
    Trip,
    User,
    Vehicle
};
use App\Models\TripStop;
use App\Models\TripStopRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class ChatV2Controller extends Controller
{
    /* ========= helpers ========= */

    private function otherId(Conversation $c, int $meId): int
    {
        return $c->driver_user_id === $meId ? (int)$c->client_user_id : (int)$c->driver_user_id;
    }

    private function packMessage(ConversationMessage $m, int $meId): array
    {
        $mine = $m->sender_id === $meId;
        // системные карточки — всегда 'peer'
        $forcePeer = in_array($m->type, ['trip', 'system', 'stop_request', 'trip_update'], true);
        $from = $forcePeer ? 'peer' : ($mine ? 'me' : 'peer');

        $base = [
            'id' => $m->id,
            'from' => $from,
            'type' => $m->type,
            'at' => optional($m->created_at)->format('H:i'),
        ];

        if (in_array($m->type, ['text', 'system'], true)) {
            $base['text'] = (string)($m->body ?? '');
        } elseif ($m->type === 'image') {
            $base['url'] = $m->attachment_path ? asset('storage/' . $m->attachment_path) : null;
        } elseif ($m->type === 'trip') {
            $base['trip'] = $m->meta ?? [];
        } elseif ($m->type === 'location') {
            $lat = (float)($m->meta['lat'] ?? 0);
            $lng = (float)($m->meta['lng'] ?? 0);
            $addr = (string)($m->meta['addr'] ?? '');
            $base['loc'] = [
                'lat' => $lat, 'lng' => $lng, 'addr' => $addr,
                'gmap' => "https://www.google.com/maps/search/?api=1&query={$lat},{$lng}",
                'osmImg' => "https://staticmap.openstreetmap.de/staticmap.php?center={$lat},{$lng}&zoom=16&size=640x320&markers={$lat},{$lng},lightblue1",
            ];
        } elseif ($m->type === 'stop_request') {
            $base['stopRequest'] = $m->meta ?? [];
        } elseif ($m->type === 'trip_update') {
            $base['tripUpdate'] = $m->meta ?? [];
        }
        return $base;
    }

    private function ensureParticipant(Conversation $c, int $userId, ?string $role = null): ConversationParticipant
    {
        return ConversationParticipant::firstOrCreate(
            ['conversation_id' => $c->id, 'user_id' => $userId],
            ['role' => $role]
        );
    }

    private function tripSnapshot(Trip $t): array
    {
        $driverUser = $t->assigned_driver_id ? User::find($t->assigned_driver_id) : $t->user;
        $vehicle = $t->vehicle ?: Vehicle::find($t->vehicle_id);
        return [
            'id' => (int)$t->id,
            'from' => (string)$t->from_addr,
            'to' => (string)$t->to_addr,
            'date' => optional($t->departure_at)->format('Y-m-d'),
            'time' => optional($t->departure_at)->format('H:i'),
            'priceAMD' => (int)$t->price_amd,
            'seatsTotal' => (int)$t->seats_total,
            'seatsTaken' => (int)$t->seats_taken,
            'vehicle' => [
                'brand' => $vehicle?->brand, 'model' => $vehicle?->model,
                'plate' => $vehicle?->plate, 'color' => $vehicle?->color,
            ],
            'driver' => [
                'name' => $driverUser?->name,
                'avatar' => $driverUser?->avatar_path ? asset('storage/' . $driverUser->avatar_path) : null,
                'rating' => (float)($driverUser?->rating ?? 5.0),
            ],
        ];
    }

    private function osrmRoute(string $profile, array $pts): array
    {
        $coords = collect($pts)->map(fn($p) => $p['lng'] . ',' . $p['lat'])->implode(';');
        $url = "https://router.project-osrm.org/route/v1/{$profile}/{$coords}?overview=full&geometries=geojson&steps=false&alternatives=false";
        $res = Http::timeout(15)->get($url);
        if (!$res->ok()) throw new \RuntimeException('OSRM route failed');
        $r = $res->json();
        $route = $r['routes'][0] ?? null;
        if (!$route) throw new \RuntimeException('No OSRM route');
        return [
            'duration_sec' => (int)round($route['duration'] ?? 0),
            'distance_m' => (int)round($route['distance'] ?? 0),
            'geometry' => $route['geometry'] ?? null,
        ];
    }

    private function osrmTable(string $profile, array $pts): array
    {
        $coords = collect($pts)->map(fn($p) => $p['lng'] . ',' . $p['lat'])->implode(';');
        $url = "https://router.project-osrm.org/table/v1/{$profile}/{$coords}?annotations=duration";
        $res = Http::timeout(15)->get($url);
        if (!$res->ok()) throw new \RuntimeException('OSRM table failed');
        $r = $res->json();
        return $r['durations'] ?? [];
    }

    // Held–Karp (фиксированные start=0 и end=n-1)
    private function shortestOrderFixedEnds(array $dur): array
    {
        $n = count($dur);
        if ($n <= 2) return range(0, $n - 1);

        $start = 0;
        $end = $n - 1;
        $nodes = range(1, $n - 2);

        $size = 1 << count($nodes);
        $DP = array_fill(0, $size, array_fill(0, count($nodes), INF));
        $parent = array_fill(0, $size, array_fill(0, count($nodes), -1));

        foreach ($nodes as $idx => $node) {
            $DP[1 << $idx][$idx] = $dur[$start][$node];
        }

        for ($mask = 0; $mask < $size; $mask++) {
            for ($i = 0; $i < count($nodes); $i++) {
                if (!($mask & (1 << $i))) continue;
                $cost = $DP[$mask][$i];
                if ($cost === INF) continue;

                for ($j = 0; $j < count($nodes); $j++) {
                    if ($mask & (1 << $j)) continue;
                    $newMask = $mask | (1 << $j);
                    $cand = $cost + $dur[$nodes[$i]][$nodes[$j]];
                    if ($cand < $DP[$newMask][$j]) {
                        $DP[$newMask][$j] = $cand;
                        $parent[$newMask][$j] = $i;
                    }
                }
            }
        }

        $fullMask = $size - 1;
        $bestCost = INF;
        $bestLast = -1;
        for ($i = 0; $i < count($nodes); $i++) {
            $cand = $DP[$fullMask][$i] + $dur[$nodes[$i]][$end];
            if ($cand < $bestCost) {
                $bestCost = $cand;
                $bestLast = $i;
            }
        }

        $order = [$end];
        $mask = $fullMask;
        $cur = $bestLast;
        while ($cur != -1) {
            $order[] = $nodes[$cur];
            $prev = $parent[$mask][$cur];
            $mask ^= (1 << $cur);
            $cur = $prev;
        }
        $order[] = $start;
        return array_reverse($order);
    }

    private function pointsFromTrip(Trip $trip): array
    {
        $pts = [];
        $pts[] = ['type' => 'from', 'lat' => (float)$trip->from_lat, 'lng' => (float)$trip->from_lng, 'name' => 'Սկիզբ', 'addr' => (string)$trip->from_addr];
        foreach ($trip->stops()->orderBy('position')->get() as $s) {
            $pts[] = ['type' => 'stop', 'lat' => (float)$s->lat, 'lng' => (float)$s->lng, 'name' => $s->name, 'addr' => $s->addr];
        }
        $pts[] = ['type' => 'to', 'lat' => (float)$trip->to_lat, 'lng' => (float)$trip->to_lng, 'name' => 'Վերջ', 'addr' => (string)$trip->to_addr];
        return $pts;
    }

    private function reorderStopsPersist(Trip $trip, array $orderedPoints): void
    {
        $stops = [];
        foreach ($orderedPoints as $p) {
            if (($p['type'] ?? null) === 'stop') {
                $stops[] = [
                    'lat' => $p['lat'], 'lng' => $p['lng'],
                    'name' => $p['name'] ?? null, 'addr' => $p['addr'] ?? null,
                ];
            }
        }
        DB::transaction(function () use ($trip, $stops) {
            $trip->stops()->delete();
            $pos = 1;
            foreach ($stops as $s) {
                $trip->stops()->create([
                    'position' => $pos++,
                    'name' => $s['name'] ?? null,
                    'addr' => $s['addr'] ?? null,
                    'lat' => $s['lat'],
                    'lng' => $s['lng'],
                ]);
            }
        });
    }

    /* ========= stop requests ========= */

    public function requestStop(Request $r, Conversation $conversation)
    {
        Gate::authorize('access', $conversation);
        $user = $r->user();

        if ($conversation->driver_user_id === $user->id) {
            return response()->json(['message' => 'Только пассажир может запросить остановку'], 403);
        }

        $rideReqId = $conversation->ride_request_id;
        if (!$rideReqId) return response()->json(['message' => 'Нет контекста trip для диалога'], 422);
        $rideReq = RideRequest::findOrFail($rideReqId);
        $trip = Trip::with('stops')->findOrFail($rideReq->trip_id);

        $data = $r->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'addr' => ['nullable', 'string', 'max:255'],
            'name' => ['nullable', 'string', 'max:120'],
        ]);

        $place = [
            'type' => 'stop',
            'lat' => round((float)$data['lat'], 6),
            'lng' => round((float)$data['lng'], 6),
            'addr' => $data['addr'] ?? null,
            'name' => $data['name'] ?? null,
        ];

        $oldPts = $this->pointsFromTrip($trip);
        $profile = 'driving';

        $oldRoute = $this->osrmRoute($profile, array_map(fn($p) => ['lng' => $p['lng'], 'lat' => $p['lat']], $oldPts));

        $mid = $oldPts;
        array_splice($mid, count($mid) - 1, 0, [$place]); // перед концом
        $coords = array_map(fn($p) => ['lng' => $p['lng'], 'lat' => $p['lat']], $mid);
        $dur = $this->osrmTable($profile, $coords);
        $orderIdx = $this->shortestOrderFixedEnds($dur);

        $newPts = array_map(fn($i) => $mid[$i], $orderIdx);
        $newRoute = $this->osrmRoute($profile, array_map(fn($p) => ['lng' => $p['lng'], 'lat' => $p['lat']], $newPts));

        $preview = [
            'old_sec' => $oldRoute['duration_sec'],
            'new_sec' => $newRoute['duration_sec'],
            'delta_sec' => $newRoute['duration_sec'] - $oldRoute['duration_sec'],
            'old_order' => $oldPts,
            'new_order' => $newPts,
            'route' => $newRoute,
        ];

        $req = TripStopRequest::create([
            'conversation_id' => $conversation->id,
            'trip_id' => $trip->id,
            'requester_id' => $user->id,
            'status' => 'pending',
            'name' => $place['name'] ?? null,
            'addr' => $place['addr'] ?? null,
            'lat' => $place['lat'],
            'lng' => $place['lng'],
            'old_duration_sec' => $preview['old_sec'],
            'new_duration_sec' => $preview['new_sec'],
            'old_order' => $preview['old_order'],
            'new_order' => $preview['new_order'],
        ]);

        $msg = ConversationMessage::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'client_mid' => 'stopreq-' . $req->id,
            'type' => 'stop_request',
            'meta' => [
                'id' => $req->id,
                'place' => ['lat' => $place['lat'], 'lng' => $place['lng'], 'addr' => $place['addr'], 'name' => $place['name']],
                'preview' => [
                    'old_sec' => $preview['old_sec'],
                    'new_sec' => $preview['new_sec'],
                    'delta_sec' => $preview['delta_sec'],
                    'old_order' => $preview['old_order'],
                    'new_order' => $preview['new_order'],
                    'route' => $preview['route'],
                ],
            ],
        ]);
        $req->update(['request_message_id' => $msg->id]);

        $conversation->update(['last_message_id' => $msg->id, 'updated_at' => now()]);

        return response()->json([
            'ok' => true,
            'request_id' => $req->id,
            'message' => $this->packMessage($msg, $user->id),
        ]);
    }

    public function acceptStop(Request $r, Conversation $conversation, TripStopRequest $req)
    {
        Gate::authorize('access', $conversation);
        $user = $r->user();
        if ($conversation->driver_user_id !== $user->id) {
            return response()->json(['message' => 'Только водитель может принять'], 403);
        }
        if ($req->conversation_id !== $conversation->id) abort(404);
        if ($req->status !== 'pending') return response()->json(['message' => 'Уже решено'], 409);

        $trip = Trip::with('stops')->findOrFail($req->trip_id);

        DB::transaction(function () use ($req, $trip) {
            $ordered = $req->new_order ?: [];
            $this->reorderStopsPersist($trip, $ordered);

            $req->update([
                'status' => 'accepted',
                'decided_by' => auth()->id(),
                'decided_at' => now(),
            ]);
        });

        $meta = [
            'reason' => 'stop_accepted',
            'request_id' => $req->id,
            'place' => ['lat' => $req->lat, 'lng' => $req->lng, 'addr' => $req->addr, 'name' => $req->name],
            'durations' => [
                'old_sec' => $req->old_duration_sec,
                'new_sec' => $req->new_duration_sec,
                'delta_sec' => ($req->new_duration_sec - $req->old_duration_sec),
            ],
            'new_order' => $req->new_order,
        ];

        try {
            $coords = array_map(fn($p) => ['lng' => $p['lng'], 'lat' => $p['lat']], $req->new_order ?? []);
            if (count($coords) >= 2) {
                $route = $this->osrmRoute('driving', $coords);
                $meta['route'] = $route;
            }
        } catch (\Throwable $e) {
        }

        $msg = ConversationMessage::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'client_mid' => 'tripupd-stop-' . $req->id,
            'type' => 'trip_update',
            'meta' => $meta,
        ]);
        $req->update(['result_message_id' => $msg->id]);

        $conversation->update(['last_message_id' => $msg->id, 'updated_at' => now()]);

        return response()->json(['ok' => true, 'message' => $this->packMessage($msg, $user->id)]);
    }

    public function declineStop(Request $r, Conversation $conversation, TripStopRequest $req)
    {
        Gate::authorize('access', $conversation);
        $user = $r->user();
        if ($conversation->driver_user_id !== $user->id) {
            return response()->json(['message' => 'Только водитель может отклонить'], 403);
        }
        if ($req->conversation_id !== $conversation->id) abort(404);
        if ($req->status !== 'pending') return response()->json(['message' => 'Уже решено'], 409);

        $req->update([
            'status' => 'declined',
            'decided_by' => $user->id,
            'decided_at' => now(),
        ]);

        $msg = ConversationMessage::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'client_mid' => 'stopdecl-' . $req->id,
            'type' => 'system',
            'body' => 'Վարորդը մերժեց առաջարկված կանգառը',
        ]);
        $conversation->update(['last_message_id' => $msg->id, 'updated_at' => now()]);

        return response()->json(['ok' => true, 'message' => $this->packMessage($msg, $user->id)]);
    }

    /* ========= public API ========= */

    // Список контактов
    public function contacts(Request $r)
    {
        $u = $r->user();

        $items = Conversation::query()
            ->where(fn($q) => $q->where('driver_user_id', $u->id)->orWhere('client_user_id', $u->id))
            ->latest('updated_at')
            ->with(['participants'])
            ->limit(200)
            ->get()
            ->map(function (Conversation $c) use ($u) {
                $otherId = $this->otherId($c, $u->id);
                $mePart = $c->participants->firstWhere('user_id', $u->id)
                    ?: ConversationParticipant::where('conversation_id', $c->id)->where('user_id', $u->id)->first();
                $otherPart = $c->participants->firstWhere('user_id', $otherId)
                    ?: ConversationParticipant::where('conversation_id', $c->id)->where('user_id', $otherId)->first();

                $unread = ConversationMessage::where('conversation_id', $c->id)
                    ->when($mePart?->last_read_message_id, fn($q, $rid) => $q->where('id', '>', $rid))
                    ->where('sender_id', '!=', $u->id)->count();

                $other = User::find($otherId);
                $status = optional($otherPart?->last_seen_at)->gt(now()->subSeconds(45)) ? 'online' : 'offline';

                return [
                    'id' => $c->id,
                    'name' => $other?->name ?? 'User ' . $otherId,
                    'note' => $c->driver_user_id === $u->id ? 'Ուղևոր' : 'Վարորդ',
                    'avatar' => $other?->avatar_path ? asset('storage/' . $other->avatar_path) : null,
                    'status' => $status,
                    'unread' => $unread,
                ];
            })->values();

        return response()->json(['items' => $items]);
    }

    // Long-poll sync: новые сообщения + peer state
    public function sync(Request $r, Conversation $conversation) {
        Gate::authorize('access', $conversation);
        $u = $r->user();
        $sinceId = (int)$r->query('since_id', 0);
        $timeout = max(3, min(25, (int)$r->query('timeout', 20)));
        $pollEveryMs = 300;

        $mePart    = $this->ensureParticipant($conversation, $u->id, $conversation->driver_user_id===$u->id?'driver':'client');
        $peerId    = $this->otherId($conversation, $u->id);
        $peerPart  = $this->ensureParticipant($conversation, $peerId);

        $startTyping = (bool) optional($peerPart->typing_until)->gt(now());
        $deadline = microtime(true) + $timeout;

        $outMessages = [];
        $peerOnline  = false;
        $peerTyping  = $startTyping;

        // опорное сообщение для границы по created_at
        $pivot = null;
        if ($sinceId > 0) {
            $pivot = ConversationMessage::select('id','created_at')
                ->where('conversation_id',$conversation->id)
                ->where('id',$sinceId)->first();
        }

        do {
            $newQ = ConversationMessage::where('conversation_id',$conversation->id);

            if ($pivot) {
                $newQ->where(function($q) use ($pivot){
                    $q->where('created_at','>',$pivot->created_at)
                        ->orWhere(function($qq) use ($pivot){
                            $qq->where('created_at','=',$pivot->created_at)
                                ->where('id','>',$pivot->id);
                        });
                });
            } elseif ($sinceId > 0) {
                // запасной путь если pivot не нашли
                $newQ->where('id','>', $sinceId);
            }

            $new = $newQ->orderBy('created_at','asc')->orderBy('id','asc')->limit(200)->get();

            if ($new->isNotEmpty()) {
                $outMessages = $new->map(fn($m)=>$this->packMessage($m, $u->id))->values()->all();

                $last = $new->last();              // ✔ корректно
                $sinceId = $last->id;
                $pivot   = $last;                  // ✔ просто сохраняем модель как новую границу
                break;
            }

            // peer state
            $peerPart->refresh();
            $peerOnline = optional($peerPart->last_seen_at)->gt(now()->subSeconds(45));
            $peerTypingNow = optional($peerPart->typing_until)->gt(now());
            if ($peerTypingNow !== $startTyping) {
                $peerTyping = $peerTypingNow;
                break;
            }

            usleep($pollEveryMs * 1000);
        } while (microtime(true) < $deadline);

        return response()->json([
            'messages' => $outMessages,
            'peer'     => ['online'=>$peerOnline, 'typing'=>$peerTyping],
            'read'     => [
                'me_last_read_id'=>$mePart->last_read_message_id,
                'peer_last_read_id'=>$peerPart->last_read_message_id,
            ],
        ]);
    }


    // История вверх по времени: выдаём массив в возрастающем порядке created_at
    public function history(Request $r, Conversation $conversation)
    {
        Gate::authorize('access', $conversation);
        $u = $r->user();
        $beforeId = (int)$r->query('before_id', 0);
        $limit = min(100, max(1, (int)$r->query('limit', 30)));

        $pivot = null;
        if ($beforeId > 0) {
            $pivot = ConversationMessage::select('id', 'created_at')
                ->where('conversation_id', $conversation->id)
                ->where('id', $beforeId)->first();
        }

        $q = ConversationMessage::where('conversation_id', $conversation->id);

        if ($pivot) {
            // берём строго «старше» по created_at, при равенстве — по id
            $q->where(function ($qq) use ($pivot) {
                $qq->where('created_at', '<', $pivot->created_at)
                    ->orWhere(function ($qqq) use ($pivot) {
                        $qqq->where('created_at', '=', $pivot->created_at)
                            ->where('id', '<', $pivot->id);
                    });
            });
        }

        // грузим «вниз» и потом переворачиваем в возрастающий порядок
        $chunk = $q->orderBy('created_at', 'desc')->orderBy('id', 'desc')->limit($limit)->get();

        // стабильно сортируем по (created_at, id) ASC
        $list = $chunk->sortBy(fn($m) => [$m->created_at?->timestamp ?? 0, $m->id])->values();

        return response()->json([
            'messages' => $list->map(fn($m) => $this->packMessage($m, $u->id))->values()
        ]);
    }

    public function send(Request $r, Conversation $conversation)
    {
        Gate::authorize('access', $conversation);
        $u = $r->user();

        $data = $r->validate([
            'client_mid' => ['required', 'string', 'max:100'],
            'type' => ['required', 'in:text,image,location'],
            'text' => ['nullable', 'string', 'max:4000'],
            'upload_id' => ['nullable', 'integer', 'exists:chat_uploads,id'],
            'lat' => ['required_if:type,location', 'numeric', 'between:-90,90'],
            'lng' => ['required_if:type,location', 'numeric', 'between:-180,180'],
            'addr' => ['nullable', 'string', 'max:400'],
        ]);

        // идемпотентность
        $exists = ConversationMessage::where([
            'conversation_id' => $conversation->id,
            'sender_id' => $u->id,
            'client_mid' => $data['client_mid']
        ])->first();
        if ($exists) return response()->json(['ok' => true, 'message_id' => $exists->id]);

        $msg = new ConversationMessage([
            'conversation_id' => $conversation->id,
            'sender_id' => $u->id,
            'client_mid' => $data['client_mid'],
            'type' => $data['type'],
        ]);

        if ($data['type'] === 'text') {
            $msg->body = trim((string)($data['text'] ?? ''));
        } elseif ($data['type'] === 'image') {
            $att = ChatUpload::where('id', $data['upload_id'] ?? 0)
                ->where('user_id', $u->id)
                ->where(function ($q) {
                    $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
                })
                ->firstOrFail();
            $msg->attachment_path = $att->path;
            $msg->attachment_mime = $att->mime;
            $msg->attachment_size = $att->size;
        } elseif ($data['type'] === 'location') {
            $msg->meta = [
                'lat' => round((float)$data['lat'], 6),
                'lng' => round((float)$data['lng'], 6),
                'addr' => (string)($data['addr'] ?? ''),
            ];
        }

        $msg->save();
        $conversation->update(['last_message_id' => $msg->id, 'updated_at' => now()]);

        return response()->json([
            'ok' => true,
            'message' => $this->packMessage($msg, $u->id),
        ]);
    }

    public function read(Request $r, Conversation $conversation)
    {
        Gate::authorize('access', $conversation);
        $lastVisibleId = (int)$r->input('last_visible_id', 0);
        if ($lastVisibleId <= 0) return response()->json(['ok' => true]);
        $u = $r->user();

        $me = $this->ensureParticipant($conversation, $u->id, $conversation->driver_user_id === $u->id ? 'driver' : 'client');
        if (is_null($me->last_read_message_id) || $lastVisibleId > $me->last_read_message_id) {
            $me->last_read_message_id = $lastVisibleId;
            $me->save();
        }
        return response()->json(['ok' => true]);
    }

    public function typing(Request $r, Conversation $conversation)
    {
        Gate::authorize('access', $conversation);
        $is = (bool)$r->boolean('is_typing');
        $u = $r->user();
        $me = $this->ensureParticipant($conversation, $u->id, $conversation->driver_user_id === $u->id ? 'driver' : 'client');
        $me->typing_until = $is ? now()->addSeconds(8) : null;
        $me->save();
        return response()->json(['ok' => true]);
    }

    public function heartbeat(Request $r, Conversation $conversation)
    {
        Gate::authorize('access', $conversation);
        $u = $r->user();
        $this->ensureParticipant($conversation, $u->id, $conversation->driver_user_id === $u->id ? 'driver' : 'client')
            ->update(['last_seen_at' => now()]);
        return response()->json(['ok' => true]);
    }

    public function upload(Request $r)
    {
        $r->validate([
            'file' => ['required', 'file', 'max:8192', 'mimes:jpg,jpeg,png,webp,gif,pdf,txt,doc,docx']
        ]);
        $f = $r->file('file');
        $path = $f->store('chat', 'public');
        $up = ChatUpload::create([
            'user_id' => $r->user()->id,
            'path' => $path,
            'mime' => $f->getClientMimeType(),
            'size' => $f->getSize(),
            'expires_at' => now()->addMinutes(30),
        ]);
        return response()->json([
            'upload_id' => $up->id,
            'url' => asset('storage/' . $path),
            'mime' => $up->mime,
            'size' => $up->size
        ]);
    }

    // открывает диалог по заявке и пушит trip-карточку (идемпотентно)
    public function openByRequest(Request $r, RideRequest $request)
    {
        $user = $r->user();
        $trip = Trip::with(['vehicle', 'user'])->findOrFail($request->trip_id);

        $driverId = $trip->assigned_driver_id ?: $trip->user_id;
        $clientId = $request->user_id;
        if (!in_array($user->id, [$driverId, $clientId])) abort(403);

        $conv = Conversation::firstOrCreate(
            ['driver_user_id' => $driverId, 'client_user_id' => $clientId],
            ['status' => 'open', 'ride_request_id' => $request->id]
        );

        $this->ensureParticipant($conv, $driverId, 'driver');
        $this->ensureParticipant($conv, $clientId, 'client');

        $sysMid = 'sys-req-' . $request->id;
        $tripMid = 'trip-req-' . $request->id;

        ConversationMessage::firstOrCreate(
            ['conversation_id' => $conv->id, 'client_mid' => $sysMid],
            ['sender_id' => $user->id, 'type' => 'system', 'body' => 'Զրույցը ակտիվ է']
        );

        $meta = $this->tripSnapshot($trip);
        $card = ConversationMessage::firstOrCreate(
            ['conversation_id' => $conv->id, 'client_mid' => $tripMid],
            ['sender_id' => $user->id, 'type' => 'trip', 'meta' => $meta]
        );

        $conv->update([
            'last_message_id' => $card->id,
            'ride_request_id' => $request->id,
            'updated_at' => now(),
        ]);

        return response()->json([
            'conversation_id' => $conv->id,
            'message_id' => $card->id,
            'trip' => $meta
        ]);
    }
}
