<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\{RideRequest, Trip, Rating};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CompletedTripsController extends Controller
{
    // страница завершённых поездок (можно оставить как есть/свою)
    public function index(Request $r)
    {
        $userId = $r->user()->id;

        $items = RideRequest::query()
            ->with([
                'trip:id,from_addr,to_addr,departure_at,price_amd,driver_finished_at,user_id,company_id,assigned_driver_id',
                'trip.driver:id,name',
                'trip.company:id,name'
            ])
            ->where('user_id',$userId)
            ->where('status','accepted')
            ->whereHas('trip', fn($q)=>$q->whereNotNull('driver_finished_at'))
            ->latest()
            ->paginate(20)
            ->through(function($req) use ($userId){
                $t = $req->trip;
                $my = Rating::where('trip_id',$t->id)->where('user_id',$userId)->first();
                return [
                    'trip' => [
                        'id'=>$t->id,'from_addr'=>$t->from_addr,'to_addr'=>$t->to_addr,
                        'departure_at'=>optional($t->departure_at)->toIso8601String(),
                        'price_amd'=>$t->price_amd,
                        'driver'=>$t->driver->name ?? 'Վարորդ',
                        'company'=>$t->company->name ?? null,
                        'finished'=>!is_null($t->driver_finished_at),
                    ],
                    'my_rating' => $my ? ['rating'=>$my->rating,'description'=>$my->description] : null,
                ];
            });

        return Inertia::render('Client/CompletedTrips', ['items'=>$items]);
    }

    // === СКОЛЬЗЯЩЕЕ СРЕДНЕЕ ТУТ ===
    private function fold(float $currentOrNull, float $incoming): float
    {
        $current = is_null($currentOrNull) ? 5.00 : (float)$currentOrNull; // default 5
        return round( ($current + $incoming) / 2.0, 2);
    }

    public function rate(Request $r, Trip $trip)
    {
        $user = $r->user();

        // можно ставить отзыв только после завершения и если у юзера была принятая заявка на этот trip
        abort_unless(!is_null($trip->driver_finished_at), 404);
        $hasAccepted = RideRequest::where(['trip_id'=>$trip->id,'user_id'=>$user->id,'status'=>'accepted'])->exists();
        abort_unless($hasAccepted, 403);

        $data = $r->validate([
            'rating' => ['required','numeric','min:1','max:5'],
            'description' => ['nullable','string','max:2000'],
        ]);
        $incoming = round((float)$data['rating'], 2);

        DB::transaction(function () use ($trip, $user, $incoming, $data) {
            // единственный отзыв на этот trip от этого пользователя
            $exists = Rating::where('trip_id',$trip->id)->where('user_id',$user->id)->exists();
            if ($exists) {
                // уже ставил — только текст обновим, чтобы не ломать скользящее среднее
                Rating::where('trip_id',$trip->id)->where('user_id',$user->id)
                    ->update(['description'=>$data['description'] ?? null]);
                return; // Никаких пересчётов
            }

            // создаём отзыв
            Rating::create([
                'trip_id' => $trip->id,
                'user_id' => $user->id,
                'rating'  => $incoming,
                'description' => $data['description'] ?? null,
            ]);

            // ==== ОБНОВЛЕНИЯ РЕЙТИНГОВ ПО СКОЛЬЗЯЩЕМУ СРЕДНЕМУ ====

            // SOLO: нет company/assigned → обновляем drivers и users (водителя)
            if (is_null($trip->company_id) && is_null($trip->assigned_driver_id)) {
                $driverUserId = (int)$trip->user_id;

                // users
                $cur = DB::table('users')->where('id',$driverUserId)->value('rating');
                $new = $this->fold((float)$cur, $incoming);
                DB::table('users')->where('id',$driverUserId)->update(['rating'=>$new]);

                // drivers (может не быть — тихо пропускаем)
                $dcur = DB::table('drivers')->where('user_id',$driverUserId)->value('rating');
                $dnew = $this->fold(is_null($dcur)?5.00:(float)$dcur, $incoming);
                DB::table('drivers')->where('user_id',$driverUserId)->update(['rating'=>$dnew]);

                return;
            }

            // COMPANY: есть company_id и assigned_driver_id
            $companyId = (int)$trip->company_id;
            $driverId  = (int)$trip->assigned_driver_id;

            // company_members (конкретный водитель в конкретной компании)
            $mcur = DB::table('company_members')
                ->where(['company_id'=>$companyId,'user_id'=>$driverId])
                ->value('rating');
            $mnew = $this->fold(is_null($mcur)?5.00:(float)$mcur, $incoming);
            DB::table('company_members')
                ->where(['company_id'=>$companyId,'user_id'=>$driverId])
                ->update(['rating'=>$mnew]);

            // companies (в целом)
            $ccur = DB::table('companies')->where('id',$companyId)->value('rating');
            $cnew = $this->fold((float)$ccur, $incoming);
            DB::table('companies')->where('id',$companyId)->update(['rating'=>$cnew]);

            // users — сам назначенный водитель (глобальная карточка пользователя)
            $ucur = DB::table('users')->where('id',$driverId)->value('rating');
            $unew = $this->fold((float)$ucur, $incoming);
            DB::table('users')->where('id',$driverId)->update(['rating'=>$unew]);

            // drivers — если у него есть запись в таблице drivers
            $dcur = DB::table('drivers')->where('user_id',$driverId)->value('rating');
            if (!is_null($dcur)) {
                $dnew = $this->fold((float)$dcur, $incoming);
                DB::table('drivers')->where('user_id',$driverId)->update(['rating'=>$dnew]);
            }
        });

        return back()->with('ok','rating_saved');
    }
}
