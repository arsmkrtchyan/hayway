<?php
// database/migrations/2025_09_16_000000_create_checkin_tickets_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
public function up(): void {
Schema::create('checkin_tickets', function (Blueprint $t) {
$t->id();
$t->string('token', 64)->unique();
$t->foreignId('ride_request_id')->constrained()->cascadeOnDelete();
$t->foreignId('trip_id')->constrained()->cascadeOnDelete();
$t->foreignId('client_user_id')->constrained('users')->cascadeOnDelete();
$t->foreignId('driver_user_id')->constrained('users')->cascadeOnDelete();
$t->timestamp('expires_at');
$t->timestamp('used_at')->nullable();
$t->timestamps();

$t->index(['driver_user_id','expires_at']);
$t->index(['ride_request_id','used_at']);
});
}
public function down(): void { Schema::dropIfExists('checkin_tickets'); }
};
