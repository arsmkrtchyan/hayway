<?php

namespace App\Http\Controllers\Api\Driverv2;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Http\Request;

class VehicleApiController extends Controller
{
    public function show()
    {
        $v = Vehicle::where('user_id',auth()->id())->first();
        return response()->json(['data'=>$v]);
    }

    public function upsert(Request $r)
    {
        $r->validate([
            'brand'=>'required|string|max:120',
            'model'=>'required|string|max:120',
            'seats'=>'required|integer|min:1|max:8',
            'color'=>'nullable|string|max:40',
            'plate'=>'nullable|string|max:40',
            'photo'=>'nullable|image|max:4096',
        ]);
        $data = $r->only('brand','model','seats','color','plate');
        $data['user_id'] = auth()->id();
        if ($r->file('photo')) {
            $data['photo_path'] = $r->file('photo')->store('uploads/car','public');
        }
        $v = Vehicle::updateOrCreate(['user_id'=>auth()->id()], $data);
        return response()->json(['data'=>$v], 200);
    }
}
