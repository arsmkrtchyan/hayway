<?php
// app/Http/Controllers/Api/QR/DriverQrController.php
namespace App\Http\Controllers\Api\QR;

use App\Http\Controllers\Controller;
use App\Models\{CheckinTicket, RideRequest, Trip};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DriverQrController extends Controller
{
    public function verify(Request $r) {
        $driver = $r->user();
        $data = $r->validate(['token' => ['required','string','max:128']]);
        $raw = $data['token'];
        $token = str_starts_with($raw, 'hayway:chk:') ? substr($raw, 11) : $raw;

        return DB::transaction(function () use ($token, $driver) {
            $t = CheckinTicket::where('token', $token)->lockForUpdate()->first();
            if (!$t) return response()->json(['ok'=>false,'err'=>'not_found'], 404);
            if ($t->driver_user_id !== $driver->id) return response()->json(['ok'=>false,'err'=>'forbidden'], 403);
            if ($t->used_at) return response()->json(['ok'=>false,'err'=>'already_used'], 409);
            if (now()->greaterThan($t->expires_at)) return response()->json(['ok'=>false,'err'=>'expired'], 410);

            $rr = RideRequest::lockForUpdate()->find($t->ride_request_id);
            if (!$rr) return response()->json(['ok'=>false,'err'=>'ride_missing'], 404);
            if ($rr->user_id !== $t->client_user_id) return response()->json(['ok'=>false,'err'=>'mismatch_client'], 403);
            if ($rr->trip_id !== $t->trip_id) return response()->json(['ok'=>false,'err'=>'mismatch_trip'], 403);

            $trip = Trip::find($t->trip_id);
            if (!$trip) return response()->json(['ok'=>false,'err'=>'trip_missing'], 404);
            if (!in_array($driver->id, [$trip->assigned_driver_id, $trip->user_id], true))
                return response()->json(['ok'=>false,'err'=>'not_trip_driver'], 403);
            if ($trip->status !== 'published') return response()->json(['ok'=>false,'err'=>'trip_state'], 409);

            $t->used_at = now(); $t->save();
            $rr->is_checked_in = true; $rr->checked_in_at = now(); $rr->save();

            return response()->json([
                'ok' => true,
                'ride_request_id' => $t->ride_request_id,
                'trip_id' => $t->trip_id,
                'client_user_id' => $t->client_user_id,
            ]);
        });
    }
}
