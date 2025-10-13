<?php
// database/migrations/2025_10_07_000010_create_driver_offers_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        Schema::create('driver_offers', function (Blueprint $t) {
            $t->id();

            $t->foreignId('order_id')->constrained('rider_orders')->cascadeOnDelete();
            $t->foreignId('trip_id')->constrained('trips')->cascadeOnDelete();
            $t->foreignId('driver_user_id')->constrained('users')->cascadeOnDelete(); // владелец/назначенный водитель

            $t->unsignedInteger('price_amd');            // цена оффера (за место или суммарно — по вашей бизнес-логике)
            $t->unsignedTinyInteger('seats')->default(1); // сколько мест предлагает

            $t->string('status', 20)->default('pending'); // pending|accepted|rejected|expired|withdrawn
            $t->timestamp('valid_until')->nullable();

            $t->json('meta')->nullable();

            $t->timestamps();

            $t->index(['order_id', 'status']);
            $t->index(['driver_user_id', 'status']);
            $t->index(['valid_until']);
        });

        // Частичный уникальный индекс (PostgreSQL): один активный pending-оффер на пару (order, trip)
        try {
            DB::statement("
                CREATE UNIQUE INDEX driver_offers_unique_pending
                ON driver_offers (order_id, trip_id)
                WHERE status = 'pending'
            ");
        } catch (\Throwable $e) {
            // если не PostgreSQL — просто пропустим
        }
    }

    public function down(): void {
        try { DB::statement("DROP INDEX IF EXISTS driver_offers_unique_pending"); } catch (\Throwable $e) {}
        Schema::dropIfExists('driver_offers');
    }
};
