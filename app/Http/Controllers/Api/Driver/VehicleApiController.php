<?php

namespace App\Http\Controllers\Api\Driver;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class VehicleApiController extends Controller
{
    private function ensureRole(Request $r): void
    {
        $ok = in_array($r->user()->role, ['driver','company','admin'], true);
        abort_unless($ok, 403, 'forbidden');
    }

    public function show(Request $r)
    {
        $this->ensureRole($r);
        $v = Vehicle::where('user_id', $r->user()->id)->first();

        return response()->json($v ? $this->map($v) : null);
    }

    public function upsert(Request $r)
    {
        $this->ensureRole($r);

        $data = $r->validate([
            'brand' => ['required','string','max:120'],
            'model' => ['required','string','max:120'],
            'seats' => ['required','integer','min:1','max:8'],
            'color' => ['nullable','string','max:40'],
            'plate' => ['nullable','string','max:40'],
            'photo' => ['nullable','image','max:4096'],
            'status'=> ['nullable', Rule::in(['active','archived'])],
        ]);

        $payload = [
            'user_id' => $r->user()->id,
            'brand'   => $data['brand'],
            'model'   => $data['model'],
            'seats'   => $data['seats'],
            'color'   => $data['color'] ?? null,
            'plate'   => $data['plate'] ?? null,
            'status'  => $data['status'] ?? 'active',
        ];

        if ($r->file('photo')) {
            $path = $r->file('photo')->store('uploads/car', 'public');
            $payload['photo_path'] = $path;
        }

        $v = Vehicle::updateOrCreate(['user_id' => $r->user()->id], $payload);

        return response()->json($this->map($v), 200);
    }

    private function map(Vehicle $v): array
    {
        return [
            'id'    => $v->id,
            'brand' => $v->brand,
            'model' => $v->model,
            'seats' => (int)$v->seats,
            'color' => $v->color,
            'plate' => $v->plate,
            'status'=> $v->status,
            'photo_path' => $v->photo_path,
            'photo_url'  => $v->photo_path ? Storage::disk('public')->url($v->photo_path) : null,
        ];
    }
}
