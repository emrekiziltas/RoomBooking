<?php
/*
namespace App\Http\Controllers\Api;

use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class BookingController extends Controller
{
    // Çakışma kontrolü - tekrar kullanılabilir
    private function hasConflict($roomId, $startTime, $endTime, $excludeId = null)
    {
        return Booking::where('room_id', $roomId)
            ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime)
            ->exists();
    }

    public function index(Request $request)
    {
        $bookings = Booking::query()
            ->when($request->room_id, fn($q) => $q->where('room_id', $request->room_id))
            ->when($request->start, fn($q) => $q->where('start_time', '>=', $request->start))
            ->when($request->end, fn($q) => $q->where('end_time', '<=', $request->end))
            ->get();

        return response()->json(['success' => true, 'data' => $bookings]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'room_id'    => 'required|exists:rooms,id',
            'title'      => 'required|string',
            'start_time' => 'required|date|after:now',
            'end_time'   => 'required|date|after:start_time',
        ]);

        if ($this->hasConflict($request->room_id, $request->start_time, $request->end_time)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu zaman dilimi dolu!'
            ], 409);
        }

        $booking = Booking::create([
            'room_id'    => $request->room_id,
            'user_id'    => 1, // auth ekleyince değişecek
            'title'      => $request->title,
            'start_time' => $request->start_time,
            'end_time'   => $request->end_time,
            'color'      => $request->color ?? '#3B82F6',
        ]);

        return response()->json(['success' => true, 'data' => $booking], 201);
    }

    public function move(Request $request, $id)
    {
        $booking = Booking::findOrFail($id);

        $request->validate([
            'room_id'    => 'required|exists:rooms,id',
            'start_time' => 'required|date',
            'end_time'   => 'required|date|after:start_time',
        ]);

        if ($this->hasConflict($request->room_id, $request->start_time, $request->end_time, $id)) {
            return response()->json([
                'success' => false,
                'message' => 'Hedef zaman dilimi dolu!'
            ], 409);
        }

        $booking->update([
            'room_id'    => $request->room_id,
            'start_time' => $request->start_time,
            'end_time'   => $request->end_time,
        ]);

        return response()->json(['success' => true, 'data' => $booking->fresh()]);
    }

    public function resize(Request $request, $id)
    {
        $booking = Booking::findOrFail($id);

        $request->validate([
            'end_time' => 'required|date|after:' . $booking->start_time,
        ]);

        if ($this->hasConflict($booking->room_id, $booking->start_time, $request->end_time, $id)) {
            return response()->json([
                'success' => false,
                'message' => 'Süre uzatılamıyor, çakışma var!'
            ], 409);
        }

        $booking->update(['end_time' => $request->end_time]);

        return response()->json(['success' => true, 'data' => $booking->fresh()]);
    }

    public function destroy($id)
    {
        Booking::findOrFail($id)->delete();
        return response()->json(['success' => true, 'message' => 'Silindi']);
    }
}*/
namespace App\Http\Controllers\Api;

