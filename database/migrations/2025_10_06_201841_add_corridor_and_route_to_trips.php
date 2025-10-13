<?php
// database/migrations/2025_10_07_000020_add_corridor_and_route_to_trips.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        Schema::table('trips', function (Blueprint $t) {
            // Коридор вокруг маршрута (км). Если null — использовать дефолт (напр. 5 км).
            if (!Schema::hasColumn('trips', 'corridor_km')) {
                $t->decimal('corridor_km', 8, 2)->nullable()->after('eta_sec');
            }
            // Полилиния маршрута без PostGIS: массив точек [{lat,lng}, ...]
            if (!Schema::hasColumn('trips', 'route_points')) {
                $t->json('route_points')->nullable()->after('corridor_km');
            }
            // (опц.) расчётная длина маршрута
            if (!Schema::hasColumn('trips', 'route_length_km')) {
                $t->decimal('route_length_km', 10, 3)->nullable()->after('route_points');
            }
        });

        // Индекс может уже существовать из предыдущих миграций — создаём безопасно.
        try {
            DB::statement('CREATE INDEX IF NOT EXISTS trips_status_departure_at_index ON trips (status, departure_at)');
        } catch (\Throwable $e) {
            // если не PostgreSQL — просто пропускаем
        }
    }

    public function down(): void {
        Schema::table('trips', function (Blueprint $t) {
            if (Schema::hasColumn('trips', 'route_length_km')) $t->dropColumn('route_length_km');
            if (Schema::hasColumn('trips', 'route_points'))    $t->dropColumn('route_points');
            if (Schema::hasColumn('trips', 'corridor_km'))     $t->dropColumn('corridor_km');
        });
        // Индекс в down намеренно не трогаем, т.к. он мог быть создан ранее другой миграцией.
    }
};
