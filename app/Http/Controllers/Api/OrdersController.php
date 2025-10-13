<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRiderOrderRequest;
use App\Http\Resources\RiderOrderResource;
use App\Models\RiderOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OrdersController extends Controller
{
    /** Создать заказ пассажира */
    public function store(StoreRiderOrderRequest $req)
    {
        $data = $req->validated();
        $data['client_user_id'] = auth()->id();

        // нормализация текстов для поиска (как в миграции)
        $data['from_addr_search'] = self::normalize($data['from_addr'] ?? null);
        $data['to_addr_search']   = self::normalize($data['to_addr']   ?? null);

        $order = RiderOrder::create($data);
        return (new RiderOrderResource($order))->additional(['ok'=>true]);
    }

    /** Мои заказы */
    public function my(Request $r)
    {
        $items = RiderOrder::query()
            ->where('client_user_id', auth()->id())
            ->orderByDesc('id')
            ->paginate(20);

        return RiderOrderResource::collection($items)->additional(['ok'=>true]);
    }

    /** Просмотр одного заказа */
    public function show(RiderOrder $order)
    {
        $this->authorize('view', $order); // опционально, если настроите Policy
        return (new RiderOrderResource($order))->additional(['ok'=>true]);
    }

    /** Закрыть/отменить заказ */
    public function cancel(RiderOrder $order)
    {
        $this->authorize('update', $order);
        if ($order->status !== 'open') {
            return response()->json(['ok'=>false,'error'=>'Order not open'], 422);
        }
        $order->status = 'cancelled';
        $order->save();
        return (new RiderOrderResource($order))->additional(['ok'=>true]);
    }

    private static function normalize(?string $value): ?string
    {
        if (!$value) return null;
        try { $latin = Str::transliterate($value); }
        catch (\Throwable) { $latin = Str::ascii($value); }

        $collapse = Str::of($latin)->lower()->replaceMatches('/[^a-z0-9]+/u',' ')->squish()->value();
        return $collapse === '' ? null : $collapse;
    }
}
