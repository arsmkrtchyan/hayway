<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('trips', function (Blueprint $t) {
            $t->unsignedInteger('eta_sec')->nullable()->after('price_amd')->index();
        });
    }
    public function down(): void {
        Schema::table('trips', fn(Blueprint $t) => $t->dropColumn('eta_sec'));
    }
};
