<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('trips', function (Blueprint $table) {
            // состояние выполнения для назначенного водителя компании
            $table->string('driver_state')->default('assigned'); // assigned|en_route|done
            $table->timestamp('driver_started_at')->nullable();
            $table->timestamp('driver_finished_at')->nullable();
        });
    }

    public function down(): void {
        Schema::table('trips', function (Blueprint $table) {
            $table->dropColumn(['driver_state','driver_started_at','driver_finished_at']);
        });
    }
};
