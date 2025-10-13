<?php
// database/migrations/2025_10_07_000000_create_rider_orders_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('rider_orders', function (Blueprint $t) {
            $t->id();

            $t->foreignId('client_user_id')->constrained('users')->cascadeOnDelete();

            $t->decimal('from_lat', 10, 7)->nullable();
            $t->decimal('from_lng', 10, 7)->nullable();
            $t->string('from_addr')->nullable();
            $t->text('from_addr_search')->nullable();  // нормализованный текст для поиска

            $t->decimal('to_lat', 10, 7)->nullable();
            $t->decimal('to_lng', 10, 7)->nullable();
            $t->string('to_addr')->nullable();
            $t->text('to_addr_search')->nullable();    // нормализованный текст для поиска

            // временное окно или фикс-время (можно заполнять одно поле)
            $t->dateTime('when_from')->nullable();
            $t->dateTime('when_to')->nullable();

            $t->unsignedTinyInteger('seats')->default(1);
            $t->string('payment', 20)->nullable();     // cash|card|...

            $t->unsignedInteger('desired_price_amd')->nullable(); // хотелка клиента

            $t->string('status', 20)->default('open'); // open|matched|closed|cancelled|expired
            $t->json('meta')->nullable();

            $t->timestamps();

            $t->index(['status']);
            $t->index(['client_user_id', 'status']);
            $t->index(['when_from', 'when_to']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('rider_orders');
    }
};
