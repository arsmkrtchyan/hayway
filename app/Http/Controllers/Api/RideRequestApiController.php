<?php
//
//namespace App\Http\Controllers\Api;
//
//use App\Http\Controllers\Controller;
//use App\Models\RideRequest;
//use App\Models\Trip;
//use Illuminate\Http\Request;
//use Illuminate\Support\Facades\DB;
//
//class RideRequestApiController extends Controller
//{
//    public function index(Request $r)
//    {
//        $items = RideRequest::query()
//            ->with(['trip:id,from_addr,to_addr,departure_at,price_amd,user_id', 'trip.driver:id,name'])
//            ->where('user_id', $r->user()->id)
//            ->latest()
//            ->paginate($r->integer('per_page', 20))
//            ->through(function (RideRequest $x) {
//                return [
//                    'id' => $x->id,
//                    'status' => $x->status,
//                    'payment'=> $x->payment,
//                    'seats'  => $x->seats,
//                    'passenger_name' => $x->passenger_name,
//                    'phone'          => $x->phone,
//                    'trip' => [
//                        'id' => $x->trip->id,
//                        'from_addr' => $x->trip->from_addr,
//                        'to_addr'   => $x->trip->to_addr,
//                        'departure_at' => optional($x->trip->departure_at)->toIso8601String(),
//                        'price_amd' => (int)$x->trip->price_amd,
//                        'driver'    => $x->trip->driver->name ?? 'Վարորդ',
//                    ],
//                ];
//            });
//
//        return response()->json([
//            'data'  => $items->items(),
//            'meta'  => [
//                'current_page' => $items->currentPage(),
//                'last_page'    => $items->lastPage(),
//                'per_page'     => $items->perPage(),
//                'total'        => $items->total(),
//            ],
//            'links' => [
//                'first' => $items->url(1),
//                'last'  => $items->url($items->lastPage()),
//                'prev'  => $items->previousPageUrl(),
//                'next'  => $items->nextPageUrl(),
//            ],
//        ]);
//    }
//
//    public function store(Request $r, Trip $trip)
//    {
//        abort_if($trip->status !== 'published', 404);
//
//        $data = $r->validate([
//            'passenger_name' => ['required','string','max:80'],
//            'phone'          => ['required','string','max:40'],
//            'seats'          => ['required','integer','min:1','max:3'],
//            'payment'        => ['required','in:cash,card'],
//        ]);
//
//        $free = $trip->seats_total - $trip->seats_taken; // учитываем только принятые
//        if ($free < $data['seats']) {
//            return response()->json(['message'=>'not_enough_free_seats'], 422);
//        }
//
//        $req = DB::transaction(function () use ($trip, $r, $data) {
//            return RideRequest::create([
//                'trip_id'        => $trip->id,
//                'user_id'        => $r->user()->id,
//                'passenger_name' => $data['passenger_name'],
//                'phone'          => $data['phone'],
//                'seats'          => $data['seats'],
//                'payment'        => $data['payment'],
//                'status'         => 'pending',
//            ]);
//        });
//
//        return response()->json([
//            'status' => 'ok',
//            'request'=> [
//                'id' => $req->id,
//                'status' => $req->status,
//            ],
//        ], 201);
//    }
//
//    public function destroy(Request $r, int $id)
//    {
//        $req = RideRequest::where('id',$id)->where('user_id',$r->user()->id)->firstOrFail();
//
//        // Разрешим удалять только pending. Если нужно — убери это условие.
//        if ($req->status !== 'pending') {
//            return response()->json(['message'=>'only_pending_can_be_deleted'], 409);
//        }
//
//        $req->delete();
//        return response()->json(['status'=>'ok']);
//    }
//}


namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RideRequest;
use App\Models\Trip;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RideRequestApiController extends Controller
{
    public function index(Request $r)
    {
        $items = RideRequest::query()
            ->with(['trip:id,from_addr,to_addr,departure_at,price_amd,user_id', 'trip.driver:id,name'])
            ->where('user_id', $r->user()->id)
            ->latest()
            ->paginate($r->integer('per_page', 20))
            ->through(function (RideRequest $x) {
                return [
                    'id' => $x->id,
                    'status' => $x->status,
                    'payment' => $x->payment,
                    'seats' => (int)$x->seats,
                    'passenger_name' => $x->passenger_name,
                    'phone' => $x->phone,
                    'description' => $x->description,
                    'trip' => [
                        'id' => $x->trip->id,
                        'from_addr' => $x->trip->from_addr,
                        'to_addr' => $x->trip->to_addr,
                        'departure_at' => optional($x->trip->departure_at)->toIso8601String(),
                        'price_amd' => (int)$x->trip->price_amd,
                        'driver' => $x->trip->driver->name ?? 'Վարորդ',
                    ],
                ];
            });

        return response()->json([
            'data' => $items->items(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
            'links' => [
                'first' => $items->url(1),
                'last' => $items->url($items->lastPage()),
                'prev' => $items->previousPageUrl(),
                'next' => $items->nextPageUrl(),
            ],
        ]);
    }

    public function store(Request $r, Trip $trip)
    {
        abort_if($trip->status !== 'published', 404);

        $data = $r->validate([
            'description' => ['required', 'string', 'max:2000'],
            'seats' => ['required', 'integer', 'min:1', 'max:3'],
            'payment' => ['required', 'in:cash,card'],
        ]);

        $user = $r->user();
        $passengerName = (string)$user->name;
        $phone = $user->number ?? null; // колонка users.number из миграции

        if (!$phone) {
            return response()->json(['message' => 'user_phone_missing'], 422);
        }

        $free = $trip->seats_total - $trip->seats_taken;
        if ($free < $data['seats']) {
            return response()->json(['message' => 'not_enough_free_seats'], 422);
        }

        $req = DB::transaction(function () use ($trip, $user, $data, $passengerName, $phone) {
            return RideRequest::create([
                'trip_id' => $trip->id,
                'user_id' => $user->id,
                'passenger_name' => $passengerName,
                'phone' => $phone,
                'description' => $data['description'],
                'seats' => $data['seats'],
                'payment' => $data['payment'],
                'status' => 'pending',
            ]);
        });

        return response()->json([
            'status' => 'ok',
            'request' => [
                'id' => $req->id,
                'status' => $req->status,
            ],
        ], 201);
    }

    public function destroy(Request $r, int $id)
    {
        $req = RideRequest::where('id', $id)->where('user_id', $r->user()->id)->firstOrFail();

        if ($req->status !== 'pending') {
            return response()->json(['message' => 'only_pending_can_be_deleted'], 409);
        }

        $req->delete();
        return response()->json(['status' => 'ok']);
    }
}
