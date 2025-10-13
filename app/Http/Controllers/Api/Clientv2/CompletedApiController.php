<?php

namespace App\Http\Controllers\Api\Clientv2;

use App\Http\Controllers\Controller;
use App\Models\{RideRequest, Trip, Rating};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CompletedApiController extends Controller
{
    public function index(Request $r)
    {
        $userId = $r->user()->id;

        $list = RideRequest::query()
            ->with([
                'trip:id,from_addr,to_addr,departure_at,price_amd,driver_finished_at,user_id,company_id,assigned_driver_id',
                'trip.driver:id,name',
                'trip.company:id,name',
            ])
            ->where('user_id',$userId)
            ->where('status','accepted')
            ->whereHas('trip', fn($q)=>$q->whereNotNull('driver_finished_at'))
            ->latest()
            ->paginate(max(1, min(50, (int)$r->input('page.size', 20))))
            ->withQueryString();

        $data = $list->getCollection()->map(function ($req) use ($userId) {
            $t = $req->trip;
            $my = Rating::where('trip_id',$t->id)->where('user_id',$userId)->first();
            return [
                'trip'=>[
                    'id'=>$t->id,
                    'from_addr'=>$t->from_addr,
                    'to_addr'=>$t->to_addr,
                    'departure_at'=>optional($t->departure_at)->toIso8601String(),
                    'price_amd'=>$t->price_amd,
                    'driver'=>$t->driver->name ?? 'Վարորդ',
                    'company'=>$t->company->name ?? null,
                    'finished'=>!is_null($t->driver_finished_at),
                ],
                'my_rating'=>$my ? ['rating'=>$my->rating,'description'=>$my->description] : null,
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

    private function fold(?float $current, float $incoming): float
    {
        $base = is_null($current) ? 5.00 : (float)$current;
        return round(($base + $incoming) / 2.0, 2);
    }

    public function rate(Request $r, Trip $trip)
    {
        $user = $r->user();

        if (is_null($trip->driver_finished_at)) {
            return response()->json(['error'=>'trip_not_finished'], 404);
        }

        $hasAccepted = RideRequest::where([
            'trip_id'=>$trip->id,'user_id'=>$user->id,'status'=>'accepted'
        ])->exists();
        if (!$hasAccepted) return response()->json(['error'=>'forbidden'], 403);

        $data = $r->validate([
            'rating' => ['required','numeric','min:1','max:5'],
            'description' => ['nullable','string','max:2000'],
        ]);
        $incoming = round((float)$data['rating'], 2);

        DB::transaction(function () use ($trip, $user, $incoming, $data) {
            $exists = Rating::where('trip_id',$trip->id)->where('user_id',$user->id)->exists();
            if ($exists) {
                Rating::where('trip_id',$trip->id)->where('user_id',$user->id)
                    ->update(['description'=>$data['description'] ?? null]);
                return;
            }

            Rating::create([
                'trip_id'=>$trip->id,
                'user_id'=>$user->id,
                'rating'=>$incoming,
                'description'=>$data['description'] ?? null,
            ]);

            if (is_null($trip->company_id) && is_null($trip->assigned_driver_id)) {
                $driverUserId = (int)$trip->user_id;

                $cur = DB::table('users')->where('id',$driverUserId)->value('rating');
                DB::table('users')->where('id',$driverUserId)->update(['rating'=>$this->fold((float)$cur, $incoming)]);

                $dcur = DB::table('drivers')->where('user_id',$driverUserId)->value('rating');
                if (!is_null($dcur)) {
                    DB::table('drivers')->where('user_id',$driverUserId)->update(['rating'=>$this->fold((float)$dcur, $incoming)]);
                }
                return;
            }

            $companyId = (int)$trip->company_id;
            $driverId  = (int)$trip->assigned_driver_id;

            $mcur = DB::table('company_members')->where(['company_id'=>$companyId,'user_id'=>$driverId])->value('rating');
            DB::table('company_members')->where(['company_id'=>$companyId,'user_id'=>$driverId])
                ->update(['rating'=>$this->fold(is_null($mcur)?5.00:(float)$mcur, $incoming)]);

            $ccur = DB::table('companies')->where('id',$companyId)->value('rating');
            DB::table('companies')->where('id',$companyId)->update(['rating'=>$this->fold((float)$ccur, $incoming)]);

            $ucur = DB::table('users')->where('id',$driverId)->value('rating');
            DB::table('users')->where('id',$driverId)->update(['rating'=>$this->fold((float)$ucur, $incoming)]);

            $dcur = DB::table('drivers')->where('user_id',$driverId)->value('rating');
            if (!is_null($dcur)) {
                DB::table('drivers')->where('user_id',$driverId)->update(['rating'=>$this->fold((float)$dcur, $incoming)]);
            }
        });

        return response()->json(['data'=>['status'=>'rating_saved']]);
    }
}
