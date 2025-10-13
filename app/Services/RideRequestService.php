<?php

namespace App\Services;

use App\Models\{RideRequest, RideRequestTransfer, Trip, User};
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RideRequestService
{
    public function __construct(
        private readonly TripSeatService $seats
    ) {}

    /**
     * Создание брони клиентом.
     * - Для company-trip: авто-accept если хватает мест, иначе pending.
     * - Для обычного драйвера: pending (можно включить авто-accept по требованиям).
     */
    public function createBooking(User $client, Trip $trip, array $payload): RideRequest
    {
        return DB::transaction(function () use ($client, $trip, $payload) {
            $seats = max(1, (int)($payload['seats'] ?? 1));
            $payment = (string)($payload['payment'] ?? 'cash');

            /** @var RideRequest $req */
            $req = RideRequest::create([
                'trip_id'   => $trip->id,
                'user_id'   => $client->id,
                'passenger_name' => $payload['passenger_name'] ?? $client->name,
                'phone'     => $payload['phone'] ?? null,
                'description'=> $payload['description'] ?? null,
                'seats'     => $seats,
                'payment'   => $payment,
                'status'    => 'pending',
            ]);

            $autoAccept = !is_null($trip->company_id); // «авто для company Trips»
            if ($autoAccept) {
                try {
                    $this->seats->reserve($trip, $seats);
                    $req->update([
                        'status' => 'accepted',
                        'decided_by_user_id' => $client->id, // можно пометить системой
                        'decided_at' => now(),
                    ]);
                    // Открыть (или обновить) чат-карточку
                    app(\App\Http\Controllers\Chat\ChatV2Controller::class)->openByRequest(request(), $req);
                } catch (\Throwable $e) {
                    // нет мест — оставляем pending
                }
            }

            return $req;
        });
    }

    /**
     * Принятие заявки (водителем или назначенным водителем/диспетчером).
     * Seats учтутся атомарно.
     */
    public function accept(RideRequest $req, User $actor): void
    {
        DB::transaction(function () use ($req, $actor) {
            $req->refresh();
            if ($req->status !== 'pending') return;

            $trip = $req->trip()->lockForUpdate()->firstOrFail();
            $this->seats->reserve($trip, (int)$req->seats);

            $req->update([
                'status' => 'accepted',
                'decided_by_user_id' => $actor->id,
                'decided_at' => now(),
            ]);

            // гарантируем чат-карточку
            app(\App\Http\Controllers\Chat\ChatV2Controller::class)->openByRequest(request(), $req);
        });
    }

    /** Отклонение заявки */
    public function reject(RideRequest $req, User $actor): void
    {
        DB::transaction(function () use ($req, $actor) {
            $req->refresh();

            // если уже были забронированы места (accepted) — освободить
            if ($req->status === 'accepted') {
                $trip = $req->trip()->lockForUpdate()->firstOrFail();
                $this->seats->release($trip, (int)$req->seats);
            }

            if (in_array($req->status, ['pending','accepted'])) {
                $req->update([
                    'status' => 'rejected',
                    'decided_by_user_id' => $actor->id,
                    'decided_at' => now(),
                ]);
            }
        });
    }

    /**
     * Перенос заявки между рейсами одной компании.
     * - Проверяем общую компанию
     * - Если заявка accepted — переносим квоту: release(from) + reserve(to)
     * - Обновляем ride_requests.trip_id, пишем аудит в ride_request_transfers
     * - Пушим trip-карточку в чат для нового рейса
     */
    public function transfer(RideRequest $req, Trip $toTrip, User $actor, ?string $reason = null): void
    {
        DB::transaction(function () use ($req, $toTrip, $actor, $reason) {
            $req->refresh();
            $fromTrip = $req->trip()->lockForUpdate()->firstOrFail();
            $toTrip   = Trip::where('id', $toTrip->id)->lockForUpdate()->firstOrFail();

            // обе поездки — одной компании, и компания вообще есть
            $companyId = $fromTrip->company_id;
            if (!$companyId || $toTrip->company_id !== $companyId) {
                throw ValidationException::withMessages([
                    'to_trip_id' => 'Տեղափոխումը հնարավոր է միայն նույն ընկերության երթուղու մեջ։'
                ]);
            }

            // если заявка была принята — пересчёт мест
            if ($req->status === 'accepted') {
                // сперва проверяем наличие мест в целевом
                $this->seats->ensureCapacity($toTrip, (int)$req->seats);
                // потом — снимаем с исходного и добавляем к целевому
                $this->seats->release($fromTrip, (int)$req->seats);
                $this->seats->reserve($toTrip, (int)$req->seats);
            }

            // сам перенос
            $req->update([
                'trip_id' => $toTrip->id,
                // статус можно оставить "accepted", чтобы finish‑логика не ломалась
                // при желании можно пометить 'transferred' — тогда обновите метрики
                // 'status' => 'accepted',
                'decided_by_user_id' => $actor->id,
                'decided_at' => now(),
            ]);

            RideRequestTransfer::create([
                'ride_request_id'       => $req->id,
                'from_trip_id'          => $fromTrip->id,
                'to_trip_id'            => $toTrip->id,
                'company_id'            => $companyId,
                'transferred_by_user_id'=> $actor->id,
                'reason'                => $reason,
                'transferred_at'        => now(),
            ]);

            // обновим чат и карточку Trips
            app(\App\Http\Controllers\Chat\ChatV2Controller::class)->openByRequest(request(), $req);
        });
    }
}
