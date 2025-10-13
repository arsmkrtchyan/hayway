<?php

// database/migrations/2025_09_16_000010_add_checkin_flags_to_ride_requests.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('ride_requests', function (Blueprint $t) {
            $t->boolean('is_checked_in')->default(false)->after('status');
            $t->timestamp('checked_in_at')->nullable()->after('is_checked_in');
        });
    }
    public function down(): void {
        Schema::table('ride_requests', function (Blueprint $t) {
            $t->dropColumn(['is_checked_in','checked_in_at']);
        });
    }
};

