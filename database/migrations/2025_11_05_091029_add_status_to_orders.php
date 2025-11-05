<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // 1) Колонки
        if (!Schema::hasColumn('rider_orders', 'status')) {
            Schema::table('rider_orders', function (Blueprint $t) {
                $t->string('status', 32)->default('open'); // временно NULL допускаем, зададим ниже NOT NULL
            });
        }

        if (!Schema::hasColumn('rider_orders', 'stopped_at')) {
            Schema::table('rider_orders', function (Blueprint $t) {
                $t->timestamp('stopped_at')->nullable();
            });
        }

        // 2) Значения по умолчанию и NOT NULL
        DB::statement("UPDATE rider_orders SET status = 'open' WHERE status IS NULL;");
        DB::statement("ALTER TABLE rider_orders ALTER COLUMN status SET DEFAULT 'open';");
        DB::statement("ALTER TABLE rider_orders ALTER COLUMN status SET NOT NULL;");

        // 3) CHECK-constraint (если его нет)
        DB::statement("
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'rider_orders_status_check'
            ) THEN
                ALTER TABLE rider_orders
                ADD CONSTRAINT rider_orders_status_check
                CHECK (status IN ('open','requested','fulfilled','closed'));
            END IF;
        END$$;");

        // 4) Индекс (если его нет)
        DB::statement("
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                  FROM pg_class c
                  JOIN pg_namespace n ON n.oid = c.relnamespace
                 WHERE c.relname = 'rider_orders_status_idx'
                   AND c.relkind = 'i'
            ) THEN
                CREATE INDEX rider_orders_status_idx ON rider_orders(status);
            END IF;
        END$$;");
    }

    public function down(): void
    {
        // снять CHECK, если есть
        DB::statement("
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rider_orders_status_check') THEN
                ALTER TABLE rider_orders DROP CONSTRAINT rider_orders_status_check;
            END IF;
        END$$;");

        // снять индекс, если есть
        DB::statement("
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                  FROM pg_class c
                  JOIN pg_namespace n ON n.oid = c.relnamespace
                 WHERE c.relname = 'rider_orders_status_idx'
                   AND c.relkind = 'i'
            ) THEN
                DROP INDEX rider_orders_status_idx;
            END IF;
        END$$;");

        // колонки удалять только если есть
        if (Schema::hasColumn('rider_orders', 'status')) {
            Schema::table('rider_orders', function (Blueprint $t) {
                $t->dropColumn('status');
            });
        }
        if (Schema::hasColumn('rider_orders', 'stopped_at')) {
            Schema::table('rider_orders', function (Blueprint $t) {
                $t->dropColumn('stopped_at');
            });
        }
    }
};
