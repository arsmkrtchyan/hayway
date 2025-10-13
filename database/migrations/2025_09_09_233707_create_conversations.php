<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('conversations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('ride_request_id')->unique()->constrained()->cascadeOnDelete();
            $t->foreignId('trip_id')->constrained()->cascadeOnDelete();
            $t->foreignId('driver_user_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('client_user_id')->constrained('users')->cascadeOnDelete();
            $t->string('status')->default('open'); // open|closed
            $t->unsignedBigInteger('last_message_id')->nullable();
            $t->timestamps();
            $t->index(['driver_user_id']);
            $t->index(['client_user_id']);
            $t->index(['status']);
        });

        Schema::create('conversation_participants', function (Blueprint $t) {
            $t->id();
            $t->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('role')->nullable(); // driver|client
            $t->unsignedBigInteger('last_read_message_id')->nullable();
            $t->timestamp('last_seen_at')->nullable();   // heartbeat
            $t->timestamp('typing_until')->nullable();   // "печатает" TTL
            $t->timestamps();
            $t->unique(['conversation_id','user_id']);
            $t->index(['last_seen_at']);
            $t->index(['typing_until']);
        });

        Schema::create('conversation_messages', function (Blueprint $t) {
            $t->id();
            $t->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $t->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $t->string('client_mid', 100)->nullable(); // идемпотентность
            $t->text('body')->nullable();
            $t->string('attachment_path')->nullable();
            $t->string('attachment_mime')->nullable();
            $t->unsignedInteger('attachment_size')->nullable();
            $t->timestamp('edited_at')->nullable();
            $t->timestamp('deleted_at')->nullable(); // мягкое удаление
            $t->timestamps();
            $t->index(['conversation_id','created_at']);
            $t->index(['sender_id','created_at']);
            $t->unique(['conversation_id','sender_id','client_mid']);
        });

        Schema::create('chat_uploads', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('path');
            $t->string('mime')->nullable();
            $t->unsignedInteger('size')->nullable();
            $t->timestamp('expires_at')->nullable();
            $t->timestamps();
            $t->index(['expires_at']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('chat_uploads');
        Schema::dropIfExists('conversation_messages');
        Schema::dropIfExists('conversation_participants');
        Schema::dropIfExists('conversations');
    }
};

