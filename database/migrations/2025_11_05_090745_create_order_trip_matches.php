<?php
// database/migrations/2025_11_05_000001_create_order_trip_matches.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::create('order_trip_matches', function (Blueprint $t) {
      $t->id();
      $t->foreignId('order_id')->constrained('rider_orders')->cascadeOnDelete();
      $t->foreignId('trip_id')->constrained()->cascadeOnDelete();
      $t->timestamp('notified_at')->nullable();      // когда отправили уведомление
      $t->foreignId('ride_request_id')->nullable();  // если по клику отправили заявку
      $t->timestamps();

      $t->unique(['order_id','trip_id']);
      $t->index(['order_id','notified_at']);
    });
  }
  public function down(): void {
    Schema::dropIfExists('order_trip_matches');
  }
};
