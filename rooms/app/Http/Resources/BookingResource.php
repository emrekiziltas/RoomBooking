<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class BookingResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'         => $this->id,
            'title'      => $this->title,
            'start_time' => $this->start_time->format('Y-m-d H:i:s'),
            'end_time'   => $this->end_time->format('Y-m-d H:i:s'),
            'color'      => $this->color,
            'room'       => [
                'id'       => $this->room->id,
                'name'     => $this->room->name,
                'capacity' => $this->room->capacity,
            ],
            'user'       => [
                'id'   => $this->user->id,
                'name' => $this->user->name,
            ],
        ];
    }
}