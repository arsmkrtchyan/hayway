<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\RideRequest;
use Inertia\Inertia;

class RequestsController extends Controller
{
  public function index()
{
    $requests = RideRequest::query()
        ->with([
            // если нужны и soft-deleted поездки:
            'trip' => fn($q) => $q
                ->withTrashed()   // убери, если не хочешь видеть удалённые trips
                ->select('id','from_addr','to_addr','departure_at','price_amd','driver_finished_at','user_id'),
            'trip.driver:id,name',
        ])
        ->where('user_id', auth()->id())
        ->latest()
        ->paginate(20)
        ->through(function (RideRequest $r) {

            $trip = $r->trip; // может быть null

            return [
                'id'             => (int) $r->id,
                'status'         => (string) $r->status,
                'payment'        => (string) $r->payment,
                'seats'          => (int) $r->seats,
                'passenger_name' => (string) $r->passenger_name,
                'description'    => (string) ($r->description ?? ''),
                'phone'          => (string) $r->phone,

                'trip' => $trip ? [
                    'id'                 => (int) $trip->id,
                    'from_addr'          => (string) $trip->from_addr,
                    'to_addr'            => (string) $trip->to_addr,
                    'departure_at'       => optional($trip->departure_at)->toIso8601String(),
                    'price_amd'          => (int) $trip->price_amd,
                    'driver'             => $trip->driver->name ?? 'Վարորդ',
                    'driver_finished_at' => optional($trip->driver_finished_at)->toIso8601String(),
                ] : null,
            ];
        });

    return Inertia::render('Client/MyRequests', ['items' => $requests]);
}

    public function destroy($id)
    {
        $req = \App\Models\RideRequest::where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        // можно отменять pending/accepted, но не завершённые
        abort_unless(in_array($req->status, ['pending','accepted']), 403);

        \DB::transaction(function() use ($req){
            if ($req->status === 'accepted') {
                \App\Models\Trip::where('id', $req->trip_id)
                    ->update(['seats_taken' => \DB::raw('GREATEST(seats_taken - '.$req->seats.', 0)')]);
            }
            $req->update(['status' => 'deleted']);
        });

        return redirect()->route('client.requests')->with('ok', 'request_deleted');
    }
}
