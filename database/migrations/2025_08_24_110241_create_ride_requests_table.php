<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration {
    public function up(): void {
        Schema::create('ride_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained()->cascadeOnDelete();
            $table->string('passenger_name')->nullable();
            $table->string('phone')->nullable();
            $table->text('description')->nullable();
            $table->unsignedTinyInteger('seats')->default(1);
            $table->string('payment'); // cash|card
            $table->string('status')->default('pending'); // pending|accepted|rejected|cancelled
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('ride_requests'); }
};
