<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use RuntimeException;

class OffersSmokeSeeder extends Seeder
{
    public function run(): void
    {
        $userId = 5;
        $vehicleId = 1;
        $now = Carbon::now();

        DB::transaction(function () use ($userId, $vehicleId, $now) {
            // Проверки существования
            if (!DB::table('users')->where('id', $userId)->exists()) {
                throw new RuntimeException('users.id=5 не найден');
            }
            if (!DB::table('vehicles')->where('id', $vehicleId)->exists()) {
                throw new RuntimeException('vehicles.id=1 не найден');
            }

            // Trip (published) под user 5 и vehicle 1
            $tripId = DB::table('trips')->insertGetId([
                'user_id'        => $userId,
                'vehicle_id'     => $vehicleId,
                'from_lat'       => 40.1772,
                'from_lng'       => 44.5035,
                'from_addr'      => 'Երևան, Республика площадь',
                'to_lat'         => 40.7415,
                'to_lng'         => 44.8649,
                'to_addr'        => 'Դիլիջան, Կենտրոն',
                'departure_at'   => (clone $now)->addHours(2),
                'seats_total'    => 4,
                'seats_taken'    => 0,
                'price_amd'      => 5000,
                'pay_methods'    => json_encode(['cash','card']),
                'status'         => 'published',
                'eta_sec'        => 5400,
                'corridor_km'    => 5,
                'route_points'   => json_encode([
                    ['lat'=>40.1772,'lng'=>44.5035],
                    ['lat'=>40.5,'lng'=>44.7],
                    ['lat'=>40.7415,'lng'=>44.8649],
                ]),
                'created_at'     => $now,
                'updated_at'     => $now,
            ]);

            // Два открытых заказа клиента 5 (важно: client_user_id = 5)
            $winFrom = (clone $now)->startOfDay()->addHours(9);
            $winTo   = (clone $now)->startOfDay()->addHours(21);

            $order1Id = DB::table('rider_orders')->insertGetId([
                'client_user_id'   => $userId,
                'from_lat'         => 40.19, 'from_lng' => 44.52,
                'from_addr'        => 'Երևան, Կոմիտաս պող.',
                'from_addr_search' => 'yerevan komitas',
                'to_lat'           => 40.74, 'to_lng' => 44.86,
                'to_addr'          => 'Դիլիջան, կենտրոն',
                'to_addr_search'   => 'dilijan kentron',
                'when_from'        => $winFrom,
                'when_to'          => $winTo,
                'seats'            => 1,
                'payment'          => 'cash',
                'desired_price_amd'=> 4500,
                'status'           => 'open',
                'created_at'       => $now,
                'updated_at'       => $now,
            ]);

            $order2Id = DB::table('rider_orders')->insertGetId([
                'client_user_id'   => $userId,
                'from_lat'         => 40.18, 'from_lng' => 44.50,
                'from_addr'        => 'Երևան, Նորք-Մարաշ',
                'from_addr_search' => 'yerevan nork marash',
                'to_lat'           => 40.36, 'to_lng' => 45.12,
                'to_addr'          => 'Իջևան, կենտրոն',
                'to_addr_search'   => 'ijevan kentron',
                'when_from'        => $winFrom,
                'when_to'          => $winTo,
                'seats'            => 2,
                'payment'          => 'card',
                'desired_price_amd'=> 8000,
                'status'           => 'open',
                'created_at'       => $now,
                'updated_at'       => $now,
            ]);

            // Оффер от user 5 на trip + order1 (pending)
            DB::table('driver_offers')->insert([
                'order_id'       => $order1Id,
                'trip_id'        => $tripId,
                'driver_user_id' => $userId,
                'price_amd'      => 4500,
                'seats'          => 1,
                'status'         => 'pending',
                'valid_until'    => (clone $now)->addHours(6),
                'meta'           => json_encode(['demo' => true]),
                'created_at'     => $now,
                'updated_at'     => $now,
            ]);
        });
    }
}
