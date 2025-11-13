<?php
// database/migrations/2025_11_11_000000_add_soft_deletes_to_trips.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('trips', function (Blueprint $table) {
            if (!Schema::hasColumn('trips','deleted_at')) {
                $table->softDeletesTz()->after('updated_at');
                $table->index('deleted_at');
            }
        });
    }
    public function down(): void {
        Schema::table('trips', function (Blueprint $table) {
            $table->dropIndex(['deleted_at']);
            $table->dropSoftDeletes();
        });
    }
};
