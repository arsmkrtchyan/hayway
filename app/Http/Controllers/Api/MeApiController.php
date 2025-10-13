<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class MeApiController extends Controller
{
    public function show(Request $r)
    {
        $u = $r->user();
        return response()->json([
            'id'            => $u->id,
            'name'          => $u->name,
            'email'         => $u->email,
            'role'          => $u->role,
            'admin_status'  => $u->admin_status,
            'email_verified'=> (bool)$u->email_verified_at,
        ]);
    }
}
