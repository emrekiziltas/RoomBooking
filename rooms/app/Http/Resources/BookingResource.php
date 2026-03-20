<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                     => $this->id,
            'room_id'                => $this->room_id,
            // Eski 'start_time' yerine yeni 'check_in' gönderiyoruz
            'check_in'               => $this->check_in, 
            'check_out'              => $this->check_out,
            'status'                 => $this->status,
            
            // UI'da kafa karışıklığı olmasın diye tek bir isim alanı
            'snapshot_guest_name'    => $this->snapshot_guest_name,
            'snapshot_guest_email'   => $this->snapshot_guest_email,
            'snapshot_guest_company' => $this->snapshot_guest_company,
            'snapshot_is_vip'        => (bool) $this->snapshot_is_vip,
            
            'room' => $this->whenLoaded('room'),
            'guest' => $this->whenLoaded('guest'),
            
            'created_at'             => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at'             => $this->updated_at->format('Y-m-d H:i:s'),
        ];
    }
}