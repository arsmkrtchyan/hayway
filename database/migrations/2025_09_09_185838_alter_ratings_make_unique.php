<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('ratings', function (Blueprint $table) {
            // на всякий случай индексы
            $table->index(['trip_id']);
            $table->index(['user_id']);
        });
        // уникальный отзыв от пользователя на поездку
        Schema::table('ratings', function (Blueprint $table) {
            $table->unique(['trip_id','user_id']);
        });

        // ускорим выборки завершённых
        Schema::table('trips', function (Blueprint $table) {
            if (!Schema::hasColumn('trips','driver_finished_at')) return;
            $table->index(['driver_finished_at']);
            if (Schema::hasColumn('trips','company_id')) $table->index(['company_id']);
            if (Schema::hasColumn('trips','assigned_driver_id')) $table->index(['assigned_driver_id']);
            $table->index(['user_id']);
        });
    }

    public function down(): void {
        Schema::table('ratings', function (Blueprint $table) {
            $table->dropUnique(['trip_id','user_id']);
            $table->dropIndex(['ratings_trip_id_index']);
            $table->dropIndex(['ratings_user_id_index']);
        });
        Schema::table('trips', function (Blueprint $table) {
            $table->dropIndex(['trips_driver_finished_at_index']);
            if (Schema::hasColumn('trips','company_id')) $table->dropIndex(['trips_company_id_index']);
            if (Schema::hasColumn('trips','assigned_driver_id')) $table->dropIndex(['trips_assigned_driver_id_index']);
            $table->dropIndex(['trips_user_id_index']);
        });
    }
};
