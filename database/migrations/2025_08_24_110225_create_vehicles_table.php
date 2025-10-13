<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration {
    public function up(): void {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('brand'); // օրինակ՝ Toyota
            $table->string('model'); // օրինակ՝ Camry
            $table->unsignedTinyInteger('seats')->default(4); // ուղևորների տեղերը
            $table->string('color')->nullable(); // hex կամ անվանում
            $table->string('plate')->nullable(); // պետ. համարանիշ
            $table->string('photo_path')->nullable();
            $table->string('status')->default('active'); // active|archived
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('vehicles'); }
};
