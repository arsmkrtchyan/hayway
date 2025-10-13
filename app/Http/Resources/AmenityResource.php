<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class AmenityResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'    => $this->id,
            'name'  => $this->name,
            'slug'  => $this->slug,
            'icon'  => $this->icon,
            'is_active' => (bool)$this->is_active,
            'category' => $this->whenLoaded('category', function () {
                return [
                    'id' => $this->category?->id,
                    'name' => $this->category?->name,
                    'slug' => $this->category?->slug,
                ];
            }),
            'pivot' => $this->when($this->pivot, function () {
                return [
                    'selected_at' => $this->pivot->selected_at,
                    'notes' => $this->pivot->notes,
                ];
            }),
        ];
    }
}
