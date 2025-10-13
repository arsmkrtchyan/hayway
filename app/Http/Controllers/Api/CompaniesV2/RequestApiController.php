<?php

namespace App\Http\Controllers\Api\CompaniesV2;

use App\Http\Controllers\Controller;
use App\Models\{Company, RideRequest, Trip, Conversation, ConversationParticipant as CP};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RequestApiController extends Controller
{
    public function index(Company $company)
    {
        $this->authorize('view', $company);

        $items = RideRequest::whereHas('trip', fn($q)=>$q->where('company_id',$company->id))
            ->where('status','pending')
            ->with(['trip:id,from_addr,to_addr,price_amd,departure_at','user:id,name,email'])
            ->latest()
            ->get(['id','trip_id','user_id','seats','payment','status','created_at']);

        return response()->json(['items'=>$items]);
    }

    public function accept(Company $company, RideRequest $requestModel)
    {
        $this->authorize('manage', $company);
        $trip = $requestModel->trip; abort_unless(optional($trip)->company_id === $company->id, 403);
        if ($requestModel->status !== 'pending') return response()->json(['ok'=>true]); // идемпотентно

        DB::transaction(function () use ($requestModel, $trip) {
            $t = Trip::where('id',$trip->id)->lockForUpdate()->first();
            $free = max(0,(int)$t->seats_total - (int)$t->seats_taken);
            if ($free < (int)$requestModel->seats) abort(400,'Անբավարար ազատ տեղեր');

            $t->increment('seats_taken',(int)$requestModel->seats);
            $requestModel->update([
                'status'=>'accepted',
                'decided_by_user_id'=>auth()->id(),
                'decided_at'=>now(),
            ]);
        });

        $this->ensureConversation($requestModel);
        app(\App\Http\Controllers\Chat\ChatV2Controller::class)->openByRequest(request(), $requestModel);

        return response()->json(['ok'=>true,'status'=>'accepted']);
    }

    public function decline(Company $company, RideRequest $requestModel)
    {
        $this->authorize('manage', $company);
        $trip = $requestModel->trip; abort_unless(optional($trip)->company_id === $company->id, 403);

        DB::transaction(function () use ($requestModel, $trip) {
            $t = Trip::where('id',$trip->id)->lockForUpdate()->first();

            if ($requestModel->status === 'accepted') {
                $delta = max(0,(int)$requestModel->seats);
                $t->update(['seats_taken'=> max(0,(int)$t->seats_taken - $delta)]);
            }
            if (in_array($requestModel->status,['pending','accepted'])) {
                $requestModel->update([
                    'status'=>'rejected',
                    'decided_by_user_id'=>auth()->id(),
                    'decided_at'=>now(),
                ]);
            }
        });

        return response()->json(['ok'=>true,'status'=>'rejected']);
    }

    public function transfer(Request $r, Company $company, RideRequest $requestModel)
    {
        $this->authorize('manage', $company);

        $data = $r->validate([
            'to_trip_id' => ['required','integer','exists:trips,id'],
            'reason'     => ['nullable','string','max:240'],
        ]);

        $fromTrip = $requestModel->trip()->firstOrFail();
        abort_unless((int)$fromTrip->company_id === (int)$company->id, 403);
        $toTrip = Trip::findOrFail((int)$data['to_trip_id']);
        abort_unless((int)$toTrip->company_id === (int)$company->id, 403);

        if ($toTrip->status !== 'published' || !is_null($toTrip->driver_finished_at)) {
            return response()->json(['message'=>'Կարելի է տեղափոխել միայն հրապարակված և չավարտված երթուղու վրա'], 422);
        }

        DB::transaction(function () use ($requestModel, $fromTrip, $toTrip, $company, $data) {
            $ids = [$fromTrip->id, $toTrip->id]; sort($ids);
            $locked = Trip::whereIn('id',$ids)->lockForUpdate()->get()->keyBy('id');
            $from = $locked[$fromTrip->id]; $to = $locked[$toTrip->id];

            if ($requestModel->status === 'accepted') {
                $need = (int)$requestModel->seats;
                $free = max(0,(int)$to->seats_total - (int)$to->seats_taken);
                if ($free < $need) abort(400,'Նպատակային երթուղում ազատ տեղ չկա');

                $from->update(['seats_taken'=> max(0,(int)$from->seats_taken - $need)]);
                $to->update(['seats_taken'=> (int)$to->seats_taken + $need]);
            }

            $requestModel->update(['trip_id'=>$to->id]);

            \App\Models\RideRequestTransfer::create([
                'ride_request_id' => $requestModel->id,
                'from_trip_id'    => $from->id,
                'to_trip_id'      => $to->id,
                'company_id'      => $company->id,
                'transferred_by_user_id' => auth()->id(),
                'reason'          => $data['reason'] ?? null,
                'transferred_at'  => now(),
            ]);
        });

        return response()->json(['ok'=>true,'status'=>'transferred','to_trip_id'=>(int)$toTrip->id]);
    }

    private function ensureConversation(RideRequest $req)
    {
        $trip = $req->trip()->firstOrFail();
        $driverId = $trip->assigned_driver_id ?: $trip->user_id;
        $clientId = $req->user_id;

        $conv = Conversation::updateOrCreate(
            ['driver_user_id'=>$driverId,'client_user_id'=>$clientId],
            ['status'=>'open','ride_request_id'=>$req->id]
        );

        CP::firstOrCreate(['conversation_id'=>$conv->id,'user_id'=>$driverId],['role'=>'driver']);
        if ($clientId) CP::firstOrCreate(['conversation_id'=>$conv->id,'user_id'=>$clientId],['role'=>'client']);

        return $conv;
    }
}
