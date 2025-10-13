<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('amenity_trip', function (Blueprint $table) {
            $table->foreignId('trip_id')->constrained('trips')->cascadeOnDelete();
            $table->foreignId('amenity_id')->constrained('amenities')->cascadeOnDelete();
            $table->timestamp('selected_at')->default(DB::raw('now()'));
            $table->string('notes', 240)->nullable();
            $table->timestamps();

            $table->primary(['trip_id', 'amenity_id']);
            $table->index(['amenity_id', 'trip_id']); // для фильтров
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('amenity_trip');
    }
};
