<?php
// database/migrations/2025_10_07_000030_add_order_id_to_ride_requests.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('ride_requests', function (Blueprint $t) {
            if (!Schema::hasColumn('ride_requests', 'order_id')) {
                $t->foreignId('order_id')
                    ->nullable()
                    ->after('trip_id')
                    ->constrained('rider_orders')
                    ->nullOnDelete();
                $t->index(['order_id']);
            }
        });
    }

    public function down(): void {
        Schema::table('ride_requests', function (Blueprint $t) {
            if (Schema::hasColumn('ride_requests', 'order_id')) {
                $t->dropConstrainedForeignId('order_id');
                $t->dropIndex(['order_id']);
            }
        });
    }
};
