<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // машины могут принадлежать либо юзеру, либо компании
        Schema::table('vehicles', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable()->after('user_id') // nullable => back-compat
            ->constrained('companies')->nullOnDelete();
        });

        // рейс может быть от компании; и водитель может быть назначен
        Schema::table('trips', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable()->after('driver_id')
                ->constrained('companies')->nullOnDelete();
            $table->foreignId('assigned_driver_id')->nullable()->after('driver_id')
                ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->dropConstrainedForeignId('company_id');
            $table->dropConstrainedForeignId('assigned_driver_id');
        });
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('company_id');
        });
    }
};
