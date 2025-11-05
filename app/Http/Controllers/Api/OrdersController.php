<?php
//
//namespace App\Http\Controllers\Api;
//
//use App\Http\Controllers\Controller;
//use App\Http\Requests\StoreRiderOrderRequest;
//use App\Http\Resources\RiderOrderResource;
//use App\Models\RiderOrder;
//use Illuminate\Http\Request;
//use Illuminate\Support\Str;
//
//class OrdersController extends Controller
//{
//    /** Создать заказ пассажира */
//    public function store(StoreRiderOrderRequest $req)
//    {
//        $data = $req->validated();
//        $data['client_user_id'] = auth()->id();
//
//        // нормализация текстов для поиска (как в миграции)
//        $data['from_addr_search'] = self::normalize($data['from_addr'] ?? null);
//        $data['to_addr_search']   = self::normalize($data['to_addr']   ?? null);
//
//        $order = RiderOrder::create($data);
//        return (new RiderOrderResource($order))->additional(['ok'=>true]);
//    }
//
//    /** Мои заказы */
//    public function my(Request $r)
//    {
//        $items = RiderOrder::query()
//            ->where('client_user_id', auth()->id())
//            ->orderByDesc('id')
//            ->paginate(20);
//
//        return RiderOrderResource::collection($items)->additional(['ok'=>true]);
//    }
//
//    /** Просмотр одного заказа */
//    public function show(RiderOrder $order)
//    {
//        $this->authorize('view', $order); // опционально, если настроите Policy
//        return (new RiderOrderResource($order))->additional(['ok'=>true]);
//    }
//
//    /** Закрыть/отменить заказ */
//    public function cancel(RiderOrder $order)
//    {
//        $this->authorize('update', $order);
//        if ($order->status !== 'open') {
//            return response()->json(['ok'=>false,'error'=>'Order not open'], 422);
//        }
//        $order->status = 'cancelled';
//        $order->save();
//        return (new RiderOrderResource($order))->additional(['ok'=>true]);
//    }
//
//    private static function normalize(?string $value): ?string
//    {
//        if (!$value) return null;
//        try { $latin = Str::transliterate($value); }
//        catch (\Throwable) { $latin = Str::ascii($value); }
//
//        $collapse = Str::of($latin)->lower()->replaceMatches('/[^a-z0-9]+/u',' ')->squish()->value();
//        return $collapse === '' ? null : $collapse;
//    }
//}


namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RiderOrder;
use App\Support\AddressSearch;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Events\OrderCreated; // ← добавить


class OrdersController extends Controller
{
    public function store(Request $r)
    {
        $u = $r->user(); abort_if(!$u, 401);
        $data = $r->validate([
            'from_lat'=>['nullable','numeric'],'from_lng'=>['nullable','numeric'],'from_addr'=>['nullable','string','max:255'],
            'to_lat'=>['nullable','numeric'],'to_lng'=>['nullable','numeric'],'to_addr'=>['nullable','string','max:255'],
            'when_from'=>['nullable','date'],'when_to'=>['nullable','date','after_or_equal:when_from'],
            'seats'=>['required','integer','min:1','max:8'],
            'payment'=>['nullable', Rule::in(['cash','card'])],
            'desired_price_amd'=>['nullable','integer','min:0'],
        ]);

        $o = new RiderOrder($data);
        $o->client_user_id = $u->id;
        $o->status = 'open';
        $o->from_addr_search = \App\Support\AddressSearch::normalize($o->from_addr);
        $o->to_addr_search   = \App\Support\AddressSearch::normalize($o->to_addr);
        $o->save();

event(new OrderCreated($o));   

        return response()->json(['ok'=>true,'data'=>$o], 201);
    }



    public function my(Request $r)
    {
        $u = $r->user();
        abort_if(!$u, 401);
        $rows = RiderOrder::query()->where('client_user_id', $u->id)->orderByDesc('id')->paginate(20);
        return response()->json($rows);
    }

    public function show(RiderOrder $order)
    {
        $this->authorizeView($order);
        return response()->json(['data' => $order]);
    }

    public function cancel(RiderOrder $order, Request $r)
    {
        $this->authorizeView($order);
        if (!in_array($order->status, ['open', 'matched'])) return response()->json(['error' => 'bad_status'], 422);
        $order->status = 'cancelled';
        $order->save();
        return response()->json(['ok' => true]);
    }

    private function authorizeView(RiderOrder $order): void
    {
        $u = request()->user();
        abort_if(!$u, 401);
        abort_if($u->id !== (int)$order->client_user_id && $u->role !== 'admin', 403);
    }
}
