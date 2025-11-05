<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification as DBN;
use Illuminate\Support\Arr;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class NotificationsController extends Controller
{
    public function state(Request $r)
    {
        $u = $r->user(); abort_if(!$u, 401);

        $rows = $u->notifications()->latest()->limit(50)->get();

        $items = $rows->map(function(DBN $n){
            $data = $n->data;
            if (!is_array($data)) {
                $data = is_string($data) ? (json_decode($data, true) ?: []) : [];
            }
            return [
                'id'         => $n->id,
                'type'       => Arr::get($data, 'type', 'info'),
                'title'      => Arr::get($data, 'title', 'Տեղեկացում'),
                'body'       => Arr::get($data, 'body'),
                'link'       => Arr::get($data, 'link'),
                'created_at' => optional($n->created_at)->toIso8601String(),
                'unread'     => $n->read_at === null,
            ];
        });

        return response()->json([
            'unread_count' => $u->unreadNotifications()->count(),
            'items'        => $items,
        ]);
    }

    public function read(Request $r)
    {
        $u = $r->user(); abort_if(!$u, 401);
        $ids = (array) $r->input('ids', []);
        if ($ids) {
            DBN::whereIn('id', $ids)
               ->where('notifiable_id', $u->id)
               ->update(['read_at' => now()]);
        }
        return response()->json(['ok' => true]);
    }

    public function stream(Request $r)
    {
        $u = $r->user(); abort_if(!$u, 401);
        $since = now();

        $resp = new StreamedResponse(function() use ($u, &$since) {
            @ob_end_flush(); @ob_implicit_flush(true);
            for ($i=0; $i<60; $i++) {
                $new = $u->notifications()->where('created_at', '>', $since)
                    ->latest()->limit(10)->get();

                foreach ($new as $n) {
                    $data = $n->data;
                    if (!is_array($data)) {
                        $data = is_string($data) ? (json_decode($data, true) ?: []) : [];
                    }
                    $payload = [
                        'id'         => $n->id,
                        'type'       => Arr::get($data, 'type', 'info'),
                        'title'      => Arr::get($data, 'title', 'Տեղեկացում'),
                        'body'       => Arr::get($data, 'body'),
                        'link'       => Arr::get($data, 'link'),
                        'created_at' => optional($n->created_at)->toIso8601String(),
                    ];
                    echo "data: ".json_encode($payload)."\n\n";
                    $since = $n->created_at;
                }
                echo ": keepalive\n\n";
                flush();
                sleep(3);
            }
        });

        $resp->headers->set('Content-Type', 'text/event-stream');
        $resp->headers->set('Cache-Control', 'no-cache');
        $resp->headers->set('X-Accel-Buffering', 'no');

        return $resp;
    }
}
