<?php
// database/migrations/2024_01_01_000000_create_company_user_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('company_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role')->default('driver'); // driver|manager|owner
            $table->timestamps();

            $table->unique(['company_id','user_id']); // чтобы не дублировались
        });
    }
    public function down(): void {
        Schema::dropIfExists('company_user');
    }
};

