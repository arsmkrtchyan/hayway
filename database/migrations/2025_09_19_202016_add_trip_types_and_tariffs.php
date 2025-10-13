<?php
// database/migrations/2025_09_20_000001_add_trip_types_and_tariffs.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('trips', function (Blueprint $t) {
            // 4 типа (ровно один true)
            $t->boolean('type_ab_fixed')->default(false)->index();
            $t->boolean('type_pax_to_pax')->default(false)->index();
            $t->boolean('type_pax_to_b')->default(false)->index();
            $t->boolean('type_a_to_pax')->default(false)->index();

            // тариф у стартовой фикс-точки (A)
            $t->decimal('start_free_km', 8, 2)->nullable();
            $t->unsignedInteger('start_amd_per_km')->nullable();
            $t->decimal('start_max_km', 8, 2)->nullable();

            // тариф у конечной фикс-точки (B)
            $t->decimal('end_free_km', 8, 2)->nullable();
            $t->unsignedInteger('end_amd_per_km')->nullable();
            $t->decimal('end_max_km', 8, 2)->nullable();

            $t->index(['status','departure_at']);
        });
    }
    public function down(): void {
        Schema::table('trips', function (Blueprint $t) {
            $t->dropColumn([
                'type_ab_fixed','type_pax_to_pax','type_pax_to_b','type_a_to_pax',
                'start_free_km','start_amd_per_km','start_max_km',
                'end_free_km','end_amd_per_km','end_max_km',
            ]);
        });
    }
};
