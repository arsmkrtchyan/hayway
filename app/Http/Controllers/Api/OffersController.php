<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDriverOfferRequest;
use App\Http\Resources\DriverOfferResource;
use App\Models\DriverOffer;
use App\Services\OfferService;
use Illuminate\Http\Request;

class OffersController extends Controller
{
    public function store(StoreDriverOfferRequest $req, OfferService $svc)
    {
        $offer = $svc->createOffer(
            orderId: (int)$req->integer('order_id'),
            tripId:  (int)$req->integer('trip_id'),
            driverUserId: (int)auth()->id(),
            priceAmd: (int)$req->integer('price_amd'),
            seats: (int)$req->integer('seats'),
            validUntil: $req->input('valid_until'),
            meta: $req->input('meta')
        );

        return (new DriverOfferResource($offer))->additional(['ok'=>true]);
    }

    public function my(Request $r)
    {
        $items = DriverOffer::query()
            ->where('driver_user_id', auth()->id())
            ->orderByDesc('id')
            ->paginate(20);

        return DriverOfferResource::collection($items)->additional(['ok'=>true]);
    }

    public function accept(DriverOffer $offer, OfferService $svc)
    {
        // как правило, принимает клиент (владелец order-а)
        // Проверки прав можно вынести в Policy
        $rr = $svc->acceptOffer($offer, (int)auth()->id());
        return response()->json(['ok'=>true,'ride_request_id'=>$rr->id]);
    }

    public function reject(DriverOffer $offer, OfferService $svc)
    {
        $offer = $svc->rejectOffer($offer, (int)auth()->id());
        return (new DriverOfferResource($offer))->additional(['ok'=>true]);
    }

    public function withdraw(DriverOffer $offer, OfferService $svc)
    {
        $offer = $svc->withdrawOffer($offer, (int)auth()->id());
        return (new DriverOfferResource($offer))->additional(['ok'=>true]);
    }
}
