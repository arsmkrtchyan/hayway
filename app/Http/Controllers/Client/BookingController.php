<?php
////
////namespace App\Http\Controllers\Client;
////
////use App\Http\Controllers\Controller;
////use App\Models\{Trip, RideRequest};
////use Illuminate\Http\Request;
////
////use Inertia\Inertia;
////class BookingController extends Controller
////{
////    public function store(Request $r, Trip $trip)
////    {
////        abort_if($trip->status !== 'published', 404);
////        $user = auth()->user();
////
////        $data = $r->validate([
////
////            'description'   =>  ['required', 'string'],
////            'seats'          => ['required','integer','min:1','max:3'],
////            'payment'        => ['required','in:cash,card'],
////        ]);
////
////        // проверка доступности мест (учитываем только принятые места seats_taken)
////        $free = $trip->seats_total - $trip->seats_taken;
////        if ($free < $data['seats']) {
////            return back()->withErrors(['seats' => 'Անբավարար ազատ տեղեր'])->withInput();
////        }
////
////        RideRequest::create([
////            'trip_id'        => $trip->id,
////            'user_id'        => auth()->id(),           // автор заявки
////            'passenger_name' => $user->name,
////            'phone'          => $user->number,
////            'description'    => $data['description'],
////            'seats'          => $data['seats'],
////            'payment'        => $data['payment'],
////            'status'         => 'pending',
////            'meta'           => null,
////        ]);
////
////        return back()->with('ok', 'request_sent');
////    }
////    public function show(RideRequest $request)
////    {
////        abort_unless($request->user_id === auth()->id(), 404);
////
////        $trip = Trip::query()
////            ->with(['stops:id,trip_id,lat,lng,position,name,addr','vehicle:id,brand,model,plate,color'])
////            ->findOrFail($request->trip_id);
////
////        $booking = [
////            'id'        => $request->id,
////            'code'      => $request->id, // либо свой генератор кода
////            'status'    => $request->status,          // pending|accepted|rejected|cancelled
////            'seats'     => (int)$request->seats,
////            'payment'   => $request->payment,         // cash|card
////            'created_at'=> optional($request->created_at)->toIso8601String(),
////            'passenger' => ['name'=>$request->passenger_name, 'phone'=>$request->phone],
////            'trip' => [
////                'id' => $trip->id,
////                'from' => (string)$trip->from_addr,
////                'to'   => (string)$trip->to_addr,
////                'from_lat'=>(float)$trip->from_lat, 'from_lng'=>(float)$trip->from_lng,
////                'to_lat'  =>(float)$trip->to_lat,   'to_lng'  =>(float)$trip->to_lng,
////                'departure_at'=> optional($trip->departure_at)->toIso8601String(),
////                'price_amd'   => (int)$trip->price_amd,
////                'seats_total' => (int)$trip->seats_total,
////                'seats_taken' => (int)$trip->seats_taken,
////                'stops' => $trip->stops->map(fn($s)=>[
////                    'position'=>$s->position, 'lat'=>(float)$s->lat, 'lng'=>(float)$s->lng,
////                    'name'=>$s->name, 'addr'=>$s->addr,
////                ])->values(),
////                'policy' => ['cancelMinBefore'=>30], // если нужно
////            ],
////        ];
////
////        return Inertia::render('Client/BookingShow', ['booking'=>$booking]);
////    }
////
////}
//
//
//namespace App\Http\Controllers\Client;
//
//use App\Http\Controllers\Controller;
//use App\Models\{Trip, RideRequest};
//use Illuminate\Http\Request;
//use Inertia\Inertia;
//
//class BookingController extends Controller
//{
//    /**
//     * Бронирование/добавление мест.
//     * Если у пользователя уже есть его RideRequest по этому trip (pending/accepted),
//     * то не создаём новый — увеличиваем seats в существующем (но не более 3 суммарно).
//     */
//    public function store(Request $r, Trip $trip)
//    {
//        abort_if($trip->status !== 'published', 404);
//
//        $data = $r->validate([
//            'description' => ['required', 'string'],
//            'seats' => ['required', 'integer', 'min:1', 'max:3'],
//            'payment' => ['required', 'in:cash,card'],
//        ]);
//
//        $user = $r->user();
//        $free = max(0, (int)$trip->seats_total - (int)$trip->seats_taken); // считаем принятые места
//        $delta = (int)$data['seats'];
//        $maxPerUser = 3;
//
//        // ищем любой активный RR (pending/accepted) этого пользователя по этому trip
//        $existing = RideRequest::query()
//            ->where('trip_id', $trip->id)
//            ->where('user_id', $user->id)
//            ->whereIn('status', ['pending', 'accepted'])
//            ->latest('id')
//            ->first();
//
//        if ($existing) {
//            // лимит на пользователя
//            if (($existing->seats + $delta) > $maxPerUser) {
//                return back()
//                    ->withErrors(['seats' => "Մեկ օգտատիրոջ համար առավելագույնը {$maxPerUser} տեղ"])
//                    ->withInput();
//            }
//            // проверяем наличие свободных мест под ДОПОЛНИТЕЛЬНЫЕ места
//            if ($free < $delta) {
//                return back()->withErrors(['seats' => 'Անբավարար ազատ տեղեր'])->withInput();
//            }
//
//            // увеличиваем места в текущей заявке, объединяя описания
//            $existing->seats += $delta;
//            $existing->payment = $data['payment'];
//            $existing->description = trim(($existing->description ? ($existing->description . "\n") : '') . $data['description']);
//
//            // статус оставляем как есть. Водитель увидит обновлённое количество.
//            $existing->save();
//
//            return back()->with('ok', 'request_updated');
//        }
//
//        // новой заявки ещё нет — создаём
//        if ($free < $delta) {
//            return back()->withErrors(['seats' => 'Անբավարար ազատ տեղեր'])->withInput();
//        }
//
//        RideRequest::create([
//            'trip_id' => $trip->id,
//            'user_id' => $user->id,
//            'passenger_name' => $user->name,
//            'phone' => $user->number,
//            'description' => $data['description'],
//            'seats' => $delta,
//            'payment' => $data['payment'],
//            'status' => 'pending',
//            'meta' => null,
//        ]);
//
//        return back()->with('ok', 'request_sent');
//    }
//
//    /**
//     * Страница просмотра своей брони
//     */
//    public function show(RideRequest $request)
//    {
//        abort_unless($request->user_id === auth()->id(), 404);
//
//        if ($request->status === 'deleted') {
//            return redirect()->route('client.requests');
//        }
//
//
//        $trip = Trip::query()
//            ->with([
//                'stops:id,trip_id,lat,lng,position,name,addr',
//                'vehicle:id,brand,model,plate,color'
//            ])
//            ->findOrFail($request->trip_id);
//
//        $freeAvailable = max(0, (int)$trip->seats_total - (int)$trip->seats_taken);
//
//        $booking = [
//            'id' => $request->id,
//            'code' => 'TX-' . $request->id, // при желании поменяй
//            'status' => $request->status,   // pending|accepted|rejected|cancelled
//            'seats' => (int)$request->seats,
//            'payment' => $request->payment,  // cash|card
//            'created_at' => optional($request->created_at)->toIso8601String(),
//            'passenger' => ['name' => $request->passenger_name, 'phone' => $request->phone],
//            'trip' => [
//                'id' => $trip->id,
//                'from' => (string)$trip->from_addr,
//                'to' => (string)$trip->to_addr,
//                'from_lat' => (float)$trip->from_lat,
//                'from_lng' => (float)$trip->from_lng,
//                'to_lat' => (float)$trip->to_lat,
//                'to_lng' => (float)$trip->to_lng,
//                'departure_at' => optional($trip->departure_at)->toIso8601String(),
//                'price_amd' => (int)$trip->price_amd,
//                'seats_total' => (int)$trip->seats_total,
//                'seats_taken' => (int)$trip->seats_taken,
//                'free_available' => (int)$freeAvailable,
//                'stops' => $trip->stops->sortBy('position')->values()->map(fn($s) => [
//                    'position' => $s->position,
//                    'lat' => (float)$s->lat,
//                    'lng' => (float)$s->lng,
//                    'name' => $s->name,
//                    'addr' => $s->addr,
//                ]),
//                'policy' => ['cancelMinBefore' => 30],
//            ],
//        ];
//
//        return Inertia::render('Client/BookingShow', ['booking' => $booking]);
//    }
//}
namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\{Trip, RideRequest};
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
class BookingController extends Controller
{


