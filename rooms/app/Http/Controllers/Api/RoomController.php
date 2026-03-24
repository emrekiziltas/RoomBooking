<?php

namespace App\Http\Controllers\Api;

use App\Models\Room;
use App\Models\Booking;
use Illuminate\Routing\Controller;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => Room::with('features')->get()
        ]);
    }

    public function update(Request $request, $id)
    {
        $room = Room::findOrFail($id);
        $maxCapacitySetting = \App\Models\LookupValue::where('key', 'max_room_capacity')->first();
        $maxVal = $maxCapacitySetting->metadata['value'] ?? 4;

        $request->validate([
            'capacity' => "sometimes|integer|min:1|max:$maxVal",
            'features' => 'sometimes|array',
        ]);

        $room->update($request->only(['capacity']));

        if ($request->has('features')) {
            $featureIds = [];
            foreach ($request->features as $feature) {
                $isNew = !isset($feature['id']) || (is_string($feature['id']) && str_starts_with($feature['id'], 'new_'));

                if ($isNew) {
                    $newFeature = \App\Models\LookupValue::firstOrCreate(
                        ['key' => $feature['key'], 'type_id' => 3],
                        ['label' => $feature['label'], 'is_active' => true, 'sort_order' => 0]
                    );
                    $featureIds[] = $newFeature->id;
                } else {
                    $featureIds[] = $feature['id'];
                }
            }
            $room->features()->sync($featureIds);
        }

        return response()->json([
            'success' => true,
            'data' => $room->load('features')
        ]);
    }

    /**
     * Tek bir tarih için müsaitlik kontrolü (Dashboard/Liste görünümü için)
     */
    public function available(Request $request)
    {
        $date = $request->query('date');
        $capacity = $request->query('capacity');
        $occupiedStatuses = ['confirmed', 'checked_in', 'staying'];

        $query = Room::query();

        if ($capacity) {
            $query->where('capacity', '>=', $capacity);
        }

        $rooms = $query->get()->map(function ($room) use ($date, $occupiedStatuses) {
            $bookingCount = 0;

            if ($date) {
                // Burada da sütun isimlerini check_in/check_out ve statüleri güncelledik
                $bookingCount = $room->bookings()
                    ->whereIn('status', $occupiedStatuses)
                    ->whereDate('check_in', '<=', $date)
                    ->whereDate('check_out', '>', $date)
                    ->count();
            }

            $availableCapacity = max(0, $room->capacity - $bookingCount);

            return [
                'id' => $room->id,
                'name' => $room->name,
                'capacity' => $room->capacity,
                'features' => $room->features,
                'booked_slots' => $bookingCount,
                'available_capacity' => $availableCapacity,
                'is_fully_booked' => $availableCapacity === 0,
            ];
        });

        if ($date) {
            $rooms = $rooms->filter(fn($r) => !$r['is_fully_booked'])->values();
        }

        return response()->json(['success' => true, 'data' => $rooms]);
    }

    /**
     * Atama ekranı (Drag & Drop) için tarih aralığı kontrolü
     */
    public function availableRanges(Request $request)
    {
        $startDate = $request->query('start_date');
        $days = (int)$request->query('days', 1);

        if (!$startDate) {
            return response()->json(['success' => false, 'message' => 'Tarih seçiniz'], 400);
        }

        $endDate = date('Y-m-d', strtotime($startDate . " +{$days} days"));
        $occupiedStatuses = ['confirmed', 'checked_in', 'staying'];

        $rooms = Room::with('features')->get();
        $availableRanges = [];

        foreach ($rooms as $room) {
            $bookedCount = $room->bookings()
                ->whereIn('status', $occupiedStatuses)
                ->where(function ($q) use ($startDate, $endDate) {
                    $q->where('check_in', '<', $endDate)
                      ->where('check_out', '>', $startDate);
                })
                ->count();

            if ($bookedCount < $room->capacity) {
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
                        'days' => $days
                    ]]
                ];
            }
        } // Foreach burada bitiyor

        return response()->json([
            'success' => true,
            'total_rooms_found' => count($availableRanges),
            'data' => $availableRanges
        ]);
    }
}