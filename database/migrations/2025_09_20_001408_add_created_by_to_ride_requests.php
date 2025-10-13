<?php
// database/migrations/2025_09_20_000001_add_created_by_to_ride_requests.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
public function up(): void {
Schema::table('ride_requests', function (Blueprint $t) {
$t->unsignedBigInteger('created_by_user_id')->nullable()->after('user_id');
$t->foreign('created_by_user_id')->references('id')->on('users')->nullOnDelete();
});
}
public function down(): void {
Schema::table('ride_requests', function (Blueprint $t) {
$t->dropForeign(['created_by_user_id']);
$t->dropColumn('created_by_user_id');
});
}
};
