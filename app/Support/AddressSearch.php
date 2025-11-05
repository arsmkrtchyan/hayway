<?php

namespace App\Support;

use Illuminate\Support\Str;

final class AddressSearch
{
    public static function normalize(?string $value): ?string
    {
        if ($value === null) return null;
        $t = trim($value);
        if ($t === '') return null;

        try { $latin = Str::transliterate($t); }
        catch (\Throwable) { $latin = Str::ascii($t); }

        $s = Str::of($latin)->lower()->replaceMatches('/[^a-z0-9]+/u',' ')->squish()->value();
        return $s === '' ? null : $s;
    }
}