    public function store(Request $r, Trip $trip)
    {
        abort_if($trip->status !== 'published', 404);
        abort_if(!is_null($trip->driver_finished_at), 403);

        $data = $r->validate([
            'description' => ['required', 'string'],
            'seats'       => ['required', 'integer', 'min:1', 'max:3'],
            'payment'     => ['required', 'in:cash,card'],
        ]);

        $user       = $r->user();
        $delta      = (int)$data['seats'];
        $maxPerUser = 3;

        $existing = RideRequest::query()
            ->where('trip_id', $trip->id)
            ->where('user_id', $user->id)
            ->whereIn('status', ['pending', 'accepted'])
            ->latest('id')
            ->first();

        $autoAccept = !empty($trip->company_id); // <-- компании: авто-принятие

        if ($existing) {
            if (($existing->seats + $delta) > $maxPerUser) {
                return back()->withErrors(['seats' => "Մեկ օգտատիրոջ համար առավելագույնը {$maxPerUser} տեղ"])->withInput();
            }

            try {
                DB::transaction(function () use ($existing, $delta, $data, $trip, $autoAccept) {
                    // блокируем трип
                    $t = \App\Models\Trip::where('id', $trip->id)->lockForUpdate()->first();

                    // Сколько мест нужно «занять» в seats_taken в этой операции:
                    // - если заявка уже accepted: прибавляем только дельту
                    // - если была pending и нужно авто-принять: прибавляем (старые pending seats + дельту)
                    $needToTake = 0;
                    if ($existing->status === 'accepted') {
                        $needToTake = $delta;
                    } elseif ($autoAccept && $existing->status === 'pending') {
                        $needToTake = $existing->seats + $delta;
                    }

                    // Проверяем свободные места
                    $free = max(0, (int)$t->seats_total - (int)$t->seats_taken);
                    if ($free < $needToTake) {
                        throw ValidationException::withMessages(['seats' => 'Անբավարար ազատ տեղեր']);
                    }

                    // seats_taken
                    if ($needToTake > 0) {
                        $t->increment('seats_taken', $needToTake);
                        if ($existing->status === 'pending') {
                            $existing->status = 'accepted';
                        }
                    }

                    // обновляем заявку
                    $existing->seats       += $delta;
                    $existing->payment      = $data['payment'];
                    $existing->description  = trim(($existing->description ? ($existing->description . "\n") : '') . $data['description']);
                    $existing->save();
                });
            } catch (ValidationException $e) {
                return back()->withErrors($e->errors())->withInput();
            }

            return back()->with('ok', 'request_updated');
        }

        // новая заявка
        try {
            DB::transaction(function () use ($trip, $user, $delta, $data, $autoAccept) {
                $t = \App\Models\Trip::where('id', $trip->id)->lockForUpdate()->first();

                $free = max(0, (int)$t->seats_total - (int)$t->seats_taken);
                if ($free < $delta) {
                    throw ValidationException::withMessages(['seats' => 'Անբավարար ազատ տեղեր']);
                }

                $status = $autoAccept ? 'accepted' : 'pending';

                RideRequest::create([
                    'trip_id'        => $t->id,
                    'user_id'        => $user->id,
                    'passenger_name' => $user->name,
                    'phone'          => $user->number,
                    'description'    => $data['description'],
                    'seats'          => $delta,
                    'payment'        => $data['payment'],
                    'status'         => $status,
                    'meta'           => null,
                ]);

                if ($autoAccept) {
                    $t->increment('seats_taken', $delta);
                }
            });
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors())->withInput();
        }

