<?php

namespace App\Services;

use App\Models\DriverOffer;
use App\Models\RideRequest;
use App\Models\RiderOrder;
use App\Models\Trip;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OfferService
{
    /**
     * Создание оффера водителем.
     * Бизнес-правила: один активный pending на (order,trip).
     */
    public function createOffer(int $orderId, int $tripId, int $driverUserId, int $priceAmd, int $seats, ?string $validUntil = null, ?array $meta = null): DriverOffer
    {
        $order = RiderOrder::query()->findOrFail($orderId);
        $trip  = Trip::query()->findOrFail($tripId);

        if ($seats < 1 || $seats > max(1,(int)$trip->seats_total)) {
            throw ValidationException::withMessages(['seats' => 'Invalid seats']);
        }
        if ($trip->freeSeats() < $seats) {
            throw ValidationException::withMessages(['seats' => 'Not enough free seats in trip']);
        }
        if ($order->status !== 'open') {
            throw ValidationException::withMessages(['order' => 'Order not open']);
        }

        // защита: если уже есть pending
        $existsPending = DriverOffer::query()
            ->where('order_id',$order->id)
            ->where('trip_id',$trip->id)
            ->where('status','pending')
            ->exists();
        if ($existsPending) {
            throw ValidationException::withMessages(['offer' => 'Pending offer already exists for this order & trip']);
        }

        $offer = new DriverOffer();
        $offer->order_id = $order->id;
        $offer->trip_id  = $trip->id;
        $offer->driver_user_id = $driverUserId;
        $offer->price_amd = $priceAmd;
        $offer->seats     = $seats;
        $offer->status    = 'pending';
        if ($validUntil) $offer->valid_until = $validUntil;
        if ($meta) $offer->meta = $meta;
        $offer->save();

        // TODO: можно тут же положить сообщение в чат (conversation_messages type='offer')

        return $offer->fresh();
    }

    /**
     * Акцепт оффера: создаёт RideRequest, резервирует места, переводит статусы.
     */
    public function acceptOffer(DriverOffer $offer, int $actingUserId): RideRequest
    {
        if ($offer->status !== 'pending') {
            throw ValidationException::withMessages(['offer'=>'Offer is not pending']);
        }

        return DB::transaction(function() use ($offer, $actingUserId) {
            $offer->refresh();

            $trip = Trip::lockForUpdate()->findOrFail($offer->trip_id);
            $order= RiderOrder::lockForUpdate()->findOrFail($offer->order_id);

            if ($trip->freeSeats() < $offer->seats) {
                throw ValidationException::withMessages(['seats'=>'No free seats at the moment']);
            }
            if ($order->status !== 'open') {
                throw ValidationException::withMessages(['order'=>'Order is not open']);
            }

            // создаём бронирование
            $rr = new RideRequest();
            $rr->trip_id = $trip->id;
            $rr->user_id = $order->client_user_id;
            $rr->order_id= $order->id;
            $rr->seats   = $offer->seats;
            $rr->payment = $order->payment ?: 'cash';
            $rr->price_amd = $offer->price_amd > 0
                ? $offer->price_amd
                : (int)$trip->price_amd;
            $rr->status = 'accepted';
            $rr->meta   = [
                'accepted_offer_id' => $offer->id,
            ];
            $rr->save();

            // списываем места в трипе
            $trip->seats_taken = (int)$trip->seats_taken + (int)$offer->seats;
            $trip->save();

            // статусы
            $offer->status = 'accepted';
            $offer->save();

            // закрываем заказ, либо уменьшаем требуемые места (если хотите частичные)
            // для простоты — закрываем
            $order->status = 'matched';
            $order->save();

            // TODO: системные сообщения в чат, checkin ticket и т.д.

            return $rr->fresh();
        });
    }

    public function rejectOffer(DriverOffer $offer, int $actingUserId): DriverOffer
    {
        if ($offer->status !== 'pending') return $offer;
        $offer->status = 'rejected';
        $offer->save();
        return $offer->fresh();
    }

    public function withdrawOffer(DriverOffer $offer, int $actingUserId): DriverOffer
    {
        if ($offer->status !== 'pending') return $offer;
        if ($offer->driver_user_id !== $actingUserId) {
            throw ValidationException::withMessages(['offer'=>'Only author can withdraw offer']);
        }
        $offer->status = 'withdrawn';
        $offer->save();
        return $offer->fresh();
    }
}
