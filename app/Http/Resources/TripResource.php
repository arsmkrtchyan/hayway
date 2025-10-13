<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class TripResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'vehicle_id' => $this->vehicle_id,
            'from_lat' => $this->from_lat,
            'from_lng' => $this->from_lng,
            'from_addr' => $this->from_addr,
            'to_lat' => $this->to_lat,
            'to_lng' => $this->to_lng,
            'to_addr' => $this->to_addr,
            'departure_at' => $this->departure_at,
            'seats_total' => $this->seats_total,
            'seats_taken' => $this->seats_taken,
            'price_amd' => $this->price_amd,
            'pay_methods' => $this->pay_methods,
            'status' => $this->status,
            'company_id'=> $this->company_id,
            'assigned_driver_id'=> $this->assigned_driver_id,
            'driver_state'=> $this->driver_state,
            'driver_started_at'=> $this->driver_started_at,
            'driver_finished_at'=> $this->driver_finished_at,
            'amenities' => AmenityResource::collection(
                $this->whenLoaded('amenities', $this->amenities()->with('category')->get(), [])
            ),
        ];
    }
}
