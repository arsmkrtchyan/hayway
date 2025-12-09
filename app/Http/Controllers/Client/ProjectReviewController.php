<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\ProjectReview;
use Illuminate\Http\Request;

class ProjectReviewController extends Controller
{
    public function store(Request $request)
    {
        $user = $request->user();
        abort_unless($user, 401);

        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['required', 'string', 'min:5', 'max:1200'],
        ]);

        ProjectReview::create([
            'user_id' => $user->id,
            'rating' => (int)$data['rating'],
            'comment' => trim($data['comment']),
            'is_public' => true,
        ]);

        return back()->with('ok', 'Կարծիքը պահպանվեց');
    }
}
