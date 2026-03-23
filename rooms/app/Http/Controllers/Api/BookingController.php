<?php

namespace App\Http\Controllers\Api;

use App\Models\Booking;
use App\Models\Room;
use App\Models\BookingLog;
use App\Models\Guest;

use App\Http\Resources\BookingResource;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BookingController extends Controller
{
public function index(Request $request)
{
    $sortColumn = in_array($request->sort, ['updated_at', 'created_at', 'check_in', 'check_out'])
        ? $request->sort
        : 'check_in';

    $sortOrder = in_array($request->order, ['asc', 'desc']) ? $request->order : 'asc';

    $query = Booking::with(['room', 'type', 'status'])
        ->when($request->room_id, fn($q) => $q->where('room_id', $request->room_id))
        ->orderBy($sortColumn, $sortOrder);

    if ($request->has('limit') && is_numeric($request->limit)) {
        $query->limit((int) $request->limit);
    }

    // --- YENİ: Rol Tanımlarını Çekiyoruz ---
    $guestRoles = \DB::table('lookup_values')
        ->where('type_id', 6)
        ->orderBy('sort_order')
        ->get();

    // Resource collection döndürürken 'additional' ile rolleri ekliyoruz
    return BookingResource::collection($query->get())->additional([
        'meta' => [
            'guest_roles' => $guestRoles
        ]
    ]);
}

    /**
     * Son İşlemler Paneli İçin
     */
    public function recent(Request $request)
    {
        $limit = min((int) $request->get('limit', 10), 100);

        $bookings = Booking::with(['room', 'type', 'status'])
            ->orderBy('updated_at', 'desc')
            ->limit($limit)
            ->get();

        return BookingResource::collection($bookings);
    }


public function store(Request $request)
    {
        try {
            // 1. Validasyon
            $validated = $request->validate([
                'room_id'                => 'required|exists:rooms,id',
                'check_in'               => 'required',
                'check_out'              => 'required',
                'guest_id'               => 'nullable|exists:guests,id',
                'snapshot_guest_name'    => 'nullable|string',
                'snapshot_guest_email'   => 'nullable|string',
                'snapshot_guest_role_id' => 'nullable', 
                'status'                 => 'sometimes|string',
                'snapshot_is_vip'        => 'sometimes'
            ]);

            $room = Room::findOrFail($validated['room_id']);

            // 2. Veri Hazırlama (Frontend'den gelen yapıya göre güvenli çekim)
            $guestName  = $request->input('snapshot_guest_name') ?? 'GUEST';
            $guestEmail = $request->input('snapshot_guest_email') ?? 'guest@hotel.com';
            $guestRole  = $request->input('snapshot_guest_role_id') ?? 33;
            $isVip      = $request->boolean('snapshot_is_vip', false);

            // 3. Çakışma Kontrolü
            if (!$this->isAvailable($validated['room_id'], $validated['check_in'], $validated['check_out'], $room->capacity)) {
                return response()->json(['success' => false, 'message' => "Room capacity full!"], 422);
            }
         $rawName = $request->input('snapshot_guest_name') 
           ?? $request->input('guest_data.full_name') 
           ?? 'Guest User';

// İlk harfleri büyük, gerisini küçük yapıyoruz (Örn: "ahmet yılmaz" -> "Ahmet Yılmaz")
$guestName = mb_convert_case($rawName, MB_CASE_TITLE, "UTF-8");

            // 4. Kayıt İşlemi
            // 'status' değerini frontend'deki dropdown'dan (confirmed, checked_in vb.) alıyoruz
            $status = $request->input('status', 'confirmed');

            $booking = DB::transaction(function () use ($validated, $guestName, $guestEmail, $guestRole, $isVip, $status) {
                return Booking::create([
                    'room_id'                => $validated['room_id'],
                    'guest_id'               => $validated['guest_id'] ?? null,
                    'check_in'               => $validated['check_in'],
                    'check_out'              => $validated['check_out'],
                    'snapshot_guest_name'    => $guestName,
                    'snapshot_guest_email'   => $guestEmail,
                    'snapshot_guest_role_id' => $guestRole,
                    'snapshot_is_vip'        => $isVip,
                    'status'                 => $status, 
                ]);
            });

            // 5. Log Kaydı (Hata almaması için $request yerine $booking kullanıyoruz)
            try {
                BookingLog::create([
                    'booking_id' => $booking->id,
                    'user_id'    => auth()->id(),
                    'action'     => 'created',
                    'new_data'   => $booking->toArray(),
                ]);
            } catch (\Exception $logEx) {
                Log::warning("Log fail: " . $logEx->getMessage());
            }

            // ÖNEMLİ: guest ilişkisi Modelde 'guest()' olarak tanımlı olmalı
            return response()->json([
                'success' => true, 
                'data' => new BookingResource($booking->load(['room', 'guest']))
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error("--- [!] STORE HATASI ---: " . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
    /**
     * Güncelleme
     */

public function update(Request $request, $id)
{
    try {
        $booking = Booking::findOrFail($id);
        
        // 1. Validasyon Kurallarını Güncelleyelim
        $validated = $request->validate([
            'room_id'                => 'sometimes|exists:rooms,id',
            'check_in'               => 'sometimes',
            'check_out'              => 'sometimes',
            'status'                 => 'sometimes|string', // Status eklendi
            'snapshot_guest_role_id' => 'sometimes',
            'snapshot_is_vip'        => 'sometimes',
            'full_name'              => 'sometimes|string',
        ]);

        // 2. STATUS GÜNCELLEME (Kritik eksik!)
        if ($request->has('status')) {
            $booking->status = $request->input('status');
        }

        // 3. İSİM GÜNCELLEME (full_name veya snapshot_guest_name gelirse)
        $nameInput = $request->input('full_name') ?? $request->input('snapshot_guest_name') ?? $request->input('guest_data.full_name');
        if ($nameInput) {
            $booking->snapshot_guest_name = mb_convert_case($nameInput, MB_CASE_TITLE, "UTF-8");
        }

        // 4. ROL GÜNCELLEME
        $roleInput = $request->input('snapshot_guest_role_id') ?? $request->input('guest_data.role_id');
        if ($roleInput) {
            $booking->snapshot_guest_role_id = $roleInput;
        }

        // 5. VIP GÜNCELLEME
        if ($request->has('snapshot_is_vip') || $request->has('is_vip') || $request->has('guest_data.is_vip')) {
            $isVip = $request->input('snapshot_is_vip') ?? $request->input('is_vip') ?? $request->input('guest_data.is_vip');
            $booking->snapshot_is_vip = filter_var($isVip, FILTER_VALIDATE_BOOLEAN);
        }

        // 6. Standart Alanları Fill Et (room_id, check_in vb.)
        $booking->fill($validated);
        
        // 7. Kaydet
        $booking->save();

        // 8. Guest Tablosu ile Senkronizasyon
        if ($booking->guest_id) {
            Guest::where('id', $booking->guest_id)->update([
                'full_name' => $booking->snapshot_guest_name,
                'role_id'   => $booking->snapshot_guest_role_id,
                'is_vip'    => $booking->snapshot_is_vip,
            ]);
        }

        return response()->json([
            'success' => true, 
            'data' => new BookingResource($booking->fresh(['room', 'guest']))
        ]);

    } catch (\Exception $e) {
        Log::error("--- [!] UPDATE HATASI ---: " . $e->getMessage());
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}
    public function move(Request $request, $id)
    {
        $booking = Booking::findOrFail($id);
        
        $validated = $request->validate([
            'room_id'   => 'required|exists:rooms,id',
            'check_in'  => 'required|date',
            'check_out' => 'required|date|after_or_equal:check_in',
        ]);

        $room = Room::findOrFail($validated['room_id']);

        if (!$this->isAvailable($validated['room_id'], $validated['check_in'], $validated['check_out'], $room->capacity, $id)) {
            return response()->json(['success' => false, 'message' => 'Hedef slot dolu!'], 409);
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

        return response()->json(['success' => true, 'data' => new BookingResource($booking->fresh(['room']))]);
    }

    /**
     * Silme
     */
    public function destroy($id)
    {
        $booking = Booking::findOrFail($id);
        
        BookingLog::create([
            'booking_id' => $booking->id,
            'user_id'    => auth()->id(),
            'action'     => 'deleted',
            'old_data'   => $booking->toArray(),
        ]);

        $booking->delete();
        return response()->json(['success' => true, 'message' => 'Deleted successfully']);
    }

    /**
     * Müsait Odaları Sorgula
     */
    public function getAvailableRanges(Request $request)
    {
        $startDate = $request->query('start_date');
        $days      = (int) $request->query('days', 1);

        if (!$startDate) return response()->json(['success' => false, 'message' => 'start_date required'], 400);

        $checkIn  = Carbon::parse($startDate);
        $checkOut = $checkIn->copy()->addDays($days - 1);

        $availableRooms = Room::with('features')->get()->filter(function ($room) use ($checkIn, $checkOut) {
            $tempDate = $checkIn->copy();
            while ($tempDate->lte($checkOut)) {
                $count = Booking::where('room_id', $room->id)
                    ->whereDate('check_in', '<=', $tempDate)
                    ->whereDate('check_out', '>=', $tempDate)
                    ->count();
                if ($count >= $room->capacity) return false;
                $tempDate->addDay();
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
                'ranges'   => [['start' => $checkIn->toDateString(), 'end' => $checkOut->toDateString(), 'days' => $days]]
            ])
        ]);
    }

    /**
     * Yardımcı: Müsaitlik Kontrolü
     */
    private function isAvailable($roomId, $start, $end, $capacity, $excludeId = null)
    {
        $current = Carbon::parse($start);
        $last    = Carbon::parse($end);

        while ($current->lte($last)) {
            $count = Booking::where('room_id', $roomId)
                ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
                ->whereDate('check_in', '<=', $current)
                ->whereDate('check_out', '>=', $current)
                ->count();
            if ($count >= $capacity) return false;
            $current->addDay();
        }
        return true;
    }
}