use App\Models\Booking;
use App\Models\Room;
use App\Http\Requests\StoreBookingRequest;
use App\Http\Requests\MoveBookingRequest;
use App\Http\Requests\ResizeBookingRequest;
use App\Http\Resources\BookingResource;
use App\Services\BookingService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class BookingController extends Controller
{
    public function __construct(private BookingService $service) {}

public function index(Request $request)
{
    $bookings = Booking::with(['room', 'user'])
        ->where('start_time', '>=', now()->subDay()->startOfDay())
        ->when($request->room_id, fn($q) => $q->where('room_id', $request->room_id))
        // 'updated_at' sütununa göre azalan (DESC) sıralama ekliyoruz:
        ->orderBy('updated_at', 'desc') 
        ->get();

    return BookingResource::collection($bookings);
}
/*
public function store(StoreBookingRequest $request)
{
    $data = $request->validated();

    if ($this->service->hasConflict(
        $data['room_id'],
        \Carbon\Carbon::parse($data['start_time']),
        \Carbon\Carbon::parse($data['end_time'])
    )) {
        return response()->json(['success' => false, 'message' => 'Bu saatlerde oda dolu.'], 409);
    }

    $booking = $request->user()->bookings()->create($data);

    return new BookingResource($booking->load(['room', 'user']));
}
*/

public function store(Request $request)
{
    // 1. Gelen verileri doğrula
    $validated = $request->validate([
        'room_id' => 'required|exists:rooms,id',
        'start_time' => 'required|date',
        'end_time' => 'required|date|after:start_time',
        'title' => 'required|string'
    ]);

    // 2. Odayı ve kapasitesini bul
    $room = Room::findOrFail($request->room_id);

    // 3. Çakışan rezervasyonların sayısını bul
    $overlapCount = Booking::where('room_id', $request->room_id)
        ->where(function ($query) use ($request) {
            $query->where('start_time', '<', $request->end_time)
                  ->where('end_time', '>', $request->start_time);
        })->count();

    // 4. Kapasite Kontrolü
    // Eğer çakışan rezervasyon sayısı, oda kapasitesine eşit veya büyükse hata ver
    if ($overlapCount >= $room->capacity) {
        return response()->json([
            'success' => false,
            'message' => "Bu oda tamamen dolu. Kapasite: {$room->capacity}, Mevcut Doluluk: {$overlapCount}"
        ], 422);
    }

    // 5. Kaydı oluştur
    $booking = Booking::create([
        'room_id' => $request->room_id,
        'user_id' => auth()->id(), // Eğer auth kullanıyorsan
        'title' => $request->title,
        'start_time' => $request->start_time,
        'end_time' => $request->end_time,
        'color' => '#10B981', // Varsayılan renk
    ]);

    return response()->json([
        'success' => true,
        'data' => $booking
    ]);
}
public function move(MoveBookingRequest $request, $id)
    {
        $booking = Booking::findOrFail($id);
        $user = auth()->user();

        if ($user->role !== 'admin' && $booking->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Yetkiniz yok!'], 403);
        }

        $data = $request->validated();

        if ($this->service->hasConflict($data['room_id'], $data['start_time'], $data['end_time'], $id)) {
            return response()->json(['success' => false, 'message' => 'Hedef zaman dilimi dolu!'], 409);
        }

        $booking->update($data);

        return new BookingResource($booking->fresh(['room', 'user']));
    }

    public function resize(ResizeBookingRequest $request, $id)
    {
        $booking = Booking::findOrFail($id);
        $user = auth()->user();

        if ($user->role !== 'admin' && $booking->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Yetkiniz yok!'], 403);
        }

        if ($this->service->hasConflict($booking->room_id, $booking->start_time, $request->end_time, $id)) {
            return response()->json(['success' => false, 'message' => 'Süre uzatılamıyor, çakışma var!'], 409);
        }

        $booking->update(['end_time' => $request->end_time]);

        return new BookingResource($booking->fresh(['room', 'user']));
    }

public function update(Request $request, $id)
{
    $booking = Booking::findOrFail($id);
    $user = auth()->user();

    // Yetki Kontrolü
    if ($user->role !== 'admin' && $booking->user_id !== $user->id) {
        return response()->json(['success' => false, 'message' => 'Yetkiniz yok!'], 403);
    }

    $request->validate([
        'title'      => 'sometimes|string|max:255',
        'color'      => 'sometimes|string|max:7',
        'start_time' => 'sometimes|date',
        'end_time'   => [
            'sometimes',
            'date',
            'after:' . ($request->start_time ?? $booking->start_time),
        ],
    ]);

    // Kapasite ve Çakışma Kontrolü
    if ($request->has('start_time') || $request->has('end_time') || $request->has('room_id')) {
        $startTime = $request->start_time ?? $booking->start_time;
        $endTime   = $request->end_time ?? $booking->end_time;
        $roomId    = $request->room_id ?? $booking->room_id;
        
        $room = Room::findOrFail($roomId);

        // ÖNEMLİ DÜZELTME: 
        // 1. Güncellenen kaydın kendisini hariç tut (where('id', '!=', $id))
        // 2. Çakışanların sayısını al (count())
        $overlapCount = Booking::where('room_id', $roomId)
            ->where('id', '!=', $id) // Kendisini sayma
            ->where(function ($query) use ($startTime, $endTime) {
                $query->where('start_time', '<', $endTime)
                      ->where('end_time', '>', $startTime);
            })->count();

        // Kapasite Kontrolü: Mevcutlar + 1 (güncellenen kayıt) > Kapasite mi?
        if ($overlapCount >= $room->capacity) {
            return response()->json([
                'success' => false,
                'message' => "Bu oda kapasitesi dolu! Kapasite: {$room->capacity}, Diğer Doluluk: {$overlapCount}",
                'debug' => [
                    'current_booking_id' => $id,
                    'conflicts_count' => $overlapCount
                ]
            ], 422);
        }
    }

    // Güncelleme işlemi
    $booking->update($request->only(['title', 'color', 'start_time', 'end_time', 'room_id']));

    return new BookingResource($booking->fresh(['room', 'user']));
}
    public function getAvailableRooms(Request $request)
{
    $request->validate([
        'date' => 'required|date',
    ]);

    $date = $request->query('date');

    // 1. O tarihte herhangi bir rezervasyonu olan oda ID'lerini çekiyoruz
    // distinct() kullanarak aynı odanın mükerrer gelmesini engelliyoruz
    $bookedRoomIds = Booking::whereDate('start_time', $date)
        ->distinct()
        ->pluck('room_id');

    // 2. Bu ID'ler içinde olmayan TÜM odaları getiriyoruz
    // Eğer odalar için de bir Resource'un varsa (RoomResource) onu kullanabilirsin
    $availableRooms = \App\Models\Room::whereNotIn('id', $bookedRoomIds)->get();

    return response()->json([
        'success' => true,
        'data'    => $availableRooms
    ]);
}
    public function destroy($id)
    {
        $booking = Booking::findOrFail($id);
        $user = auth()->user();

        if ($user->role !== 'admin' && $booking->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Yetkiniz yok!'], 403);
        }

        $booking->delete();
        return response()->json(['success' => true, 'message' => 'Silindi']);
    }
}