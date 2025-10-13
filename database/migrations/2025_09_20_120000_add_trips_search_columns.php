<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            if (!Schema::hasColumn('trips', 'from_addr_search')) {
                $table->text('from_addr_search')->nullable()->after('from_addr');
            }
            if (!Schema::hasColumn('trips', 'to_addr_search')) {
                $table->text('to_addr_search')->nullable()->after('to_addr');
            }
        });

        $normalizer = fn(?string $value): ?string => $this->normalizeAddress($value);

        DB::table('trips')
            ->select(['id', 'from_addr', 'to_addr'])
            ->orderBy('id')
            ->chunkById(500, function ($rows) use ($normalizer) {
                foreach ($rows as $row) {
                    DB::table('trips')
                        ->where('id', $row->id)
                        ->update([
                            'from_addr_search' => $normalizer($row->from_addr ?? null),
                            'to_addr_search' => $normalizer($row->to_addr ?? null),
                        ]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            if (Schema::hasColumn('trips', 'from_addr_search')) {
                $table->dropColumn('from_addr_search');
            }
            if (Schema::hasColumn('trips', 'to_addr_search')) {
                $table->dropColumn('to_addr_search');
            }
        });
    }

    private function normalizeAddress(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        $latin = $this->transliterate($trimmed);

        $collapse = Str::of($latin)
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/u', ' ')
            ->squish()
            ->value();

        return $collapse === '' ? null : $collapse;
    }

    private function transliterate(string $value): string
    {
        try {
            return Str::transliterate($value);
        } catch (\Throwable) {
            return Str::ascii($value);
        }
    }
};
