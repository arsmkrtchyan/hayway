<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('amenities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('amenity_category_id')
                ->nullable()
                ->constrained('amenity_categories')
                ->nullOnDelete();
            $table->string('name', 120);
            $table->string('slug', 120)->unique();
            $table->string('icon', 120)->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->jsonb('meta')->nullable();
            $table->timestamps();

            $table->index(['amenity_category_id', 'sort_order']);
            $table->unique(['amenity_category_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('amenities');
    }
};
