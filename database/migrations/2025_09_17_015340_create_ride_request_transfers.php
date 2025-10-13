<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ride_request_transfers', function (Blueprint $t) {
            $t->id();
            $t->foreignId('ride_request_id')->constrained()->cascadeOnDelete();
            $t->foreignId('from_trip_id')->constrained('trips')->cascadeOnDelete();
            $t->foreignId('to_trip_id')->constrained('trips')->cascadeOnDelete();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->foreignId('transferred_by_user_id')->constrained('users')->cascadeOnDelete();
            $t->string('reason', 240)->nullable();
            $t->timestamp('transferred_at')->useCurrent();
            $t->timestamps();

            $t->index(['company_id','transferred_at']);
            $t->index(['from_trip_id']);
            $t->index(['to_trip_id']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('ride_request_transfers');
    }
};
