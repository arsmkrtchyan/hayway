<?php
// App/Http/Controllers/Api/NotificationsController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification as DBN;
use Symfony\Component\HttpFoundation\StreamedResponse;

class NotificationsController extends Controller
{
    public function state(Request $r){
        $u = $r->user(); abort_if(!$u,401);
        $rows = $u->notifications()->latest()->limit(50)->get();
        return response()->json([
            'unread_count' => $u->unreadNotifications()->count(),
            'items' => $rows->map(fn(DBN $n)=>[
                'id' => $n->id,
                'type' => $n->data['type'] ?? 'info',
                'title'=> $n->data['title'] ?? 'Տեղեկացում',
                'body' => $n->data['body'] ?? null,
                'link' => $n->data['link'] ?? null,
                'created_at' => $n->created_at->toIso8601String(),
                'unread' => $n->read_at === null,
            ])->all(),
        ]);
    }

    public function read(Request $r){
        $u = $r->user(); abort_if(!$u,401);
        $ids = (array) ($r->input('ids') ?? []);
        if ($ids){
            DBN::whereIn('id',$ids)->where('notifiable_id',$u->id)->update(['read_at'=>now()]);
        }
        return response()->json(['ok'=>true]);
    }

    public function stream(Request $r){
        $u = $r->user(); abort_if(!$u,401);
        $since = now();
        $resp = new StreamedResponse(function() use($u,&$since){
            @ob_end_flush(); @ob_implicit_flush(true);
            for ($i=0; $i<60; $i++){
                $new = $u->notifications()
                    ->where('created_at','>',$since)
                    ->latest()->limit(10)->get();
                foreach ($new as $n){
                    $payload = [
                        'id'=>$n->id,
                        'type'=>$n->data['type'] ?? 'info',
                        'title'=>$n->data['title'] ?? 'Տեղեկացում',
                        'body'=>$n->data['body'] ?? null,
                        'link'=>$n->data['link'] ?? null,
                        'created_at'=>$n->created_at->toIso8601String(),
                    ];
                    echo "data: ".json_encode($payload)."\n\n";
                    $since = $n->created_at;
                }
                echo ": keepalive\n\n";
                flush();
                sleep(3);
            }
        });
        $resp->headers->set('Content-Type','text/event-stream');
        $resp->headers->set('Cache-Control','no-cache');
        $resp->headers->set('X-Accel-Buffering','no'); // для nginx
        return $resp;
    }
}
