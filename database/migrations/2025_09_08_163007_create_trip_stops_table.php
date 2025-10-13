<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('trip_stops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained()->cascadeOnDelete();

            // Порядок прохождения остановок: 1..N
            $table->unsignedSmallInteger('position')->default(1)->nullable();

            // Название и/или человекочитаемый адрес (по желанию)
            $table->string('name')->nullable();
            $table->string('addr')->nullable();

            // Координаты
            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);

            $table->timestamps();

            $table->unique(['trip_id', 'position']); // уникальный порядок внутри рейса
            $table->index(['trip_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trip_stops');
    }
};
