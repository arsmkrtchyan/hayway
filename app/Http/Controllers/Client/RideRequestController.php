<?php
// app/Http/Controllers/Client/RideRequestController.php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\{Trip, RideRequest, TripStop};
use App\Services\Geo\DistanceService;
use App\Services\Tariff\TariffCalculator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RideRequestController extends Controller
{
    /**
     * type: AB | A_PAX | PAX_B | PAX_PAX
     * optional meta:
     *  - pickup: {lat,lng,addr}
     *  - drop:   {lat,lng,addr}
     *  - board_stop_id / alight_stop_id (существующие стопы)
     */


    public function store(Request $r, Trip $trip, DistanceService $geo, TariffCalculator $calc, \App\Services\Geo\OsrmService $osrm)
    {
        abort_if($trip->status !== 'published', 404);
        abort_if(!is_null($trip->driver_finished_at), 403);

        $data = $r->validate([
            'type'   => ['required','in:AB,A_PAX,PAX_B,PAX_PAX'],
            'seats'  => ['required','integer','min:1','max:3'],
            'payment'=> ['required','in:cash,card'],
            'description' => ['nullable','string','max:2000'],
            'pickup.lat' => ['nullable','numeric','between:-90,90'],
            'pickup.lng' => ['nullable','numeric','between:-180,180'],
            'pickup.addr'=> ['nullable','string','max:255'],
            'drop.lat'   => ['nullable','numeric','between:-90,90'],
            'drop.lng'   => ['nullable','numeric','between:-180,180'],
            'drop.addr'  => ['nullable','string','max:255'],
            'board_stop_id'  => ['nullable','integer','exists:trip_stops,id'],
            'alight_stop_id' => ['nullable','integer','exists:trip_stops,id'],
            'price_amd'      => ['nullable','integer','min:0'],   // ← ДОБАВЛЕНО
        ]);

        if ($data['type']==='A_PAX'  && (!isset($data['pickup']['lat'],$data['pickup']['lng'])))  return back()->withErrors(['pickup'=>'Нужно указать точку забора'])->withInput();
        if ($data['type']==='PAX_B'  && (!isset($data['drop']['lat'],$data['drop']['lng'])))      return back()->withErrors(['drop'=>'Нужно указать точку высадки'])->withInput();
        if ($data['type']==='PAX_PAX'&& (!isset($data['pickup']['lat'],$data['pickup']['lng'],$data['drop']['lat'],$data['drop']['lng']))) {
            return back()->withErrors(['pickup'=>'Нужны pickup и drop точки'])->withInput();
        }

        $user       = $r->user();
        $delta      = (int)$data['seats'];
        $maxPerUser = 3;

        $meta = ['type'=>$data['type']];
        if ($data['type']==='A_PAX') {
            $dist = $geo->distanceKm((float)$trip->from_lat,(float)$trip->from_lng,(float)$data['pickup']['lat'],(float)$data['pickup']['lng']);
            $res  = $calc->calc($trip->tariffStart(), $dist);
            $meta['pickup'] = $data['pickup'];
            $meta['surcharge_start_amd'] = $res['allowed'] ? (int)$res['surcharge_amd'] : null;
            $meta['start_quote'] = $res;
        }
        if ($data['type']==='PAX_B') {
            $dist = $geo->distanceKm((float)$data['drop']['lat'],(float)$data['drop']['lng'],(float)$trip->to_lat,(float)$trip->to_lng);
            $res  = $calc->calc($trip->tariffEnd(), $dist);
            $meta['drop'] = $data['drop'];
            $meta['surcharge_end_amd'] = $res['allowed'] ? (int)$res['surcharge_amd'] : null;
            $meta['end_quote'] = $res;
        }
        if ($data['type']==='PAX_PAX') {
            $meta['pickup'] = $data['pickup'];
            $meta['drop']   = $data['drop'];
        }
        if (!empty($data['board_stop_id'])) {
            $stop = \App\Models\TripStop::where('trip_id',$trip->id)->where('id',$data['board_stop_id'])->first();
            if ($stop) $meta['board_stop'] = ['id'=>$stop->id,'name'=>$stop->name,'addr'=>$stop->addr,'lat'=>(float)$stop->lat,'lng'=>(float)$stop->lng];
        }
        if (!empty($data['alight_stop_id'])) {
            $stop = \App\Models\TripStop::where('trip_id',$trip->id)->where('id',$data['alight_stop_id'])->first();
            if ($stop) $meta['alight_stop'] = ['id'=>$stop->id,'name'=>$stop->name,'addr'=>$stop->addr,'lat'=>(float)$stop->lat,'lng'=>(float)$stop->lng];
        }

        $extra = function(array $m): int {
            $s1 = isset($m['surcharge_start_amd']) ? (int)$m['surcharge_start_amd'] : 0;
            $s2 = isset($m['surcharge_end_amd'])   ? (int)$m['surcharge_end_amd']   : 0;
            return max(0,$s1+$s2);
        };

        $existing = \App\Models\RideRequest::query()
            ->where('trip_id',$trip->id)->where('user_id',$user->id)
            ->whereIn('status',['pending','accepted'])->latest('id')->first();

        $autoAccept = !empty($trip->company_id);

        if ($existing) {
            if (($existing->seats + $delta) > $maxPerUser) {
                return back()->withErrors(['seats'=>"Մեկ օգտատիրոջ համար առավելագույնը {$maxPerUser} տեղ"])->withInput();
            }

            try {
                DB::transaction(function () use ($existing,$delta,$data,$trip,$autoAccept,$meta,$extra,$osrm) {
                    $t = \App\Models\Trip::where('id',$trip->id)->lockForUpdate()->first();

                    $needToTake = 0;
                    if ($existing->status==='accepted') $needToTake = $delta;
                    elseif ($autoAccept && $existing->status==='pending') $needToTake = $existing->seats + $delta;

                    $free = max(0,(int)$t->seats_total - (int)$t->seats_taken);
                    if ($free < $needToTake) throw \Illuminate\Validation\ValidationException::withMessages(['seats'=>'Անբավարար ազատ տեղեր']);

                    if ($needToTake>0) {
                        $t->increment('seats_taken',$needToTake);
                        if ($existing->status==='pending') { $existing->status='accepted'; $existing->decided_by_user_id=null; $existing->decided_at=null; }
                    }

                    $existing->seats      += $delta;
                    $existing->payment     = $data['payment'];
                    $existing->description = trim(($existing->description?($existing->description."\n"):'').($data['description']??''));
                    $existing->meta = array_merge((array)$existing->meta,$meta);

                    if (array_key_exists('price_amd', $data) && $data['price_amd'] !== null) {
                        $existing->price_amd = max(0, (int)$data['price_amd']);
                        $m2 = (array)$existing->meta; $m2['client_quote_amd'] = (int)$data['price_amd'];
                        $existing->meta = $m2;
                    } else {
                        $existing->price_amd = max(0, (int)$existing->seats * (int)$t->price_amd + $extra((array)$existing->meta));
                    }
                    $existing->save();

                    // если авто-принятие и есть точки — сразу пересоберём stops + ETA
                    if ($autoAccept) {
                        $m = (array)$existing->meta;
                        $toAdd = [];
                        $mk = fn($p)=> (isset($p['lat'],$p['lng'])) ? ['lat'=>(float)$p['lat'],'lng'=>(float)$p['lng'],'name'=>$p['name']??null,'addr'=>$p['addr']??null,'_type'=>'stop'] : null;
                        if (!empty($m['pickup'])) $toAdd[] = $mk($m['pickup']);
                        if (!empty($m['drop']))   $toAdd[] = $mk($m['drop']);
                        $toAdd = array_values(array_filter($toAdd));

                        if ($toAdd) {
                            $from = ['lat'=>(float)$t->from_lat,'lng'=>(float)$t->from_lng,'_type'=>'from'];
                            $to   = ['lat'=>(float)$t->to_lat,  'lng'=>(float)$t->to_lng,  '_type'=>'to'];
                            $existingStops = $t->stops()->orderBy('position')->get(['lat','lng','name','addr'])
                                ->map(fn($s)=>['lat'=>(float)$s->lat,'lng'=>(float)$s->lng,'name'=>$s->name,'addr'=>$s->addr,'_type'=>'stop'])->all();
                            $optimized = $osrm->optimizeBetween($from, array_merge($existingStops,$toAdd), $to);
                            $newStops=[]; foreach($optimized as $p){ if(($p['_type']??'')==='stop'){ $newStops[]=['lat'=>$p['lat'],'lng'=>$p['lng'],'name'=>$p['name']??null,'addr'=>$p['addr']??null]; } }
                            $newStops = array_slice($newStops,0,10);
                            $t->stops()->delete();
                            foreach($newStops as $i=>$row){ $t->stops()->create($row+['position'=>$i+1]); }
                            $dur = $osrm->routeDurationSec(array_map(fn($p)=>['lat'=>$p['lat'],'lng'=>$p['lng']], array_merge([$from], $optimized, [$to])));
                            if ($dur) $t->update(['eta_sec'=>(int)$dur]);
                        }
                    }
                });
            } catch (\Illuminate\Validation\ValidationException $e) {
                return back()->withErrors($e->errors())->withInput();
            }

            return back()->with('ok','request_updated');
        }

        // новая заявка
        try {
            DB::transaction(function () use ($trip,$user,$delta,$data,$autoAccept,$meta,$extra,$osrm) {
                $t = \App\Models\Trip::where('id',$trip->id)->lockForUpdate()->first();

                $free = max(0,(int)$t->seats_total - (int)$t->seats_taken);
                if ($free < $delta) throw \Illuminate\Validation\ValidationException::withMessages(['seats'=>'Անբավարար ազատ տեղեր']);

                $status = $autoAccept ? 'accepted' : 'pending';
                $base   = $delta * (int)$t->price_amd;
                $total  = max(0, $base + $extra($meta));

                $finalPrice = array_key_exists('price_amd', $data) && $data['price_amd'] !== null
                    ? max(0, (int)$data['price_amd'])
                    : $total;

// опционально сохраним оффер клиента
                if (array_key_exists('price_amd', $data) && $data['price_amd'] !== null) {
                    $meta['client_quote_amd'] = (int)$data['price_amd'];
                }

                $req = \App\Models\RideRequest::create([
                    'trip_id'=>$t->id,
                    'user_id'=>$user->id,
                    'created_by_user_id'=>$user->id,
                    'passenger_name'=>$user->name,
                    'phone'=>$user->number,
                    'description'=>$data['description'] ?? null,
                    'seats'=>$delta,
                    'payment'=>$data['payment'],
                    'status'=>$status,
                    'meta'=>$meta,
                    'price_amd'=>$finalPrice, // ← теперь берём из клиента, если пришёл
                ]);


                if ($autoAccept) {
                    $t->increment('seats_taken',$delta);

                    // сразу вшиваем точки в stops + ETA
                    $m = (array)$meta;
                    $toAdd=[]; $mk=fn($p)=> (isset($p['lat'],$p['lng']))?['lat'=>(float)$p['lat'],'lng'=>(float)$p['lng'],'name'=>$p['name']??null,'addr'=>$p['addr']??null,'_type'=>'stop']:null;
                    if (!empty($m['pickup'])) $toAdd[]=$mk($m['pickup']);
                    if (!empty($m['drop']))   $toAdd[]=$mk($m['drop']);
                    $toAdd=array_values(array_filter($toAdd));
                    if ($toAdd){
                        $from=['lat'=>(float)$t->from_lat,'lng'=>(float)$t->from_lng,'_type'=>'from'];
                        $to=['lat'=>(float)$t->to_lat,'lng'=>(float)$t->to_lng,'_type'=>'to'];
                        $existing=$t->stops()->orderBy('position')->get(['lat','lng','name','addr'])
                            ->map(fn($s)=>['lat'=>(float)$s->lat,'lng'=>(float)$s->lng,'name'=>$s->name,'addr'=>$s->addr,'_type'=>'stop'])->all();
                        $optimized=$osrm->optimizeBetween($from,array_merge($existing,$toAdd),$to);
                        $newStops=[]; foreach($optimized as $p){ if(($p['_type']??'')==='stop'){ $newStops[]=['lat'=>$p['lat'],'lng'=>$p['lng'],'name'=>$p['name']??null,'addr'=>$p['addr']??null];}}
                        $newStops=array_slice($newStops,0,10);
                        $t->stops()->delete(); foreach($newStops as $i=>$row){ $t->stops()->create($row+['position'=>$i+1]); }
                        $dur=$osrm->routeDurationSec(array_map(fn($p)=>['lat'=>$p['lat'],'lng'=>$p['lng']], array_merge([$from],$optimized,[$to])));
                        if ($dur) $t->update(['eta_sec'=>(int)$dur]);
                    }
                }
            });
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->withErrors($e->errors())->withInput();
        }

        return back()->with('ok', $autoAccept ? 'request_accepted' : 'request_sent');
    }


}
