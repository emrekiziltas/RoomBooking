<?php

namespace App\Http\Controllers\Api;

use App\Models\Room;
use Illuminate\Routing\Controller;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => Room::all()
        ]);
    }

    public function update(Request $request, $id)
{
    $room = Room::findOrFail($id);
    
    $validated = $request->validate([
        'name' => 'sometimes|string|max:255',
        'capacity' => 'sometimes|integer|min:1|max:4',
        'features' => 'sometimes|array',
        'features.blackboard' => 'sometimes|boolean',
    ]);

    $room->update($validated);

    return response()->json([
        'success' => true,
        'data' => $room->fresh()
    ]);
}
    public function show($id)
    {
        $room = Room::findOrFail($id);
        return response()->json([
            'success' => true,
            'data' => $room
        ]);
    }

    public function bookings($id)
    {
        $room = Room::with('bookings')->findOrFail($id);
        return response()->json([
            'success' => true,
            'data' => $room->bookings
        ]);
    }
/*
public function available(Request $request) 
{
    $date = $request->query('date'); 
    $capacity = $request->query('capacity');
    $blackboard = $request->query('blackboard');

    // Test: O tarihteki bookingleri görelim
    if ($date) {
        $bookingsOnDate = \App\Models\Booking::whereDate('start_time', '<=', $date)
            ->whereDate('end_time', '>=', $date)
            ->get();
        
        \Log::info('Bookings on date:', [
            'date' => $date,
            'count' => $bookingsOnDate->count(),
            'room_ids' => $bookingsOnDate->pluck('room_id')->unique()->values()
        ]);
    }

    // Temel sorgu
    $query = Room::query();

    // Tarih bazlı müsaitlik filtresi
    if ($date) {
        $query->whereDoesntHave('bookings', function ($q) use ($date) {
            $q->whereDate('start_time', '<=', $date)
              ->whereDate('end_time', '>=', $date);
        });
    }

    // Kapasite filtresi
    if ($capacity) {
        $query->where('capacity', '>=', $capacity);
    }

    // Blackboard filtresi
    if ($blackboard !== null) {
        $hasBlackboard = filter_var($blackboard, FILTER_VALIDATE_BOOLEAN);
        $query->where('features->blackboard', $hasBlackboard);
    }

    $rooms = $query->get();

    return response()->json([
        'success' => true,
        'total' => $rooms->count(),
        'data' => $rooms
    ]);
}
*/
public function available(Request $request) 
{
    $date = $request->query('date'); 
    $capacity = $request->query('capacity');
    $blackboard = $request->query('blackboard');

    $query = Room::query();

    // Kapasite filtresi
    if ($capacity) {
        $query->where('capacity', '>=', $capacity);
    }

    // Blackboard filtresi
    if ($blackboard !== null) {
        $hasBlackboard = filter_var($blackboard, FILTER_VALIDATE_BOOLEAN);
        $query->where('features->blackboard', $hasBlackboard);
    }

    // TÜM ODALARI al ve o tarihteki booking sayılarını hesapla
    $rooms = $query->get()->map(function($room) use ($date) {
        $bookingCount = 0;
        
        if ($date) {
            // O tarihteki booking sayısını say
            $bookingCount = $room->bookings()
                ->whereDate('start_time', '<=', $date)
                ->whereDate('end_time', '>=', $date)
                ->count();
        }
        
        $availableCapacity = max(0, $room->capacity - $bookingCount);
        $occupancyRate = $room->capacity > 0 
            ? round(($bookingCount / $room->capacity) * 100) 
            : 0;
        
        return [
            'id' => $room->id,
            'name' => $room->name,
            'capacity' => $room->capacity,
            'features' => $room->features,
            'booked_slots' => $bookingCount,
            'available_capacity' => $availableCapacity,
            'occupancy_rate' => $occupancyRate,
            'is_fully_booked' => $availableCapacity === 0,
            'created_at' => $room->created_at,
            'updated_at' => $room->updated_at,
        ];
    });

    // Sadece tam dolu OLMAYAN odaları döndür
    if ($date) {
        $rooms = $rooms->filter(function($room) {
            return !$room['is_fully_booked'];
        })->values();
    }

    return response()->json([
        'success' => true,
        'total' => $rooms->count(),
        'data' => $rooms
    ]);
}

public function availableRanges(Request $request)
{
    $startDate = $request->query('start_date');
    $days = $request->query('days', 5); // Varsayılan 5 gün
    
    if (!$startDate) {
        return response()->json([
            'success' => false,
            'message' => 'start_date parametresi gerekli'
        ], 400);
    }

    $rooms = Room::all();
    $availableRanges = [];

    foreach ($rooms as $room) {
        // Başlangıç tarihinden itibaren ardışık boş günleri bul
        $consecutiveDays = 0;
        $rangeStart = null;
        $foundRanges = [];

        for ($i = 0; $i < 30; $i++) { // 30 gün içinde ara
            $checkDate = date('Y-m-d', strtotime($startDate . " +{$i} days"));
            
            // O tarihte booking sayısını say
            $bookingCount = $room->bookings()
                ->whereDate('start_time', '<=', $checkDate)
                ->whereDate('end_time', '>=', $checkDate)
                ->count();
            
            // Oda tam dolu mu?
            $isFullyBooked = $bookingCount >= $room->capacity;
            
            if (!$isFullyBooked) {
                // Oda tam dolu değil (müsait kapasite var)
                if ($consecutiveDays === 0) {
                    $rangeStart = $checkDate;
                }
                $consecutiveDays++;
                
                // İstenen gün sayısına ulaştık mı?
                if ($consecutiveDays >= $days) {
                    $foundRanges[] = [
                        'start' => $rangeStart,
                        'end' => $checkDate,
                        'days' => $consecutiveDays
                    ];
                    break; // İlk uygun aralığı bulduk
                }
            } else {
                // Tam dolu - sıfırla
                $consecutiveDays = 0;
                $rangeStart = null;
            }
        }

        // Sadece uygun aralık BULUNAN odaları ekle
        if (count($foundRanges) > 0) {
            $availableRanges[] = [
                'room' => [
                    'id' => $room->id,
                    'name' => $room->name,
                    'capacity' => $room->capacity,
                    'features' => $room->features,
                ],
                'ranges' => $foundRanges
            ];
        }
    }

    return response()->json([
        'success' => true,
        'criteria' => [
            'start_date' => $startDate,
            'required_days' => $days
        ],
        'total_rooms_found' => count($availableRanges),
        'data' => $availableRanges
    ]);
}
}