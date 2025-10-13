<?php
// database/migrations/2025_09_20_000002_add_tariffs_to_trip_stops.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('trip_stops', function (Blueprint $t) {
            $t->decimal('free_km', 8, 2)->nullable()->after('lng');
            $t->unsignedInteger('amd_per_km')->nullable()->after('free_km');
            $t->decimal('max_km', 8, 2)->nullable()->after('amd_per_km');
            $t->index(['trip_id','position']);
        });
    }
    public function down(): void {
        Schema::table('trip_stops', function (Blueprint $t) {
            $t->dropIndex(['trip_id','position']);
            $t->dropColumn(['free_km','amd_per_km','max_km']);
        });
    }
};
