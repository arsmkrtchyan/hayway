<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('trip_stop_requests', function (Blueprint $table) {
            $table->id();

            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('trip_id')->constrained()->cascadeOnDelete();

            $table->foreignId('requester_id')->constrained('users'); // обычно клиент
            $table->string('status')->default('pending'); // pending|accepted|declined|cancelled

            $table->string('name')->nullable();
            $table->string('addr')->nullable();
            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);

            // превью и итог
            $table->unsignedInteger('old_duration_sec')->nullable();
            $table->unsignedInteger('new_duration_sec')->nullable();
            $table->json('old_order')->nullable(); // [ {type:'from|stop|to', lat,lng,name,addr}, ... ]
            $table->json('new_order')->nullable();

            $table->foreignId('decided_by')->nullable()->constrained('users');
            $table->timestamp('decided_at')->nullable();

            $table->unsignedBigInteger('request_message_id')->nullable(); // ConversationMessage id
            $table->unsignedBigInteger('result_message_id')->nullable();  // ConversationMessage id

            $table->timestamps();

            $table->index(['conversation_id']);
            $table->index(['trip_id']);
            $table->index(['status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trip_stop_requests');
    }
};
