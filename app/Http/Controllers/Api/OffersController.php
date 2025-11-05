<?php
//
//namespace App\Http\Controllers\Api;
//
//use App\Http\Controllers\Controller;
//use App\Http\Requests\StoreDriverOfferRequest;
//use App\Http\Resources\DriverOfferResource;
//use App\Models\DriverOffer;
//use App\Models\RideRequest;
//use App\Models\Trip;
//use Illuminate\Http\Request;
//use Illuminate\Support\Facades\DB;
//use Symfony\Component\HttpFoundation\Response;
//
//class OffersController extends Controller
//{
//    /** Создать оффер */
//    public function store(StoreDriverOfferRequest $req)
//    {
//        $offer = DriverOffer::create([
//            'order_id'       => (int) $req->integer('order_id'),
//            'trip_id'        => (int) $req->integer('trip_id'),
//            'driver_user_id' => (int) auth()->id(),
//            'price_amd'      => (int) $req->integer('price_amd'),
//            'seats'          => (int) $req->integer('seats'),
//            'valid_until'    => $req->input('valid_until'),
//            'status'         => 'pending',
//            'meta'           => $req->input('meta'),
//        ]);
//
//        return (new DriverOfferResource($offer->load(['order', 'trip'])))
//            ->additional(['ok' => true]);
//    }
//
//    /** Мои офферы (водитель) */
//    public function my(Request $r)
//    {
//        $items = DriverOffer::query()
//            ->where('driver_user_id', auth()->id())
//            ->orderByDesc('id')
//            ->paginate(20);
//
//        return DriverOfferResource::collection($items)->additional(['ok' => true]);
//    }
//
//    /** Принять оффер → создать ride_request и связать order+trip */
//    public function accept(DriverOffer $offer)
//    {
//        $userId = (int) auth()->id();
//
//        // Разрешения: принимать может владелец заказа
//        $offer->loadMissing(['order', 'trip']);
//        if (!$offer->order || (int) $offer->order->client_user_id !== $userId) {
//            return response()->json([
//                'ok' => false,
//                'message' => 'Forbidden',
//            ], Response::HTTP_FORBIDDEN);
//        }
//
//        // Только из pending
//        if ($offer->status !== 'pending') {
//            return response()->json([
//                'ok' => false,
//                'message' => 'Offer is not pending',
//            ], Response::HTTP_UNPROCESSABLE_ENTITY);
//        }
//
//        $rr = DB::transaction(function () use ($offer, $userId) {
//            // Блокируем связанные записи
//            $lockedOffer = DriverOffer::whereKey($offer->id)->lockForUpdate()->first();
//            $lockedOffer->load(['order' => fn($q) => $q->lockForUpdate(), 'trip' => fn($q) => $q->lockForUpdate()]);
//
//            if ($lockedOffer->status !== 'pending') {
//                abort(Response::HTTP_UNPROCESSABLE_ENTITY, 'Offer is not pending');
//            }
//
//            /** @var Trip $trip */
//            $trip = $lockedOffer->trip;
//
//            // Проверим места
//            $free = max(0, (int) $trip->seats_total - (int) $trip->seats_taken);
//            if ($free < (int) $lockedOffer->seats) {
//                abort(Response::HTTP_UNPROCESSABLE_ENTITY, 'Not enough seats');
//            }
//
//            // Создаём ride_request
//            $order = $lockedOffer->order;
//            $rr = RideRequest::create([
//                'trip_id'            => (int) $trip->id,
//                'order_id'           => (int) $order->id,
//                'user_id'            => (int) $order->client_user_id,
//                'created_by_user_id' => $userId,
//                'seats'              => (int) $lockedOffer->seats,
//                'payment'            => $order->payment ?? 'cash',
//                'price_amd'          => (int) $lockedOffer->price_amd,
//                'status'             => 'accepted',
//                'meta'               => [
//                    'from'   => [
//                        'lat'  => $order->from_lat,
//                        'lng'  => $order->from_lng,
//                        'addr' => $order->from_addr,
//                    ],
//                    'to'     => [
//                        'lat'  => $order->to_lat,
//                        'lng'  => $order->to_lng,
//                        'addr' => $order->to_addr,
//                    ],
//                    'source' => 'offer',
//                    'offer_id' => (int) $lockedOffer->id,
//                ],
//            ]);
//
//            // Обновляем статусы и занятые места
//            $lockedOffer->update(['status' => 'accepted']);
//            $order->update(['status' => 'matched']);
//            $trip->update(['seats_taken' => (int) $trip->seats_taken + (int) $lockedOffer->seats]);
//
//            return $rr;
//        });
//
//        return response()->json(['ok' => true, 'ride_request_id' => $rr->id]);
//    }
//
//    /** Отклонить оффер (обычно клиент) */
//    public function reject(DriverOffer $offer)
//    {
//        $userId = (int) auth()->id();
//
//        $offer->loadMissing('order');
//        if (!$offer->order || (int) $offer->order->client_user_id !== $userId) {
//            return response()->json(['ok' => false, 'message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
//        }
//        if ($offer->status !== 'pending') {
//            return response()->json(['ok' => false, 'message' => 'Offer is not pending'], Response::HTTP_UNPROCESSABLE_ENTITY);
//        }
//
//        $offer->update(['status' => 'rejected']);
//
//        return (new DriverOfferResource($offer))->additional(['ok' => true]);
//    }
//
//    /** Отозвать оффер (водитель) */
//    public function withdraw(DriverOffer $offer)
//    {
//        $userId = (int) auth()->id();
//
//        if ((int) $offer->driver_user_id !== $userId) {
//            return response()->json(['ok' => false, 'message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
//        }
//        if ($offer->status !== 'pending') {
//            return response()->json(['ok' => false, 'message' => 'Offer is not pending'], Response::HTTP_UNPROCESSABLE_ENTITY);
//        }
//
//        $offer->update(['status' => 'withdrawn']);
//
//        return (new DriverOfferResource($offer))->additional(['ok' => true]);
//    }
//}


namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RiderOrder;
use App\Models\Trip;
use App\Services\OffersService;
use Illuminate\Http\Request;

class OffersController extends Controller
{
    public function __construct(private OffersService $svc)
    {
    }

    // создать оффер: driver -> order + trip
    public function store(Request $r)
    {
        $u = $r->user();
        abort_if(!$u, 401);
        abort_if($u->role !== 'driver' && $u->role !== 'admin', 403);

        $data = $r->validate([
            'order_id' => ['required', 'integer', 'exists:rider_orders,id'],
            'trip_id' => ['required', 'integer', 'exists:trips,id'],
            'addon_amd' => ['nullable', 'integer', 'min:0'],
        ]);

        $order = RiderOrder::findOrFail($data['order_id']);
        $trip = Trip::findOrFail($data['trip_id']);
        abort_if($trip->status !== 'published', 422, 'trip_not_published');

        $id = $this->svc->create($u, $order, $trip, $data['addon_amd'] ?? null, 24);
        return response()->json(['data' => ['id' => $id]], 201);
    }

    // мои офферы водителя
    public function my(Request $r)
    {
        $u = $r->user();
        abort_if(!$u, 401);
        abort_if($u->role !== 'driver' && $u->role !== 'admin', 403);

        $items = $this->svc->listByDriver($u->id);
        return response()->json(['data' => $items]);
    }

    // принять оффер: client
    public function accept(string $offer, Request $r)
    {
        $u = $r->user();
        abort_if(!$u, 401);
        abort_if($u->role !== 'client' && $u->role !== 'admin', 403);

        $reqId = $this->svc->accept($u, $offer);
        if (!$reqId) return response()->json(['error' => 'offer_not_available'], 422);
        return response()->json(['data' => ['ride_request_id' => $reqId]]);
    }

    // отклонить оффер: client
    public function reject(string $offer, Request $r)
    {
        $u = $r->user();
        abort_if(!$u, 401);
        abort_if($u->role !== 'client' && $u->role !== 'admin', 403);

        $ok = $this->svc->reject($u, $offer);
        return $ok ? response()->json(['ok' => true]) : response()->json(['error' => 'not_allowed'], 403);
    }

    // отозвать оффер: driver
    public function withdraw(string $offer, Request $r)
    {
        $u = $r->user();
        abort_if(!$u, 401);
        abort_if($u->role !== 'driver' && $u->role !== 'admin', 403);

        $ok = $this->svc->withdraw($u, $offer);
        return $ok ? response()->json(['ok' => true]) : response()->json(['error' => 'not_allowed'], 403);
    }
}
