<?php

namespace App\Http\Controllers\Api\Clientv2;

use App\Http\Controllers\Controller;
use App\Models\{RideRequest, Trip};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RequestsApiController extends Controller
{
    public function index(Request $r)
    {
        $list = RideRequest::query()
            ->with([
                'trip:id,from_addr,to_addr,departure_at,price_amd,driver_finished_at,user_id',
                'trip.driver:id,name'
            ])
            ->where('user_id', $r->user()->id)
            ->latest()
            ->paginate(max(1, min(50, (int)$r->input('page.size', 20))))
            ->withQueryString();

        $data = $list->getCollection()->map(function ($req) {
            return [
                'id'=>(int)$req->id,
                'status'=>(string)$req->status,
                'payment'=>(string)$req->payment,
                'seats'=>(int)$req->seats,
                'passenger_name'=>(string)$req->passenger_name,
                'description'=>(string)($req->description ?? ''),
                'phone'=>(string)$req->phone,
                'created_at'=>optional($req->created_at)->toIso8601String(),
                'trip'=>[
                    'id'=>(int)$req->trip->id,
                    'from_addr'=>(string)$req->trip->from_addr,
                    'to_addr'=>(string)$req->trip->to_addr,
                    'departure_at'=>optional($req->trip->departure_at)->toIso8601String(),
                    'price_amd'=>(int)$req->trip->price_amd,
                    'driver'=>$req->trip->driver->name ?? 'Վարորդ',
                    'driver_finished_at'=>optional($req->trip->driver_finished_at)->toIso8601String(),
                ],
            ];
        })->values();

        return response()->json([
            'data'=>$data,
            'meta'=>[
                'page'=>$list->currentPage(),
                'per_page'=>$list->perPage(),
                'total'=>$list->total(),
                'last_page'=>$list->lastPage(),
            ],
        ]);
    }

    public function destroy(Request $r, $id)
    {
        $req = RideRequest::where('id',$id)->where('user_id',$r->user()->id)->firstOrFail();

        if (!in_array($req->status,['pending','accepted'], true)) {
            return response()->json(['error'=>'cannot_delete'], 403);
        }

        DB::transaction(function () use ($req) {
            if ($req->status === 'accepted') {
                Trip::where('id',$req->trip_id)
                    ->update(['seats_taken'=>DB::raw('GREATEST(seats_taken - '.$req->seats.', 0)')]);
            }
            $req->update(['status'=>'deleted']);
        });

        return response()->json(['data'=>['id'=>$req->id,'status'=>'deleted']]);
    }
}
