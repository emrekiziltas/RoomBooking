<?php

namespace App\Services;

use App\Models\Booking;

class BookingService
{
  /*
  public function hasConflict($roomId, $startTime, $endTime, $excludeId = null): bool
{
    $room = \App\Models\Room::findOrFail($roomId);
    
    $activeBookings = Booking::where('room_id', $roomId)
        ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
        ->where('start_time', '<', $endTime)
        ->where('end_time', '>', $startTime)
        ->count();

    return $activeBookings >= $room->capacity;
}
*/
public function hasConflict($roomId, $startTime, $endTime, $excludeId = null)
{
    $query = Booking::where('room_id', $roomId)
        ->where(function($q) use ($startTime, $endTime) {
            $q->where('start_time', '<', $endTime)
              ->where('end_time', '>', $startTime);
        });

    if ($excludeId) {
        $query->where('id', '!=', $excludeId);
    }

    return $query->exists();
}
}