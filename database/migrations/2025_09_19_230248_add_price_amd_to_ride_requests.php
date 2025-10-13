<?php
// database/migrations/2025_01_01_000000_add_price_amd_to_ride_requests.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
public function up(): void {
Schema::table('ride_requests', function (Blueprint $table) {
if (!Schema::hasColumn('ride_requests','price_amd')) {
$table->unsignedInteger('price_amd')->default(0)->after('payment');
}
});
}
public function down(): void {
Schema::table('ride_requests', function (Blueprint $table) {
if (Schema::hasColumn('ride_requests','price_amd')) {
$table->dropColumn('price_amd');
}
});
}
};
