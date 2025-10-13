<?php
namespace App\Http\Controllers\Driver;
use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Http\Request;


class VehicleController extends Controller
{
    public function store(Request $r)
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
        if ($r->file('photo')) { $data['photo_path'] = $r->file('photo')->store('uploads/car','public'); }
        $vehicle = Vehicle::updateOrCreate(['user_id'=>auth()->id()], $data);
        return back();
    }


    public function update(Request $r, Vehicle $vehicle)
    {
        abort_unless($vehicle->user_id===auth()->id(), 403);
        return $this->store($r); // reuse rules
    }
}
