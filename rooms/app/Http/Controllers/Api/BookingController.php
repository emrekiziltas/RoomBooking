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
    /**
     * Takvim Verilerini Getir
     */
public function index(Request $request)
{
    try {
        // Misafiri (guest) ve rolünü (guest.role) de yükleyelim ki modalda eksik kalmasın
        $query = Booking::with(['room', 'guest.role']);

        // 1. Oda Filtresi
        if ($request->filled('room_id')) {
            $query->where('room_id', $request->room_id);
        }

        // 2. Statü Filtresi
        if ($request->filled('status')) {
            $statuses = explode(',', $request->status);
            $query->whereIn('status', $statuses);
        } else {
            $query->whereIn('status', ['confirmed', 'checked_in', 'staying', 'completed']);
        }

        $bookings = $query->orderBy('check_in', 'asc')->get();

        // --- DİNAMİK ROL ÇEKME ---
        // LookupValue'ları çekmek için önce 'guest_role' tipinin ID'sini buluyoruz
        $roles = \App\Models\LookupValue::byType('roles')
            ->active()
            ->ordered()
            ->get(['id', 'label', 'key', 'metadata']);

        return response()->json([
            'data' => $bookings,
            'meta' => [
                'guest_roles' => $roles
            ]
        ]);

    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
}
    /**
     * Yeni Kayıt (Store)
     */
    public function store(Request $request)
    {
        try {
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

            // Müsaitlik Kontrolü
            if (!$this->isAvailable($validated['room_id'], $validated['check_in'], $validated['check_out'], $room->capacity)) {
                return response()->json(['success' => false, 'message' => "Oda kapasitesi dolu!"], 422);
            }

            $rawName = $request->input('snapshot_guest_name') ?? 'Guest User';
            $guestName = mb_convert_case($rawName, MB_CASE_TITLE, "UTF-8");

            $booking = DB::transaction(function () use ($validated, $guestName, $request) {
                return Booking::create([
                    'room_id'                => $validated['room_id'],
                    'guest_id'               => $validated['guest_id'] ?? null,
                    'check_in'               => Carbon::parse($validated['check_in'])->toDateTimeString(),
                    'check_out'              => Carbon::parse($validated['check_out'])->toDateTimeString(),
                    'snapshot_guest_name'    => $guestName,
                    'snapshot_guest_email'   => $request->input('snapshot_guest_email', 'guest@hotel.com'),
                    'snapshot_guest_role_id' => $request->input('snapshot_guest_role_id', 33),
                    'snapshot_is_vip'        => $request->boolean('snapshot_is_vip', false),
                    'status'                 => $request->input('status', 'confirmed'),
                ]);
            });

            $this->logAction($booking, 'created');

            return response()->json(['success' => true, 'data' => new BookingResource($booking->load(['room']))], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Güncelleme ve Sürükle-Bırak (Update)
     */

         public function update(Request $request, $id)
{
    try {
        $booking = Booking::findOrFail($id);
        $oldData = $booking->toArray();

        $validated = $request->validate([
            'room_id'                => 'sometimes|exists:rooms,id',
            'check_in'               => 'sometimes',
            'check_out'              => 'sometimes',
            'status'                 => 'sometimes|string',
            'snapshot_guest_role_id' => 'sometimes|integer',
            'snapshot_is_vip'        => 'sometimes',
            'snapshot_guest_name'    => 'sometimes|string',
        ]);

        $targetRoomId   = $request->input('room_id', $booking->room_id);
        $targetCheckIn  = $request->input('check_in', $booking->check_in);
        $targetCheckOut = $request->input('check_out', $booking->check_out);
        
        $room = Room::findOrFail($targetRoomId);

        if (!$this->isAvailable($targetRoomId, $targetCheckIn, $targetCheckOut, $room->capacity, $id)) {
            return response()->json([
                'success' => false,
                'message' => "CONFLICT: Room {$room->name} is full at the selected dates."
            ], 422);
        }

        $booking->fill($request->except(['check_in', 'check_out', 'snapshot_guest_name']));
        
        if ($request->has('check_in')) $booking->check_in = Carbon::parse($request->check_in)->toDateTimeString();
        if ($request->has('check_out')) $booking->check_out = Carbon::parse($request->check_out)->toDateTimeString();
        
        if ($request->has('snapshot_guest_name')) {
            $booking->snapshot_guest_name = mb_convert_case($request->snapshot_guest_name, MB_CASE_TITLE, "UTF-8");
        }

        // 1. Önce normal kayıt işlemini yap
        if ($booking->isDirty()) {
            $booking->save();
            $booking = $booking->fresh(); // Veriyi tazele
            
            $this->logAction($booking, 'updated', $oldData);
            $this->syncGuest($booking);
        }

        // 2. LOG BURADA: Statü kontrolü başlıyor mu?
        \Log::info("Kontrol Noktası booking id update edildi " . $booking->id);

        if ($booking->status === 'checked_in') {
            \Log::info("Evet, statü checked_in. Fonksiyona giriliyor...");
            $this->syncGuestToCheckIn($booking);
        }

        // 3. Response'u try bloğunun en sonunda dön
        return response()->json([
            'success' => true, 
            'data' => new BookingResource($booking->fresh(['room', 'guest']))
        ]);

    } catch (\Exception $e) {
        \Log::error("Update Metodunda Hata: " . $e->getMessage());
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}
          
    /**
     * Müsaitlik Sorgusu
     */

    private function isAvailable($roomId, $start, $end, $capacity, $excludeId = null)
{
    // Saatleri sıfırlama, gelen saati olduğu gibi kullan:
    $checkIn  = Carbon::parse($start);
    $checkOut = Carbon::parse($end);

    $occupancy = Booking::where('room_id', $roomId)
        ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
        ->whereIn('status', ['confirmed', 'checked_in', 'staying', 'completed']) 
        ->where(function ($query) use ($checkIn, $checkOut) {
            // Standart Overlap (Çakışma) Algoritması
            $query->where('check_in', '<', $checkOut)
                  ->where('check_out', '>', $checkIn);
        })
        ->count();

    return $occupancy < $capacity;
}

    private function syncGuest($booking)
    {
        if ($booking->guest_id) {
            Guest::where('id', $booking->guest_id)->update([
                'role_id'   => $booking->snapshot_guest_role_id,
                'is_vip'    => $booking->snapshot_is_vip,
                'full_name' => $booking->snapshot_guest_name
            ]);
        }
    }
private function syncGuestToCheckIn($booking)
{
    try {
        // Log ile hangi ID'nin geldiğini kesinleştirelim
        $targetGuestId = $booking->guest_id;
        \Log::info("DEBUG: syncGuestToCheckIn tetiklendi. Booking ID: {$booking->id}, Hedef Guest ID: {$targetGuestId}");

        if (!$targetGuestId) {
            \Log::warning("⚠️ HATA: Booking nesnesinde guest_id bulunamadı!");
            return;
        }

        // Ana misafir kaydını bul
        $guest = \App\Models\Guest::find($targetGuestId);

        if ($guest) {
            // Sadece snapshot alanlarını güncelle
            // 'update' metodu modeldeki fillable korumasına takılır, 
            // alanların Booking modelinde fillable olduğundan emin ol!
            $booking->update([
                'snapshot_guest_email'   => $guest->email,
                'snapshot_guest_company' => $guest->company,
            ]);

            \Log::info("✅ BAŞARILI: Booking #{$booking->id} için Guest #{$targetGuestId} verileri mühürlendi.");
        } else {
            \Log::error("❌ HATA: Guest ID {$targetGuestId} veritabanında bulunamadı!");
        }

    } catch (\Exception $e) {
        \Log::error("Sync Hatası: " . $e->getMessage());
    }
}
    private function logAction($booking, $action, $oldData = null)
    {
        try {
            BookingLog::create([
                'booking_id' => $booking->id,
                'user_id'    => auth()->id() ?? 1,
                'action'     => $action,
                'old_data'   => $oldData,
                'new_data'   => $booking->toArray(),
            ]);
        } catch (\Exception $e) { 
            Log::warning("Log Error: " . $e->getMessage()); 
        }
    }

    public function destroy($id)
    {
        $booking = Booking::findOrFail($id);
        $this->logAction($booking, 'deleted', $booking->toArray());
        $booking->delete();
        return response()->json(['success' => true]);
    }

    public function move(Request $request, $id) 
    { 
        return $this->update($request, $id); 
    }
}