<?php

namespace Database\Seeders;

use App\Models\Amenity;
use App\Models\AmenityCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AmenitiesSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            'Комфорт' => [
                ['Wi-Fi', 'wifi', 'wifi'],
                ['Кондиционер', 'ac', 'wind'],
                ['Розетки Type-C', 'type-c-socket', 'plug'],
            ],
            'Безопасность' => [
                ['Детское кресло', 'child-seat', 'baby'],
                ['Аптечка', 'first-aid', 'first-aid'],
            ],
            'Багаж' => [
                ['Большой багаж', 'big-luggage', 'suitcase'],
                ['Ручная кладь', 'hand-luggage', 'bag'],
            ],
        ];

        $sortCat = 0;
        foreach ($data as $catName => $items) {
            $cat = AmenityCategory::query()->firstOrCreate(
                ['slug' => Str::slug($catName)],
                ['name' => $catName, 'sort_order' => $sortCat++, 'is_active' => true]
            );

            $sort = 0;
            foreach ($items as [$name, $slug, $icon]) {
                Amenity::query()->firstOrCreate(
                    ['slug' => $slug],
                    [
                        'amenity_category_id' => $cat->id,
                        'name' => $name,
                        'icon' => $icon,
                        'is_active' => true,
                        'sort_order' => $sort++,
                        'meta' => null,
                    ]
                );
            }
        }
    }
}
