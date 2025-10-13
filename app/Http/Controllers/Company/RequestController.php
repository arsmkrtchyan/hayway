<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\{Company, RideRequest, Trip, Conversation, ConversationParticipant as CP, RideRequestTransfer};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RequestController extends Controller
{
    public function index(Company $company)
    {
        $this->authorize('view', $company);

        $pending = RideRequest::whereHas('trip', fn($q) => $q->where('company_id', $company->id))
            ->where('status', 'pending')
            ->with(['trip' => fn($q) => $q->select('id', 'from_addr', 'to_addr', 'price_amd', 'departure_at'),
                'user:id,name,email'])
            ->latest()->get(['id', 'trip_id', 'user_id', 'seats', 'payment', 'status', 'created_at']);

        return inertia('Company/Requests', [
            'company' => ['id' => $company->id, 'name' => $company->name],
            'requests' => $pending,
        ]);
    }

    /** Принять заявку: атомарно проверяем места и обновляем seats_taken */
    public function accept(Company $company, RideRequest $requestModel)
    {
        $this->authorize('manage', $company);
        $trip = $requestModel->trip;
        abort_unless(optional($trip)->company_id === $company->id, 403);

        if ($requestModel->status !== 'pending') {
            return back();
        }

        DB::transaction(function () use ($requestModel, $trip) {
            // блокировка рейса
            $t = Trip::where('id', $trip->id)->lockForUpdate()->first();

            $free = max(0, (int)$t->seats_total - (int)$t->seats_taken);
            if ($free < (int)$requestModel->seats) {
                abort(400, 'Անբավարար ազատ տեղեր');
            }

            $t->increment('seats_taken', (int)$requestModel->seats);

            $requestModel->update([
                'status' => 'accepted',
                'decided_by_user_id' => auth()->id(),
                'decided_at' => now(),
            ]);
        });

        // гарантируем чат и карточку
        $conv = $this->ensureConversation($requestModel);
        app(\App\Http\Controllers\Chat\ChatV2Controller::class)->openByRequest(request(), $requestModel);

        return back()->with('ok', 'accepted');
    }

    /** Отклонить: если успели принять — освободить места */
    public function decline(Company $company, RideRequest $requestModel)
    {
        $this->authorize('manage', $company);
        $trip = $requestModel->trip;
        abort_unless(optional($trip)->company_id === $company->id, 403);

        DB::transaction(function () use ($requestModel, $trip) {
            $t = Trip::where('id', $trip->id)->lockForUpdate()->first();

            if ($requestModel->status === 'accepted') {
                $delta = max(0, (int)$requestModel->seats);
                $t->update(['seats_taken' => max(0, (int)$t->seats_taken - $delta)]);
            }

            if (in_array($requestModel->status, ['pending', 'accepted'])) {
                $requestModel->update([
                    'status' => 'rejected',
                    'decided_by_user_id' => auth()->id(),
                    'decided_at' => now(),
                ]);
            }
        });

        return back()->with('ok', 'declined');
    }

    /**
     * Перенос заявки между рейсами одной компании.
     * - Если заявка была accepted: seats_taken переносим с from->to (проверяем вместимость to).
     * - Если pending: просто меняем trip_id (seats_taken не трогаем).
     */
    public function transfer(Request $r, Company $company, RideRequest $requestModel)
    {
        $this->authorize('manage', $company);

        $data = $r->validate([
            'to_trip_id' => ['required', 'integer', 'exists:trips,id'],
            'reason' => ['nullable', 'string', 'max:240'],
        ]);

        $fromTrip = $requestModel->trip()->firstOrFail();
        abort_unless((int)$fromTrip->company_id === (int)$company->id, 403);

        $toTrip = Trip::where('id', $data['to_trip_id'])->firstOrFail();
        abort_unless((int)$toTrip->company_id === (int)$company->id, 403);

        // запретим перенос в завершённый/архивный
//        if ($toTrip->status === 'archived' || $toTrip->driver_state === 'done') {
//            return back()->withErrors(['to_trip_id' => 'Չի կարելի տեղափոխել այս երթուղու վրա'])->withInput();
//        }
        if ($toTrip->status !== 'published' || !is_null($toTrip->driver_finished_at)) {
            return back()
                ->withErrors(['to_trip_id' => 'Կարելի է տեղափոխել միայն հրապարակված և չավարտված երթուղու վրա'])
                ->withInput();
        }



        // лочим оба трипа в стабильном порядке (меньший id первым) чтобы избежать дедлоков
        DB::transaction(function () use ($requestModel, $fromTrip, $toTrip, $company, $data) {
            $ids = [$fromTrip->id, $toTrip->id];
            sort($ids);

            $locked = Trip::whereIn('id', $ids)->lockForUpdate()->get()->keyBy('id');
            $from = $locked[$fromTrip->id];
            $to = $locked[$toTrip->id];

            if ($requestModel->status === 'accepted') {
                $need = (int)$requestModel->seats;

                $free = max(0, (int)$to->seats_total - (int)$to->seats_taken);
                if ($free < $need) {
                    abort(400, 'Նպատակային երթուղում ազատ տեղ չկա');
                }

                // переносим занятые места
                $from->update(['seats_taken' => max(0, (int)$from->seats_taken - $need)]);
                $to->update(['seats_taken' => (int)$to->seats_taken + $need]);
            }

            // сам перенос заявки
            $requestModel->update(['trip_id' => $to->id]);

            // аудит
            RideRequestTransfer::create([
                'ride_request_id' => $requestModel->id,
                'from_trip_id' => $from->id,
                'to_trip_id' => $to->id,
                'company_id' => $company->id,
                'transferred_by_user_id' => auth()->id(),
                'reason' => $data['reason'] ?? null,
                'transferred_at' => now(),
            ]);
        });

        return back()->with('ok', 'transferred');
    }

    /** Гарантируем conversation driver–client + участников */
    private function ensureConversation(RideRequest $req)
    {
        $trip = $req->trip()->firstOrFail();
        $driverId = $trip->assigned_driver_id ?: $trip->user_id;
        $clientId = $req->user_id;

        $conv = Conversation::updateOrCreate(
            ['driver_user_id' => $driverId, 'client_user_id' => $clientId],
            ['status' => 'open', 'ride_request_id' => $req->id]
        );

        CP::firstOrCreate(['conversation_id' => $conv->id, 'user_id' => $driverId], ['role' => 'driver']);
        if ($clientId) {
            CP::firstOrCreate(['conversation_id' => $conv->id, 'user_id' => $clientId], ['role' => 'client']);
        }

        return $conv;
    }
}
