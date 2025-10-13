<?php

namespace App\Http\Controllers\Api\Driverv2;

use App\Http\Controllers\Controller;
use App\Models\{RideRequest, Trip, Conversation, ConversationParticipant as CP};
use Illuminate\Http\Request;
use App\Http\Controllers\Chat\ChatV2Controller as ChatV2;
use Illuminate\Support\Facades\DB;
class RideRequestsApiController extends Controller
{
//    public function accept(RideRequest $requestModel)
//    {
//        $trip = $requestModel->trip;
//        $allowed = array_filter([$trip->user_id, $trip->assigned_driver_id]);
//        abort_unless(in_array(auth()->id(), $allowed, true), 403);
//
//        if ($requestModel->status !== 'pending') {
//            return response()->json(['error'=>'bad_status'], 409);
//        }
//
//        if ($trip->seats_taken + $requestModel->seats <= $trip->seats_total) {
//            $trip->increment('seats_taken', $requestModel->seats);
//            $requestModel->update([
//                'status'=>'accepted',
//                'decided_by_user_id'=>auth()->id(),
//                'decided_at'=>now(),
//            ]);
//
//            $conv = $this->ensureConversation($requestModel);
//            app(ChatV2::class)->openByRequest(request(), $requestModel);
//
//            return response()->json(['data'=>['id'=>$requestModel->id,'status'=>'accepted','conversation_id'=>$conv->id]]);
//        }
//
//        return response()->json(['error'=>'not_enough_seats'], 422);
//    }
    public function accept(RideRequest $requestModel)
    {
        // подгружаем трип и блокируем его в транзакции — чтобы не было гонок
        return DB::transaction(function () use ($requestModel) {
            $requestModel->load('trip');
            $trip = \App\Models\Trip::where('id', $requestModel->trip_id)->lockForUpdate()->first();

            $allowed = array_filter([$trip->user_id, $trip->assigned_driver_id]);
            abort_unless(in_array(auth()->id(), $allowed, true), 403);

            if ($requestModel->status !== 'pending') {
                return response()->json(['error'=>'bad_status'], 409);
            }

            if (($trip->seats_taken + $requestModel->seats) > $trip->seats_total) {
                return response()->json(['error'=>'not_enough_seats'], 422);
            }

            $trip->increment('seats_taken', $requestModel->seats);
            $requestModel->update([
                'status'=>'accepted',
                'decided_by_user_id'=>auth()->id(),
                'decided_at'=>now(),
            ]);

            $conv = $this->ensureConversation($requestModel);
            app(\App\Http\Controllers\Chat\ChatV2Controller::class)->openByRequest(request(), $requestModel);

            return response()->json([
                'data'=>[
                    'id'=>$requestModel->id,
                    'status'=>'accepted',
                    'conversation_id'=>$conv->id
                ]
            ]);
        });
    }

    public function reject(RideRequest $requestModel)
    {
        $trip = $requestModel->trip;
        $allowed = array_filter([$trip->user_id, $trip->assigned_driver_id]);
        abort_unless(in_array(auth()->id(), $allowed, true), 403);

        if ($requestModel->status === 'accepted') {
            $delta = max(0,(int)$requestModel->seats);
            $trip->update(['seats_taken'=>max(0, $trip->seats_taken - $delta)]);
        }

        if (in_array($requestModel->status,['pending','accepted'])) {
            $requestModel->update([
                'status'=>'rejected',
                'decided_by_user_id'=>auth()->id(),
                'decided_at'=>now(),
            ]);
        }

        return response()->json(['data'=>['id'=>$requestModel->id,'status'=>'rejected']]);
    }

    public function fake(Trip $trip)
    {
        abort_unless(in_array(auth()->id(), array_filter([$trip->user_id, $trip->assigned_driver_id])), 403);

        $rr = RideRequest::create([
            'trip_id'=>$trip->id,
            'user_id'=>auth()->id(),
            'passenger_name'=>'Թեստային Ուղևոր',
            'phone'=>'+374 77 00 00 00',
            'seats'=>1,
            'payment'=>'cash',
            'status'=>'pending',
        ]);

        return response()->json(['data'=>['id'=>$rr->id,'status'=>'pending']]);
    }

    public function openChat(RideRequest $requestModel)
    {
        $trip = $requestModel->trip;
        $allowed = array_filter([$trip->user_id, $trip->assigned_driver_id]);
        abort_unless(in_array(auth()->id(), $allowed, true), 403);

        $conv = $this->ensureConversation($requestModel);
        app(ChatV2::class)->openByRequest(request(), $requestModel);

        return response()->json(['data'=>['conversation_id'=>$conv->id]]);
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

        CP::firstOrCreate(['conversation_id'=>$conv->id,'user_id'=>$driverId], ['role'=>'driver']);
        if ($clientId) CP::firstOrCreate(['conversation_id'=>$conv->id,'user_id'=>$clientId], ['role'=>'client']);

        return $conv;
    }
}
