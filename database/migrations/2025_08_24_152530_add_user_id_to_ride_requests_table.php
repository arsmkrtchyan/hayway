<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('ride_requests', function (Blueprint $table) {
            // если таблица уже существует без user_id — добавляем
            if (!Schema::hasColumn('ride_requests', 'user_id')) {
                $table->foreignId('user_id')
                    ->nullable()                // чтобы старые записи не упали
                    ->constrained('users')      // FK -> users(id)
                    ->nullOnDelete();           // при удалении юзера — NULL
                $table->index('user_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ride_requests', function (Blueprint $table) {
            if (Schema::hasColumn('ride_requests', 'user_id')) {
                $table->dropForeign(['user_id']);
                $table->dropIndex(['user_id']);
                $table->dropColumn('user_id');
            }
        });
    }
};

