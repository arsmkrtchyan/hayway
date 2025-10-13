<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // conversations: один диалог на пару driver-client
        Schema::table('conversations', function (Blueprint $t) {
            // ride_request_id больше не уникален и может быть null
            if (Schema::hasColumn('conversations','ride_request_id')) {
                try { $t->dropUnique('conversations_ride_request_id_unique'); } catch (\Throwable $e) {}
                $t->unsignedBigInteger('ride_request_id')->nullable()->change();
            }
            // trip_id в самой беседе не нужен
            if (Schema::hasColumn('conversations','trip_id')) {
                $t->dropConstrainedForeignId('trip_id');
            }
            // уникальность пары
            $t->unique(['driver_user_id','client_user_id'],'conv_pair_unique');
            // ускорение сортировок
            if (!Schema::hasColumn('conversations','last_message_id')) {
                $t->unsignedBigInteger('last_message_id')->nullable()->after('status');
            }
            if (!Schema::hasColumn('conversations','updated_at')) {
                $t->timestamps();
            }
        });

        // messages: тип + мета
        Schema::table('conversation_messages', function (Blueprint $t) {
            if (!Schema::hasColumn('conversation_messages','type')) {
                $t->string('type', 20)->default('text')->after('client_mid'); // text|image|trip|system
            }
            if (!Schema::hasColumn('conversation_messages','meta')) {
                $t->json('meta')->nullable()->after('attachment_size'); // для trip/системных
            }
            $t->index(['conversation_id','id']);
        });

        // participants без изменений
    }

    public function down(): void
    {
        Schema::table('conversation_messages', function (Blueprint $t) {
            if (Schema::hasColumn('conversation_messages','meta')) $t->dropColumn('meta');
            if (Schema::hasColumn('conversation_messages','type')) $t->dropColumn('type');
        });
        Schema::table('conversations', function (Blueprint $t) {
            try { $t->dropUnique('conv_pair_unique'); } catch (\Throwable $e) {}
        });
    }
};
