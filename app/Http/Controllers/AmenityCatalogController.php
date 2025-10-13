<?php

namespace App\Http\Controllers;

use App\Models\AmenityCategory;

class AmenityCatalogController extends Controller
{
    public function __invoke()
    {
        $cats = AmenityCategory::with(['amenities' => function($q){
            $q->where('is_active', true)->orderBy('sort_order');
        }])
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'categories' => $cats,
        ]);
    }
}
