<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class DriverOfferResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id'    => $this->id,
            'order_id' => $this->order_id,
            'trip_id'  => $this->trip_id,
            'driver_user_id' => $this->driver_user_id,
            'price_amd' => (int)$this->price_amd,
            'seats'     => (int)$this->seats,
            'status'    => $this->status,
            'valid_until' => optional($this->valid_until)->toIso8601String(),
            'meta' => $this->meta ?? [],
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
