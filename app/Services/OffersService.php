<?php

namespace App\Services;

use App\Models\RiderOrder;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class OffersService
{
    private function key(string $id): string { return "offer:{$id}"; }
    private function idxDriver(int $driverId): string { return "offerlist:driver:{$driverId}"; }
    private function idxOrder(int $orderId): string { return "offerlist:order:{$orderId}"; }

    public function create(User $driver, RiderOrder $order, Trip $trip, ?int $addonAmd = null, int $ttlHours = 24): string
    {
        $id = Str::ulid()->toBase32();
        $data = [
            'id' => $id,
            'driver_id' => (int)$driver->id,
            'client_user_id' => (int)$order->client_user_id,
            'order_id' => (int)$order->id,
            'trip_id' => (int)$trip->id,
            'price_amd' => (int)$trip->price_amd,
            'addon_amd' => $addonAmd,
            'created_at' => Carbon::now()->toIso8601String(),
            'expires_at' => Carbon::now()->addHours($ttlHours)->toIso8601String(),
            'status' => 'open', // open|accepted|rejected|withdrawn|expired
        ];
        $ttl = now()->addHours($ttlHours);
        Cache::put($this->key($id), $data, $ttl);
        Cache::sadd($this->idxDriver($driver->id), [$id]);
        Cache::sadd($this->idxOrder($order->id),  [$id]);
        return $id;
    }

    public function get(string $id): ?array
    {
        $v = Cache::get($this->key($id));
        if (!$v) return null;
        if (Carbon::parse($v['expires_at'])->isPast() && $v['status']==='open') {
            $v['status']='expired'; Cache::put($this->key($id), $v, now()->addHour());
        }
        return $v;
    }

    public function listByDriver(int $driverId): array
    {
        $ids = Cache::smembers($this->idxDriver($driverId)) ?? [];
        return array_values(array_filter(array_map(fn($id)=>$this->get($id), $ids)));
    }

    public function withdraw(User $driver, string $id): bool
    {
        $v = $this->get($id); if (!$v || (int)$v['driver_id'] !== (int)$driver->id) return false;
        $v['status']='withdrawn'; Cache::put($this->key($id), $v, now()->addDay());
        return true;
    }

    public function reject(User $client, string $id): bool
    {
        $v = $this->get($id); if (!$v || (int)$v['client_user_id'] !== (int)$client->id) return false;
        $v['status']='rejected'; Cache::put($this->key($id), $v, now()->addDay());
        return true;
    }

    public function accept(User $client, string $id): ?int
    {
        $v = $this->get($id);
        if (!$v || (int)$v['client_user_id'] !== (int)$client->id || $v['status']!=='open') return null;

        $trip = Trip::query()->find($v['trip_id']);
        if (!$trip || $trip->status!=='published') return null;

        $price = (int)$trip->price_amd + (int)($v['addon_amd'] ?? 0);

        $reqId = DB::table('ride_requests')->insertGetId([
            'trip_id' => $trip->id,
            'passenger_name' => $client->name,
            'phone' => null,
            'description' => 'Created from offer '.$v['id'],
            'seats' => 1,
            'payment' => 'cash',
            'status' => 'pending',
            'user_id' => $client->id,
            'price_amd' => $price,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $v['status']='accepted';
        Cache::put($this->key($id), $v, now()->addDays(7));

        RiderOrder::query()->where('id',$v['order_id'])->update(['status'=>'matched','updated_at'=>now()]);

        return $reqId;
    }
}
