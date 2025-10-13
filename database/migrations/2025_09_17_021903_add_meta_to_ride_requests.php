<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('ride_requests', function (Blueprint $t) {
            if (!Schema::hasColumn('ride_requests','meta')) {
                $t->json('meta')->nullable()->after('status');
            }
            if (!Schema::hasColumn('ride_requests','decided_by_user_id')) {
                // на случай, если ещё не применялась твоя миграция аудита
                $t->foreignId('decided_by_user_id')->nullable()->after('meta')
                    ->constrained('users')->nullOnDelete();
                $t->timestamp('decided_at')->nullable()->after('decided_by_user_id');
            }
            $t->index(['trip_id','status']);
            $t->index(['user_id','status']);
        });
    }
    public function down(): void {
        Schema::table('ride_requests', function (Blueprint $t) {
            if (Schema::hasColumn('ride_requests','meta')) $t->dropColumn('meta');
            // индексы можно оставить
        });
    }
};
