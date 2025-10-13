<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Enums\CompanyMemberStatus;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('company_members', function (Blueprint $t) {
            if (!Schema::hasColumn('company_members','status')) {
                $t->string('status')->default(CompanyMemberStatus::ACTIVE->value)->after('role');
            }
            if (!Schema::hasColumn('company_members','added_by_user_id')) {
                $t->foreignId('added_by_user_id')->nullable()
                    ->after('user_id')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('company_members','notes')) {
                $t->string('notes', 240)->nullable()->after('rating');
            }

            $t->index(['company_id','role']);
            $t->index(['company_id','status']);
            $t->index(['added_by_user_id']);
        });

        // На всякий случай: если осталась старая таблица company_user — уберём её
        if (Schema::hasTable('company_user')) {
            Schema::drop('company_user');
        }
    }

    public function down(): void
    {
        Schema::table('company_members', function (Blueprint $t) {
            if (Schema::hasColumn('company_members','status')) $t->dropColumn('status');
            if (Schema::hasColumn('company_members','added_by_user_id')) $t->dropConstrainedForeignId('added_by_user_id');
            if (Schema::hasColumn('company_members','notes')) $t->dropColumn('notes');
            $t->dropIndex(['company_members_company_id_role_index']);
            $t->dropIndex(['company_members_company_id_status_index']);
            $t->dropIndex(['company_members_added_by_user_id_index']);
        });
    }
};
