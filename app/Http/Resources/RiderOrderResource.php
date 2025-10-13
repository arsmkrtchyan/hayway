<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class RiderOrderResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id'    => $this->id,
            'client_user_id' => $this->client_user_id,
            'from' => [
                'lat' => $this->from_lat, 'lng' => $this->from_lng, 'addr' => $this->from_addr,
            ],
            'to'   => [
                'lat' => $this->to_lat,   'lng' => $this->to_lng,   'addr' => $this->to_addr,
            ],
            'when' => [
                'from' => optional($this->when_from)->toIso8601String(),
                'to'   => optional($this->when_to)->toIso8601String(),
            ],
            'seats' => (int)$this->seats,
            'payment' => $this->payment,
            'desired_price_amd' => $this->desired_price_amd,
            'status' => $this->status,
            'meta' => $this->meta ?? [],
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
