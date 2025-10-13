<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureApproved
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if ($user && in_array($user->role, ['driver','company']) && $user->admin_status !== 'approved') {
            return redirect()->route('pending');
        }
        return $next($request);
    }
}
