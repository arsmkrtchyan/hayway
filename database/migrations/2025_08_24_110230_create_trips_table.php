<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration {
    public function up(): void {
        Schema::create('trips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // վարորդ
            $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
            $table->decimal('from_lat',10,7)->nullable();
            $table->decimal('from_lng',10,7)->nullable();
            $table->string('from_addr');
            $table->decimal('to_lat',10,7)->nullable();
            $table->decimal('to_lng',10,7)->nullable();
            $table->string('to_addr');
            $table->dateTime('departure_at');
            $table->unsignedTinyInteger('seats_total');
            $table->unsignedTinyInteger('seats_taken')->default(0);
            $table->unsignedInteger('price_amd');
            $table->json('pay_methods')->nullable(); // ["cash","card"]
            $table->string('status')->default('draft'); // draft|published|archived|cancelled
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('trips'); }
};
