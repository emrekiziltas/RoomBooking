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
            // Sadece Room::all() yerine Room::with('features')->get() yazıyoruz
            'data' => Room::with('features')->get() 
        ]);
    }

public function update(Request $request, $id)
{
    $room = Room::findOrFail($id);
    
$maxCapacitySetting = \App\Models\LookupValue::where('key', 'max_room_capacity')->first();
// Eğer ayar bulunamazsa fallback olarak 4 kullan
$maxVal = $maxCapacitySetting ? (int)$maxCapacitySetting->metadata['value'] : 4;

$request->validate([
    'capacity' => "sometimes|integer|min:1|max:$maxVal", // Dinamik max değer
    'features' => 'sometimes|array',
]);

    // 1. Kapasite gibi temel alanları güncelle
    $room->update($request->only(['capacity']));

    if ($request->has('features')) {
        $featureIds = [];

        foreach ($request->features as $feature) {
            // Yeni mi eski mi kontrolü (Frontend'den gelen 'id' değerine bakıyoruz)
            $isNew = !isset($feature['id']) || (is_string($feature['id']) && str_starts_with($feature['id'], 'new_'));

            if ($isNew) {
                // EĞER YENİ İSE: LookupValue tablosuna KAYDET
                // Burada 'key' benzersiz olduğu için firstOrCreate kullanmak en güvenlisidir.
                $newFeature = \App\Models\LookupValue::firstOrCreate(
                    [
                        'key' => $feature['key'], 
                        'type_id' => 3 // Sizin sisteminizdeki 'Özellik' tipi
                    ],
                    [
                        'label' => $feature['label'],
                        'is_active' => true,
                        'sort_order' => 0
                    ]
                );
                $featureIds[] = $newFeature->id;
            } else {
                // EĞER ESKİ İSE: Mevcut ID'yi kullan
                $featureIds[] = $feature['id'];
            }
        }

        // 2. Pivot Tabloyu (room_features) Senkronize Et
        // Bu işlem room_features tablosuna yeni kayıtları atar, listede olmayanları siler.
        $room->features()->sync($featureIds);
    }

    return response()->json([
        'success' => true,
        'data' => $room->load('features') // Güncel listeyle beraber dön
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


    $rooms = Room::with('features')->get();

   //return response()->json($rooms);
    
    $availableRanges = [];

foreach ($rooms as $room) {
    $isAvailable = true;

    for ($i = 0; $i < $days; $i++) {
        $checkDate = date('Y-m-d', strtotime($startDate . " +{$i} days"));
        
        $bookingCount = $room->bookings()
            ->whereDate('start_time', '<=', $checkDate)
            ->whereDate('end_time', '>=', $checkDate)
            ->count();
        
        if ($bookingCount >= $room->capacity) {
            $isAvailable = false;
            break;
        }
    }

    if ($isAvailable) {
        $endDate = date('Y-m-d', strtotime($startDate . " +" . ($days - 1) . " days"));
        $availableRanges[] = [
            'room' => [
                'id' => $room->id,
                'name' => $room->name,
                'capacity' => $room->capacity,
                'features' => $room->features,
            ],
            'ranges' => [[
                'start' => $startDate,
                'end' => $endDate,
                'days' => (int)$days
            ]]
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