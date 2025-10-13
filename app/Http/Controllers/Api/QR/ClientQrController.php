<?php
// app/Http/Controllers/Api/QR/ClientQrController.php
namespace App\Http\Controllers\Api\QR;

use App\Http\Controllers\Controller;
use App\Models\{RideRequest, CheckinTicket};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ClientQrController extends Controller
{
private int $ttlSec = 120;

public function create(Request $r, RideRequest $rideRequest) {
$user = $r->user();

abort_unless($rideRequest->user_id === $user->id, 403);
$rideRequest->load(['trip:id,user_id,assigned_driver_id,status,driver_finished_at']);
abort_if(!$rideRequest->trip, 404);
abort_if($rideRequest->trip->status !== 'published', 409);
abort_if(!is_null($rideRequest->trip->driver_finished_at), 409);

$driverId = $rideRequest->trip->assigned_driver_id ?: $rideRequest->trip->user_id;

return DB::transaction(function () use ($rideRequest, $user, $driverId) {
CheckinTicket::whereNull('used_at')
->where('ride_request_id', $rideRequest->id)
->update(['expires_at' => now()->subMinute()]);

$token = bin2hex(random_bytes(16));

$ticket = CheckinTicket::create([
'token'           => $token,
'ride_request_id' => $rideRequest->id,
'trip_id'         => $rideRequest->trip_id,
'client_user_id'  => $user->id,
'driver_user_id'  => $driverId,
'expires_at'      => Carbon::now()->addSeconds($this->ttlSec),
]);

return response()->json([
'ok'        => true,
'token'     => $ticket->token,
'expiresIn' => $this->ttlSec,
'qr'        => "hayway:chk:{$ticket->token}",
]);
});
}
}
