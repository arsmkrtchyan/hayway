<?php
//
//namespace App\Http\Controllers\Client;
//
//use App\Http\Controllers\Controller;
//use App\Models\{Trip, Rating, AmenityCategory};
//use Illuminate\Support\Facades\DB;
//use Inertia\Inertia;
//
//class TripShowController extends Controller
//{
//    public function show(Trip $trip)
//    {
//        abort_if($trip->status !== 'published' && !auth()->check(), 404);
//
//        $trip->load([
//            'vehicle:id,brand,model,color,plate,user_id',
//            'amenities:id,amenity_category_id,name,slug,icon',
//            'stops:id,trip_id,position,name,addr,lat,lng',
//            'driver:id,name,rating',
//            'company:id,name,rating',
//        ])->loadCount([
//            'rideRequests as pending_requests_count' => fn($q)=>$q->where('status','pending'),
//        ]);
//
//        $isCompany   = (bool)$trip->company_id;
//        $driverUserId = $trip->assigned_driver_id ?: $trip->user_id;
//
//        $driverTripsDone = Trip::query()
//            ->when($isCompany===false, fn($q)=>$q->where(fn($qq)=>$qq->where('user_id',$driverUserId)->orWhere('assigned_driver_id',$driverUserId)))
//            ->when($isCompany===true,  fn($q)=>$q->where('company_id',$trip->company_id))
//            ->where('driver_state','done')->count();
//
//        $amenityCategoryIds = $trip->amenities->pluck('amenity_category_id')->unique()->values();
//        $catNames = \App\Models\AmenityCategory::whereIn('id',$amenityCategoryIds)->pluck('name','id');
//        $amenitiesByCat = [];
//        foreach ($amenityCategoryIds as $cid) {
//            $amenitiesByCat[] = [
//                'id'=>(int)$cid,
//                'name'=>(string)($catNames[$cid] ?? 'Կատեգորիա'),
//                'items'=>$trip->amenities->where('amenity_category_id',$cid)->map(fn($a)=>[
//                    'id'=>$a->id,'name'=>$a->name,'slug'=>$a->slug,'icon'=>$a->icon
//                ])->values(),
//            ];
//        }
//
//        $reviewsQ = \App\Models\Rating::query()
//            ->select('ratings.id','ratings.rating','ratings.description','ratings.created_at')
//            ->join('trips','trips.id','=','ratings.trip_id');
//
//        if ($isCompany) {
//            $reviewsQ->where('trips.company_id',$trip->company_id);
//            $ratingValue = (float) ($trip->company->rating ?? 5);
//        } else {
//            $reviewsQ->where(fn($q)=>$q->where('ratings.user_id',$driverUserId)->orWhere('trips.user_id',$driverUserId)->orWhere('trips.assigned_driver_id',$driverUserId));
//            $ratingValue = (float) ($trip->driver->rating ?? 5);
//        }
//
//        $reviewsTotal = (clone $reviewsQ)->count();
//        $reviews = $reviewsQ->latest('ratings.id')->limit(6)->get()->map(fn($r)=>[
//            'id'=>(int)$r->id,'rating'=>(float)$r->rating,'text'=>(string)($r->description ?? ''),'date'=>optional($r->created_at)->toIso8601String(),
//        ]);
//
//        // Маршрут/маркеры с приватностью
//        $points = $trip->routePointsFor(auth()->user())->values();
//        $polyline = $points->map(fn($p)=>['lat'=>$p['lat'],'lng'=>$p['lng']])->values();
//        $markers  = $points->filter(fn($p)=>$p['public'])->map(fn($p)=>[
//            'lat'=>$p['lat'],'lng'=>$p['lng'],'source'=>$p['source']
//        ])->values();
//
//        $payload = [
//            'id'=>(int)$trip->id,
//            'from'=>(string)$trip->from_addr,
//            'to'=>(string)$trip->to_addr,
//            'from_lat'=>(float)($trip->from_lat ?? 0),
//            'from_lng'=>(float)($trip->from_lng ?? 0),
//            'to_lat'=>(float)($trip->to_lat ?? 0),
//            'to_lng'=>(float)($trip->to_lng ?? 0),
//            'departure_at'=>optional($trip->departure_at)->toIso8601String(),
//            'price_amd'=>(int)$trip->price_amd,
//            'seats_total'=>(int)$trip->seats_total,
//            'seats_taken'=>(int)$trip->seats_taken,
//            'pending_requests_count'=>(int)($trip->pending_requests_count ?? 0),
//            'pay_methods'=>$trip->pay_methods ?? [],
//            // старые stops можно оставить, но на фронте используем polyline/markers
//            'stops'=>$trip->stops->sortBy('position')->values()->map(fn($s)=>[
//                'position'=>(int)$s->position,'name'=>$s->name,'addr'=>$s->addr,'lat'=>(float)$s->lat,'lng'=>(float)$s->lng
//            ]),
//            'is_company'=>$isCompany,
//            'actor'=>$isCompany ? [
//                'type'=>'company','name'=>(string)($trip->company->name ?? 'Ընկերություն'),
//                'rating'=>(float)($trip->company->rating ?? 5),'trips'=>(int)$driverTripsDone,
//            ] : [
//                'type'=>'driver','name'=>(string)($trip->driver->name ?? 'Վարորդ'),
//                'rating'=>(float)($trip->driver->rating ?? 5),'trips'=>(int)$driverTripsDone,
//            ],
//            'vehicle'=>[
//                'brand'=>$trip->vehicle->brand ?? null,'model'=>$trip->vehicle->model ?? null,
//                'color'=>$trip->vehicle->color ?? null,'plate'=>$trip->vehicle->plate ?? null,
//            ],
//            'amenitiesByCat'=>$amenitiesByCat,
//            'reviews'=>[
//                'summary'=>['rating'=>$ratingValue,'trips'=>(int)$driverTripsDone,'count'=>(int)$reviewsTotal],
//                'items'=>$reviews,
//            ],
//            // новое:
//            'route_polyline'=>$polyline,
//            'route_markers'=>$markers,
//        ];
//
//        return Inertia::render('Client/TripShow', [
//            'trip'=>$payload,
//            'eta_sec'=>(int)($trip->eta_sec ?? 0),
//        ]);
//    }
//
//
//}


namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use Inertia\Inertia;

class TripShowController extends Controller
{
    public function show(Trip $trip)
    {
        abort_if($trip->status !== 'published' && !auth()->check(), 404);

        $trip->load([
            'vehicle:id,brand,model,color,plate,user_id',
            'amenities:id,amenity_category_id,name,slug,icon',
            'stops:id,trip_id,position,name,addr,lat,lng',
            'driver:id,name,rating',
            'company:id,name,rating',
        ])->loadCount([
            'rideRequests as pending_requests_count' => fn($q) => $q->where('status', 'pending'),
        ]);

        $isCompany = (bool)$trip->company_id;
        $driverUserId = $trip->assigned_driver_id ?: $trip->user_id;

        $driverTripsDone = Trip::query()
            ->when($isCompany === false, fn($q) => $q->where(fn($qq) => $qq->where('user_id', $driverUserId)->orWhere('assigned_driver_id', $driverUserId)))
            ->when($isCompany === true, fn($q) => $q->where('company_id', $trip->company_id))
            ->where('driver_state', 'done')->count();

        $amenityCategoryIds = $trip->amenities->pluck('amenity_category_id')->unique()->values();
        $catNames = \App\Models\AmenityCategory::whereIn('id', $amenityCategoryIds)->pluck('name', 'id');
        $amenitiesByCat = [];
        foreach ($amenityCategoryIds as $cid) {
            $amenitiesByCat[] = [
                'id' => (int)$cid,
                'name' => (string)($catNames[$cid] ?? 'Կատեգորիա'),
                'items' => $trip->amenities->where('amenity_category_id', $cid)->map(fn($a) => [
                    'id' => $a->id, 'name' => $a->name, 'slug' => $a->slug, 'icon' => $a->icon
                ])->values(),
            ];
        }

        // отзывы (коротко)
        $reviewsQ = \App\Models\Rating::query()
            ->select('ratings.id', 'ratings.rating', 'ratings.description', 'ratings.created_at')
            ->join('trips', 'trips.id', '=', 'ratings.trip_id');

        if ($isCompany) {
            $reviewsQ->where('trips.company_id', $trip->company_id);
            $ratingValue = (float)($trip->company->rating ?? 5);
        } else {
            $reviewsQ->where(fn($q) => $q->where('ratings.user_id', $driverUserId)->orWhere('trips.user_id', $driverUserId)->orWhere('trips.assigned_driver_id', $driverUserId));
            $ratingValue = (float)($trip->driver->rating ?? 5);
        }

        $reviewsTotal = (clone $reviewsQ)->count();
        $reviews = $reviewsQ->latest('ratings.id')->limit(6)->get()->map(fn($r) => [
            'id' => (int)$r->id, 'rating' => (float)$r->rating, 'text' => (string)($r->description ?? ''), 'date' => optional($r->created_at)->toIso8601String(),
        ]);

        // Маршрут/маркеры с приватностью
        $points = $trip->routePointsFor(auth()->user())->values();
        $polyline = $points->map(fn($p) => ['lat' => $p['lat'], 'lng' => $p['lng']])->values();
        $markers = $points->filter(fn($p) => $p['public'])->map(fn($p) => [
            'lat' => $p['lat'], 'lng' => $p['lng'], 'source' => $p['source']
        ])->values();

        // Тарифы (включаем ВСЕ поля как числа или null)
        $tariffStart = [
            'free_km' => is_numeric($trip->start_free_km) ? (float)$trip->start_free_km : null,
            'amd_per_km' => is_numeric($trip->start_amd_per_km) ? (float)$trip->start_amd_per_km : null,
            'max_km' => is_numeric($trip->start_max_km) ? (float)$trip->start_max_km : null,
        ];
        $tariffEnd = [
            'free_km' => is_numeric($trip->end_free_km) ? (float)$trip->end_free_km : null,
            'amd_per_km' => is_numeric($trip->end_amd_per_km) ? (float)$trip->end_amd_per_km : null,
            'max_km' => is_numeric($trip->end_max_km) ? (float)$trip->end_max_km : null,
        ];

        $payload = [
            'id' => (int)$trip->id,
            'from' => (string)$trip->from_addr,
            'to' => (string)$trip->to_addr,
            'from_lat' => (float)($trip->from_lat ?? 0),
            'from_lng' => (float)($trip->from_lng ?? 0),
            'to_lat' => (float)($trip->to_lat ?? 0),
            'to_lng' => (float)($trip->to_lng ?? 0),
            'departure_at' => optional($trip->departure_at)->toIso8601String(),
            'price_amd' => (int)$trip->price_amd,
            'seats_total' => (int)$trip->seats_total,
            'seats_taken' => (int)$trip->seats_taken,
            'pending_requests_count' => (int)($trip->pending_requests_count ?? 0),
            'pay_methods' => $trip->pay_methods ?? [],
            'is_company' => $isCompany,
            'type_key' => $trip->typeKey(), // <- ВАЖНО

            // Тарифы: и плоско, и структурой (на фронте удобно любое)
            'start_free_km' => $tariffStart['free_km'],
            'start_amd_per_km' => $tariffStart['amd_per_km'],
            'start_max_km' => $tariffStart['max_km'],
            'end_free_km' => $tariffEnd['free_km'],
            'end_amd_per_km' => $tariffEnd['amd_per_km'],
            'end_max_km' => $tariffEnd['max_km'],
            'tariffs' => [
                'start' => $tariffStart,
                'end' => $tariffEnd,
            ],

            'actor' => $isCompany ? [
                'type' => 'company', 'name' => (string)($trip->company->name ?? 'Ընկերություն'),
                'rating' => (float)($trip->company->rating ?? 5), 'trips' => (int)$driverTripsDone,
            ] : [
                'type' => 'driver', 'name' => (string)($trip->driver->name ?? 'Վարորդ'),
                'rating' => (float)($trip->driver->rating ?? 5), 'trips' => (int)$driverTripsDone,
            ],
            'vehicle' => [
                'brand' => $trip->vehicle->brand ?? null, 'model' => $trip->vehicle->model ?? null,
                'color' => $trip->vehicle->color ?? null, 'plate' => $trip->vehicle->plate ?? null,
            ],
            'amenitiesByCat' => $amenitiesByCat,
            'reviews' => [
                'summary' => ['rating' => $ratingValue, 'trips' => (int)$driverTripsDone, 'count' => (int)$reviewsTotal],
                'items' => $reviews,
            ],

            // маршрут
            'route_polyline' => $polyline,
            'route_markers' => $markers,

            // для совместимости (если используете старые stops где-то)
            'stops' => $trip->stops->sortBy('position')->values()->map(fn($s) => [
                'position' => (int)$s->position, 'name' => $s->name, 'addr' => $s->addr, 'lat' => (float)$s->lat, 'lng' => (float)$s->lng
            ]),
        ];

        return Inertia::render('Client/TripShow', [
            'trip' => $payload,
            'eta_sec' => (int)($trip->eta_sec ?? 0),
        ]);
    }
}
