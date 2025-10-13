<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('rating',10,2)->default(5);// անուն
            $table->string('email')->nullable();
            $table->foreignId('owner_user_id')      // ստեղծող/սեփականատեր
            ->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('pending'); // pending|approved|rejected
            $table->string('logo_path')->nullable();
            $table->timestamps();
        });

        // many-to-many с ролью внутри компании
        Schema::create('company_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role')->default('driver'); // owner|dispatcher|driver
            $table->decimal('rating',10,2)->default(5);// անուն
            $table->timestamps();

            $table->unique(['company_id','user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_members');
        Schema::dropIfExists('companies');
    }
};