        return back()->with('ok', $autoAccept ? 'request_accepted' : 'request_sent');
    }







    public function show(RideRequest $request)
    {
        abort_unless($request->user_id === auth()->id(), 404);

        if ($request->status === 'deleted') {
            return redirect()->route('client.requests');
        }


        $trip = Trip::query()
            ->with([
                'stops:id,trip_id,lat,lng,position,name,addr',
                'vehicle:id,brand,model,plate,color'
            ])
            ->findOrFail($request->trip_id);

        $freeAvailable = max(0, (int)$trip->seats_total - (int)$trip->seats_taken);

        $meta = (array)$request->meta;
        $addonFrom = isset($meta['surcharge_start_amd']) ? max(0, (int)$meta['surcharge_start_amd']) : 0;
        $addonTo = isset($meta['surcharge_end_amd']) ? max(0, (int)$meta['surcharge_end_amd']) : 0;
        $addonTotal = $addonFrom + $addonTo;

        $seatsCount = max(1, (int)$request->seats);
        $basePerSeat = (int)$trip->price_amd;
        $baseTotal = $basePerSeat * $seatsCount;
        $recordedTotal = (int)($request->price_amd ?? 0);
        $effectiveTotal = $recordedTotal > 0 ? $recordedTotal : $baseTotal + $addonTotal;
        $effectivePerSeat = $seatsCount > 0 ? (int)ceil($effectiveTotal / $seatsCount) : $basePerSeat;

        $booking = [
            'id' => $request->id,
            'code' => 'TX-' . $request->id, // при желании поменяй
            'status' => $request->status,   // pending|accepted|rejected|cancelled
            'seats' => (int)$request->seats,
            'payment' => $request->payment,  // cash|card
            'created_at' => optional($request->created_at)->toIso8601String(),
            'passenger' => ['name' => $request->passenger_name, 'phone' => $request->phone],
            'trip' => [
                'id' => $trip->id,
                'from' => (string)$trip->from_addr,
                'to' => (string)$trip->to_addr,
                'from_lat' => (float)$trip->from_lat,
                'from_lng' => (float)$trip->from_lng,
                'to_lat' => (float)$trip->to_lat,
                'to_lng' => (float)$trip->to_lng,
                'departure_at' => optional($trip->departure_at)->toIso8601String(),
                'price_amd' => (int)$trip->price_amd,
                'seats_total' => (int)$trip->seats_total,
                'seats_taken' => (int)$trip->seats_taken,
                'free_available' => (int)$freeAvailable,
                'stops' => $trip->stops->sortBy('position')->values()->map(fn($s) => [
                    'position' => $s->position,
                    'lat' => (float)$s->lat,
                    'lng' => (float)$s->lng,
                    'name' => $s->name,
                    'addr' => $s->addr,
                ]),
                'policy' => ['cancelMinBefore' => 30],
            ],
            'pricing' => [
                'seats' => $seatsCount,
                'base_per_seat_amd' => $basePerSeat,
                'base_total_amd' => $baseTotal,
                'addon_from_amd' => $addonFrom,
                'addon_to_amd' => $addonTo,
                'addon_total_amd' => $addonTotal,
                'effective_per_seat_amd' => $effectivePerSeat,
                'total_amd' => $effectiveTotal,
            ],
            'meta' => [
                'type' => $meta['type'] ?? null,
                'pickup' => $meta['pickup'] ?? null,
                'drop' => $meta['drop'] ?? null,
                'board_stop' => $meta['board_stop'] ?? null,
                'alight_stop' => $meta['alight_stop'] ?? null,
                'surcharge_start_amd' => $addonFrom,
                'surcharge_end_amd' => $addonTo,
            ],
        ];

        return Inertia::render('Client/BookingShow', ['booking' => $booking]);
    }
}
