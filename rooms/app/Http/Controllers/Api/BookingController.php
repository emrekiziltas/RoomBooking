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
        \Log::info("--- [GÜNCELLEME BAŞLADI] ID: {$id} ---");

        $booking = Booking::findOrFail($id);
        $oldData = $booking->toArray();

        // 1. Veritabanındaki MEVCUT saatleri yedekle
        $currentIn  = Carbon::parse($booking->check_in);
        $currentOut = Carbon::parse($booking->check_out);
        
        \Log::info("Adım 1: DB'deki Mevcut Saatler", [
            'check_in_saat'  => $currentIn->toTimeString(),
            'check_out_saat' => $currentOut->toTimeString()
        ]);

  // 2. Check-in İşleme
if ($request->has('check_in')) {
    $rawIn = $request->input('check_in');
    if (str_contains($rawIn, ':')) {
        $booking->check_in = Carbon::parse($rawIn)->toDateTimeString();
        \Log::info("Karar: Giriş saati kullanıcı tarafından belirlendi.");
    } else {
        $booking->check_in = Carbon::parse($rawIn)->setTime($currentIn->hour, $currentIn->minute, $currentIn->second)->toDateTimeString();
        \Log::info("Karar: Sürükleme yapıldı, eski giriş saati korundu.");
    }
}

// 3. Check-out İşleme
if ($request->has('check_out')) {
    $rawOut = $request->input('check_out');
    if (str_contains($rawOut, ':')) {
        // Eğer kullanıcı modal'dan saatli bir veri gönderdiyse (örn: 12:30)
        $booking->check_out = Carbon::parse($rawOut)->toDateTimeString();
        \Log::info("Karar: Çıkış saati kullanıcı tarafından belirlendi.");
    } else {
        // Eğer sadece tarih geldiyse (sürükleme), eski çıkış saatini üzerine yaz
        $booking->check_out = Carbon::parse($rawOut)->setTime($currentOut->hour, $currentOut->minute, $currentOut->second)->toDateTimeString();
        \Log::info("Karar: Sürükleme yapıldı, eski çıkış saati korundu.");
    }
}

        // 4. Müsaitlik Kontrolü Logu
        $targetRoomId = $request->input('room_id', $booking->room_id);
        $room = Room::findOrFail($targetRoomId);

        \Log::info("Adım 4: Müsaitlik Kontrolü Yapılıyor...", ['oda' => $room->name]);

        if (!$this->isAvailable($targetRoomId, $booking->check_in, $booking->check_out, $room->capacity, $id)) {
            \Log::warning("!!! HATA: Oda Dolu !!!", ['booking_id' => $id]);
            return response()->json(['success' => false, 'message' => "Bu tarihlerde oda dolu!"], 422);
        }

        // 5. Kayıt Öncesi "Dirty" Kontrolü
        $booking->fill($request->except(['check_in', 'check_out', 'snapshot_guest_name']));
        
        \Log::info("Adım 5: Değişen Alanlar (Dirty)", $booking->getDirty());

        // 6. Kaydetme İşlemi
        if ($booking->isDirty()) {
            $booking->save();
            \Log::info("✅ Adım 6: Veritabanına Yazıldı.");
            
            $booking = $booking->fresh(['room', 'guest']);
            $this->logAction($booking, 'updated', $oldData);
            $this->syncGuest($booking);
        } else {
            \Log::info("Bilgi: Hiçbir değişiklik algılanmadı, save atlandı.");
        }

        \Log::info("--- [GÜNCELLEME BİTTİ] ---");

        return response()->json([
            'success' => true, 
            'data' => new BookingResource($booking)
        ]);

    } catch (\Exception $e) {
        \Log::error("🔴 KRİTİK HATA: " . $e->getMessage(), [
            'dosya' => $e->getFile(),
            'satir' => $e->getLine()
        ]);
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

public function move(Request $request, $id)
{
    try {
        $booking = Booking::findOrFail($id);
        $oldData = $booking->toArray();

        // 1. Orijinal verileri ve aradaki gün farkını (süreyi) hesapla
        $oldIn = Carbon::parse($booking->check_in);
        $oldOut = Carbon::parse($booking->check_out);
        
        // Rezervasyon kaç gün/saat sürüyor? (Farkı sakla)
        $durationInMinutes = $oldIn->diffInMinutes($oldOut);

        // 2. Yeni Günü Belirle (Saatleri DB'den koru)
        if ($request->has('check_in')) {
            $targetDate = Carbon::parse($request->input('check_in'));
            
            // Yeni check-in: Hedef Gün + Eski Saat
            $newIn = $targetDate->setTime($oldIn->hour, $oldIn->minute, $oldIn->second);
            $booking->check_in = $newIn->toDateTimeString();

            // 3. ✨ KRİTİK NOKTA: Check-out'u süreyi ekleyerek hesapla
            // Böylece 3 günlükse, yine 3 gün sonrasına atar
            $booking->check_out = $newIn->copy()->addMinutes($durationInMinutes)->toDateTimeString();
            
            \Log::info("Move: Süre korundu ({$durationInMinutes} dk). Yeni: {$booking->check_in} - {$booking->check_out}");
        }

        if ($request->has('room_id')) {
            $booking->room_id = $request->input('room_id');
        }

        // 4. Müsaitlik Kontrolü
        $room = Room::findOrFail($booking->room_id);
        if (!$this->isAvailable($booking->room_id, $booking->check_in, $booking->check_out, $room->capacity, $id)) {
            return response()->json(['success' => false, 'message' => 'Bu tarihlerde oda dolu!'], 422);
        }

        $booking->save();
        return response()->json(['success' => true, 'data' => $booking->fresh(['room', 'guest'])]);

    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
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


}