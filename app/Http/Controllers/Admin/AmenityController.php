<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AmenityUpsertRequest;
use App\Http\Resources\AmenityResource;
use App\Models\Amenity;
use Illuminate\Http\Request;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class AmenityController extends Controller
{



    // GET /api/admin/amenities?only_active=1
    public function index(Request $request)
    {
        $onlyActive = (bool)$request->boolean('only_active');
        $q = Amenity::query()
            ->with('category')
            ->when($onlyActive, fn($qq) => $qq->where('is_active', true))
            ->orderBy('sort_order')
            ->orderBy('name');

        return AmenityResource::collection($q->get());
    }

    public function store(AmenityUpsertRequest $request)
    {
        $amenity = Amenity::create($request->validated());
        return AmenityResource::make($amenity->load('category'));
    }

    public function update(AmenityUpsertRequest $request, Amenity $amenity)
    {
        $amenity->update($request->validated());
        return AmenityResource::make($amenity->refresh()->load('category'));
    }

    public function destroy(Amenity $amenity)
    {
        $amenity->delete();
        return response()->noContent();
    }

    // POST /api/admin/amenities/{amenity}/toggle
    public function toggle(Amenity $amenity)
    {
        $this->authorize('update', $amenity);
        $amenity->is_active = ! $amenity->is_active;
        $amenity->save();

        return AmenityResource::make($amenity->refresh()->load('category'));
    }
}
