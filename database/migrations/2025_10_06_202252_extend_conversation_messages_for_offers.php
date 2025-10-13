<?php
// database/migrations/2025_10_07_000040_extend_conversation_messages_for_offers.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        // Колонки (добавляем, если нет)
        Schema::table('conversation_messages', function (Blueprint $t) {
            if (!Schema::hasColumn('conversation_messages', 'type')) {
                // text|image|trip|system|offer
                $t->string('type', 20)->default('text')->after('client_mid');
            }
            if (!Schema::hasColumn('conversation_messages', 'meta')) {
                // {price_amd,seats,order_id,trip_id,valid_until,...}
                $t->json('meta')->nullable()->after('attachment_size');
            }
        });

        // Индекс может существовать — создаём безопасно (PostgreSQL)
        try {
            DB::statement('CREATE INDEX IF NOT EXISTS conversation_messages_conversation_id_id_index ON conversation_messages (conversation_id, id)');
        } catch (\Throwable $e) {
            // для других СУБД просто тихо пропускаем
        }
    }

    public function down(): void {
        Schema::table('conversation_messages', function (Blueprint $t) {
            if (Schema::hasColumn('conversation_messages', 'meta')) $t->dropColumn('meta');
            if (Schema::hasColumn('conversation_messages', 'type')) $t->dropColumn('type');
        });
        // Индекс намеренно не трогаем, т.к. он мог быть создан ранее другой миграцией.
    }
};
