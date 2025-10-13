<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class MemberResource extends JsonResource
{
    public function toArray($request)
    {
        $m = $this->membership; // pivot
        return [
            'id'      => (int)$this->id,
            'name'    => $this->name,
            'email'   => $this->email,
            'role'    => $m?->role,
            'status'  => $m?->status ?? 'active',
            'rating'  => $m?->rating,
            'notes'   => $m?->notes,
            'added_by_user_id' => $m?->added_by_user_id,
            'joined_at' => optional($m?->created_at)->toDateTimeString(),
        ];
    }
}
