<?php

namespace App\Http\Controllers\Api\Clientv2;

use App\Http\Controllers\Controller;
use App\Models\{Trip, AmenityCategory, Rating};
use Illuminate\Http\Request;
use Carbon\Carbon;

class TripApiController extends Controller
{
    public function index(Request $r)
    {
        $q = Trip::query()
            ->with([
                'vehicle:id,brand,model,color,plate,seats,user_id',
                'driver:id,name',
                'amenities:id,amenity_category_id,name,slug,icon',
            ])
            ->where('status','published')
            ->whereNull('driver_finished_at')
            ->withCount([
                'rideRequests as pending_requests_count' => fn($qq) => $qq->where('status','pending'),
            ]);

        if ($r->filled('from')) $q->where('from_addr','like','%'.$r->string('from').'%');
        if ($r->filled('to'))   $q->where('to_addr','like','%'.$r->string('to').'%');

        if ($r->filled('date')) {
            try {
                $d = Carbon::parse($r->string('date'));
                $q->whereBetween('departure_at', [$d->copy()->startOfDay(), $d->copy()->endOfDay()]);
            } catch (\Throwable $e) {}
        }

        if ($r->filled('max_price')) $q->where('price_amd','<=',(int)$r->max_price);
        if ($r->filled('pay')) $q->whereJsonContains('pay_methods',$r->string('pay'));
        if ($r->filled('seats')) {
            $need = max(1,(int)$r->seats);
            $q->whereRaw('(seats_total - seats_taken) >= ?', [$need]);
        }

        // amenities=1,2,5  → должен содержать все
        $amenities = collect(explode(',', (string)$r->get('amenities','')))
            ->map(fn($v)=>(int)$v)->filter(fn($v)=>$v>0)->values();
        if ($amenities->isNotEmpty()) {
            $q->whereHas('amenities', function($qq) use ($amenities) {
                $qq->whereIn('amenities.id', $amenities);
            }, '>=', $amenities->count());
        }

        // sort
        $sort = (string)$r->get('sort','departure_at');
        if ($sort === '-price') $q->orderByDesc('price_amd');
        elseif ($sort === 'price') $q->orderBy('price_amd');
        else $q->orderBy('departure_at');

        $perPage = max(1, min(50, (int)$r->input('page.size', 12)));
        $list = $q->paginate($perPage)->withQueryString();

        $data = $list->getCollection()->map(function (Trip $t) {
            return [
                'id' => (int)$t->id,
                'from_addr' => (string)$t->from_addr,
                'to_addr'   => (string)$t->to_addr,
                'from_lat'  => (float)($t->from_lat ?? 0),
                'from_lng'  => (float)($t->from_lng ?? 0),
                'to_lat'    => (float)($t->to_lat ?? 0),
                'to_lng'    => (float)($t->to_lng ?? 0),
                'departure_at' => optional($t->departure_at)->toIso8601String(),
                'price_amd'    => (int)$t->price_amd,
                'seats_total'  => (int)$t->seats_total,
                'seats_taken'  => (int)$t->seats_taken,
                'pending_requests_count' => (int)($t->pending_requests_count ?? 0),
                'vehicle' => [
                    'brand' => $t->vehicle->brand ?? null,
                    'model' => $t->vehicle->model ?? null,
                    'plate' => $t->vehicle->plate ?? null,
                    'color' => $t->vehicle->color ?? '#ffdd2c',
                    'seats' => $t->vehicle->seats ?? null,
                ],
                'driver' => ['name' => $t->driver->name ?? 'Վարորդ'],
                'pay_methods' => $t->pay_methods ?? [],
                'amenities' => $t->amenities->map(fn($a)=>[
                    'id'=>$a->id,'name'=>$a->name,'slug'=>$a->slug,'icon'=>$a->icon
                ])->values(),
            ];
        })->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'page' => $list->currentPage(),
                'per_page' => $list->perPage(),
                'total' => $list->total(),
                'last_page' => $list->lastPage(),
            ],
        ]);
    }

    public function show(Trip $trip)
    {
        if ($trip->status !== 'published' && !auth()->check()) {
            abort(404);
        }

        $trip->load([
            'vehicle:id,brand,model,color,plate,user_id',
            'amenities:id,amenity_category_id,name,slug,icon',
            'stops:id,trip_id,position,name,addr,lat,lng',
            'driver:id,name,rating',
            'company:id,name,rating',
        ])->loadCount([
            'rideRequests as pending_requests_count' => fn($q) => $q->where('status','pending'),
        ]);

        $isCompany = (bool)$trip->company_id;
        $driverUserId = $trip->assigned_driver_id ?: $trip->user_id;

        $driverTripsDone = Trip::query()
            ->when(!$isCompany, fn($q)=>$q->where(fn($qq)=>$qq
                ->where('user_id',$driverUserId)->orWhere('assigned_driver_id',$driverUserId)))
            ->when($isCompany, fn($q)=>$q->where('company_id',$trip->company_id))
            ->where('driver_state','done')
            ->count();

        $amenityCategoryIds = $trip->amenities->pluck('amenity_category_id')->unique()->values();
        $catNames = AmenityCategory::whereIn('id',$amenityCategoryIds)->pluck('name','id');
        $amenitiesByCat = [];
        foreach ($amenityCategoryIds as $cid) {
            $amenitiesByCat[] = [
                'id'=>(int)$cid,
                'name'=>(string)($catNames[$cid] ?? 'Կատեգորիա'),
                'items'=>$trip->amenities->where('amenity_category_id',$cid)->map(fn($a)=>[
                    'id'=>$a->id,'name'=>$a->name,'slug'=>$a->slug,'icon'=>$a->icon
                ])->values(),
            ];
        }

        $reviewsQ = Rating::query()
            ->select('ratings.id','ratings.rating','ratings.description','ratings.created_at')
            ->join('trips','trips.id','=','ratings.trip_id');

        if ($isCompany) {
            $reviewsQ->where('trips.company_id',$trip->company_id);
            $ratingValue = (float)($trip->company->rating ?? 5);
        } else {
            $reviewsQ->where(fn($q)=>$q
                ->where('ratings.user_id',$driverUserId)
                ->orWhere('trips.user_id',$driverUserId)
                ->orWhere('trips.assigned_driver_id',$driverUserId));
            $ratingValue = (float)($trip->driver->rating ?? 5);
        }

        $reviewsTotal = (clone $reviewsQ)->count();
        $reviews = $reviewsQ->latest('ratings.id')->limit(6)->get()->map(fn($r)=>[
            'id'=>(int)$r->id,
            'rating'=>(float)$r->rating,
            'text'=>(string)($r->description ?? ''),
            'date'=>optional($r->created_at)->toIso8601String(),
        ]);

        return response()->json([
            'data' => [
                'id'=>(int)$trip->id,
                'from'=>(string)$trip->from_addr,
                'to'=>(string)$trip->to_addr,
                'from_lat'=>(float)($trip->from_lat ?? 0),
                'from_lng'=>(float)($trip->from_lng ?? 0),
                'to_lat'=>(float)($trip->to_lat ?? 0),
                'to_lng'=>(float)($trip->to_lng ?? 0),
                'departure_at'=>optional($trip->departure_at)->toIso8601String(),
                'price_amd'=>(int)$trip->price_amd,
                'seats_total'=>(int)$trip->seats_total,
                'seats_taken'=>(int)$trip->seats_taken,
                'pending_requests_count'=>(int)($trip->pending_requests_count ?? 0),
                'pay_methods'=>$trip->pay_methods ?? [],
                'stops'=>$trip->stops->sortBy('position')->values()->map(fn($s)=>[
                    'position'=>(int)$s->position,'name'=>$s->name,'addr'=>$s->addr,
                    'lat'=>(float)$s->lat,'lng'=>(float)$s->lng
                ]),
                'is_company'=>$isCompany,
                'actor'=>$isCompany ? [
                    'type'=>'company','name'=>$trip->company->name ?? 'Ընկերություն',
                    'rating'=>(float)($trip->company->rating ?? 5),
                    'trips'=>(int)$driverTripsDone,
                ] : [
                    'type'=>'driver','name'=>$trip->driver->name ?? 'Վարորդ',
                    'rating'=>(float)($trip->driver->rating ?? 5),
                    'trips'=>(int)$driverTripsDone,
                ],
                'vehicle'=>[
                    'brand'=>$trip->vehicle->brand ?? null,
                    'model'=>$trip->vehicle->model ?? null,
                    'color'=>$trip->vehicle->color ?? null,
                    'plate'=>$trip->vehicle->plate ?? null,
                ],
                'amenitiesByCat'=>$amenitiesByCat,
                'reviews'=>[
                    'summary'=>[
                        'rating'=>$ratingValue,
                        'trips'=>(int)$driverTripsDone,
                        'count'=>(int)$reviewsTotal,
                    ],
                    'items'=>$reviews,
                ],
            ],
        ]);
    }

    public function amenityFilters()
    {
        $cats = AmenityCategory::query()
            ->where('is_active', true)
            ->with(['amenities'=>fn($q)=>$q->where('is_active',true)->orderBy('sort_order')->orderBy('id')])
            ->orderBy('sort_order')->orderBy('id')
            ->get(['id','name','slug','sort_order','is_active'])
            ->map(fn($c)=>[
                'id'=>$c->id,
                'name'=>$c->name,
                'slug'=>$c->slug,
                'amenities'=>$c->amenities->map(fn($a)=>[
                    'id'=>$a->id,'name'=>$a->name,'slug'=>$a->slug,'icon'=>$a->icon
                ])->values(),
            ])->values();

        return response()->json(['data'=>$cats]);
    }
}
