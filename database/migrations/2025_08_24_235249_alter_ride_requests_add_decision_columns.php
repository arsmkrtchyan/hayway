<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('ride_requests', function (Blueprint $table) {
            // audit: кто принял/отклонил заявку
            $table->foreignId('decided_by_user_id')->nullable()->after('status')
                ->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable()->after('decided_by_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('ride_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('decided_by_user_id');
            $table->dropColumn('decided_at');
        });
    }
};
