<?php

use App\Enums\CompanyStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $t) {
            if (!Schema::hasColumn('companies','slug')) {
                $t->string('slug')->nullable()->unique()->after('name');
            }
            if (!Schema::hasColumn('companies','phone')) {
                $t->string('phone', 60)->nullable()->after('email');
            }
            if (!Schema::hasColumn('companies','timezone')) {
                $t->string('timezone', 64)->nullable()->after('phone');
            }
            if (!Schema::hasColumn('companies','locale')) {
                $t->string('locale', 8)->nullable()->after('timezone');
            }
            if (!Schema::hasColumn('companies','currency')) {
                $t->string('currency', 8)->default('AMD')->after('locale');
            }
            if (!Schema::hasColumn('companies','settings')) {
                $t->json('settings')->nullable()->after('currency');
            }
            if (Schema::hasColumn('companies','status')) {
                $t->string('status')->default(CompanyStatus::PENDING->value)->change();
            }
            if (!Schema::hasColumn('companies','members_count')) {
                $t->unsignedInteger('members_count')->default(0)->after('logo_path');
            }

            $t->index(['status']);
            $t->index(['owner_user_id']);
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $t) {
            if (Schema::hasColumn('companies','slug')) $t->dropColumn('slug');
            if (Schema::hasColumn('companies','phone')) $t->dropColumn('phone');
            if (Schema::hasColumn('companies','timezone')) $t->dropColumn('timezone');
            if (Schema::hasColumn('companies','locale')) $t->dropColumn('locale');
            if (Schema::hasColumn('companies','currency')) $t->dropColumn('currency');
            if (Schema::hasColumn('companies','settings')) $t->dropColumn('settings');
            if (Schema::hasColumn('companies','members_count')) $t->dropColumn('members_count');
        });
    }
};
