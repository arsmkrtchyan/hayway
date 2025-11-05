<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
// database/migrations/2025_11_05_000002_add_status_to_orders.php
return new class extends Migration {
  public function up(): void {
    Schema::table('orders', function (Blueprint $t) {
      $t->enum('status',['open','requested','fulfilled','closed'])->default('open')->index();
      $t->timestamp('stopped_at')->nullable(); // когда перестали слать матчинг
    });
  }
  public function down(): void {
    Schema::table('orders', function (Blueprint $t) {
      $t->dropColumn(['status','stopped_at']);
    });
  }
};
