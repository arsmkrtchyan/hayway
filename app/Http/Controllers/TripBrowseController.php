<?php

namespace App\Http\Controllers;

use App\Models\{Trip, AmenityCategory};
use Illuminate\Http\Request;
use Inertia\Inertia;

class TripBrowseController extends Controller
{
    public function index(Request $request)
    {
        // Каталог удобств (для варианта A — Inertia-пропсы)
        $amenityCategories = AmenityCategory::with(['amenities' => function($q){
            $q->where('is_active', true)->orderBy('sort_order');
        }])
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        $q = Trip::with(['driver','vehicle','amenities.category'])
            ->withCount(['requests as pending_requests_count' => function($qq){ $qq->where('status','pending'); }])
            ->where('status','published');

        if ($request->filled('from')) {
            $q->where('from_addr','like','%'.$request->string('from').'%');
        }
        if ($request->filled('to')) {
            $q->where('to_addr','like','%'.$request->string('to').'%');
        }
        if ($request->filled('date')) {
            $q->whereDate('departure_at', $request->date('date'));
        }
        if ($request->filled('max_price')) {
            $q->where('price_amd','<=', (int)$request->input('max_price'));
        }
        if ($request->filled('seats')) {
            $q->where('seats_total','>=', (int)$request->input('seats'));
        }
        if ($request->filled('pay')) {
            $q->whereJsonContains('pay_methods', $request->input('pay'));
        }
        // УДОБСТВА: массив ID. Все выбранные должны присутствовать.
        if ($request->filled('amenities')) {
            $ids = array_filter((array)$request->input('amenities'), 'strlen');
            if (!empty($ids)) {
                $q->withAllAmenities($ids);
            }
        }

        $trips = $q->orderBy('departure_at')->paginate(12)->withQueryString();

        return Inertia::render('Explore', [
            'trips'             => $trips,
            'filters'           => $request->all(),
            'amenityCategories' => $amenityCategories,
            'auth'              => ['user' => $request->user() ? $request->user()->only('id','name') : null],
        ]);
    }
}
