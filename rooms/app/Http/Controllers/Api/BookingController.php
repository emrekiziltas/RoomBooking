<?php

namespace App\Http\Controllers\Api;

use App\Models\Booking;
use App\Models\Room;
use App\Models\BookingLog;
use App\Http\Resources\BookingResource;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Carbon\Carbon;

class BookingController extends Controller
{
    public function index(Request $request)
    {
        $sortColumn = in_array($request->sort, ['updated_at', 'created_at', 'start_time', 'end_time'])
            ? $request->sort
            : 'start_time';

        $sortOrder = in_array($request->order, ['asc', 'desc'])
            ? $request->order
            : 'desc';

        $query = Booking::with(['room', 'user'])
            ->when($request->room_id, fn($q) => $q->where('room_id', $request->room_id))
            ->orderBy($sortColumn, $sortOrder);

        if ($request->has('limit') && is_numeric($request->limit)) {
            $query->limit((int) $request->limit);
        }

        return BookingResource::collection($query->get());
    }

    public function recent(Request $request)
    {
        $limit = min((int) $request->get('limit', 10), 100);

        $bookings = Booking::with(['room', 'user'])
            ->orderBy('updated_at', 'desc')
            ->limit($limit)
            ->get();

        return BookingResource::collection($bookings);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'room_id'    => 'required|exists:rooms,id',
            'start_time' => 'required|date',
            'end_time'   => 'required|date|after:start_time',
            'title'      => 'required|string',
            'color'      => 'nullable|string'
        ]);

        $room = Room::findOrFail($validated['room_id']);

        $startDate = Carbon::parse($validated['start_time'])->startOfDay();
        $endDate   = Carbon::parse($validated['end_time'])->startOfDay();
        $current   = $startDate->copy();

        while ($current->lte($endDate)) {
            $overlapCount = Booking::where('room_id', $validated['room_id'])
                ->whereDate('start_time', '<=', $current)
                ->whereDate('end_time', '>=', $current)
                ->count();

            if ($overlapCount >= $room->capacity) {
                return response()->json([
                    'success' => false,
                    'message' => "Room is fully booked on {$current->format('Y-m-d')}. Capacity: {$room->capacity}, Current: {$overlapCount}"
                ], 422);
            }
            $current->addDay();
        }

        $booking = Booking::create([
            'room_id'    => $validated['room_id'],
            'user_id'    => auth()->id(),
            'title'      => $validated['title'],
            'start_time' => $validated['start_time'],
            'end_time'   => $validated['end_time'],
            'color'      => $validated['color'] ?? '#10B981',
        ]);

        BookingLog::create([
            'booking_id' => $booking->id,
            'user_id'    => auth()->id(),
            'action'     => 'created',
            'old_data'   => null,
            'new_data'   => $booking->toArray(),
        ]);

        return response()->json([
            'success' => true,
            'data'    => $booking->load('room')
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $booking = Booking::findOrFail($id);

        $validated = $request->validate([
            'room_id'    => 'sometimes|exists:rooms,id',
            'start_time' => 'sometimes|date',
            'end_time'   => 'sometimes|date|after:start_time',
            'title'      => 'sometimes|string',
            'color'      => 'sometimes|string'
        ]);

        $roomId    = $validated['room_id'] ?? $booking->room_id;
        $startTime = $validated['start_time'] ?? $booking->start_time;
        $endTime   = $validated['end_time'] ?? $booking->end_time;
        $room      = Room::findOrFail($roomId);

        $startDate = Carbon::parse($startTime)->startOfDay();
        $endDate   = Carbon::parse($endTime)->startOfDay();
        $current   = $startDate->copy();

        while ($current->lte($endDate)) {
            $overlapCount = Booking::where('room_id', $roomId)
                ->where('id', '!=', $id)
                ->whereDate('start_time', '<=', $current)
                ->whereDate('end_time', '>=', $current)
                ->count();

            if ($overlapCount >= $room->capacity) {
                return response()->json([
                    'success' => false,
                    'message' => "Room is fully booked on {$current->format('Y-m-d')}"
                ], 422);
            }
            $current->addDay();
        }

        $oldData = $booking->toArray();
        $booking->update($validated);

        BookingLog::create([
            'booking_id' => $booking->id,
            'user_id'    => auth()->id(),
            'action'     => 'updated',
            'old_data'   => $oldData,
            'new_data'   => $booking->fresh()->toArray(),
        ]);

        return response()->json([
            'success' => true,
            'data'    => $booking->fresh(['room'])
        ]);
    }

    public function move(Request $request, $id)
    {
        $booking = Booking::findOrFail($id);
        $user    = auth()->user();

        if (!$user || ($user->role !== 'admin' && $booking->user_id !== $user->id)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized!'], 403);
        }

        $validated = $request->validate([
            'room_id'    => 'required|exists:rooms,id',
            'start_time' => 'required|date',
            'end_time'   => 'required|date|after:start_time',
        ]);

        $room    = Room::findOrFail($validated['room_id']);
        $current = Carbon::parse($validated['start_time'])->startOfDay();
        $endDate = Carbon::parse($validated['end_time'])->startOfDay();

        while ($current->lte($endDate)) {
            $overlapCount = Booking::where('room_id', $validated['room_id'])
                ->where('id', '!=', $id)
                ->whereDate('start_time', '<=', $current)
                ->whereDate('end_time', '>=', $current)
                ->count();

            if ($overlapCount >= $room->capacity) {
                return response()->json([
                    'success' => false,
                    'message' => 'Target time slot is fully booked!'
                ], 409);
            }
            $current->addDay();
        }

        $oldData = $booking->toArray();
        $booking->update($validated);

        BookingLog::create([
            'booking_id' => $booking->id,
            'user_id'    => auth()->id(),
            'action'     => 'moved',
            'old_data'   => $oldData,
            'new_data'   => $booking->fresh()->toArray(),
        ]);

        return response()->json([
            'success' => true,
            'data'    => $booking->fresh(['room', 'user'])
        ]);
    }

    public function destroy($id)
    {
        $booking = Booking::findOrFail($id);
        $user    = auth()->user();

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        if ($user->role !== 'admin' && $booking->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized!'], 403);
        }

        BookingLog::create([
            'booking_id' => $booking->id,
            'user_id'    => auth()->id(),
            'action'     => 'deleted',
            'old_data'   => $booking->toArray(),
            'new_data'   => null,
        ]);

        $booking->delete();

        return response()->json(['success' => true, 'message' => 'Deleted successfully']);
    }

    public function getAvailableRanges(Request $request)
    {
        $startDate = $request->query('start_date');
        $days      = (int) $request->query('days', 1);

        if (!$startDate) {
            return response()->json(['success' => false, 'message' => 'start_date required'], 400);
        }

        $endDate = Carbon::parse($startDate)->addDays($days - 1)->format('Y-m-d');

        $availableRooms = Room::with('features')->get()->filter(function ($room) use ($startDate, $endDate) {
            $current = Carbon::parse($startDate);
            $end     = Carbon::parse($endDate);

            while ($current->lte($end)) {
                $count = Booking::where('room_id', $room->id)
                    ->whereDate('start_time', '<=', $current)
                    ->whereDate('end_time', '>=', $current)
                    ->count();

                if ($count >= $room->capacity) return false;
                $current->addDay();
            }
            return true;
        })->values();

        return response()->json([
            'success' => true,
            'data'    => $availableRooms->map(fn($room) => [
                'id'       => $room->id,
                'name'     => $room->name,
                'capacity' => $room->capacity,
                'features' => $room->features,
                'ranges'   => [[
                    'start' => $startDate,
                    'end'   => $endDate,
                    'days'  => $days
                ]]
            ])
        ]);
    }
}
