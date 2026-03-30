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

        // 1. Mevcut Tarihleri Yedekle (Sürükleme yapıldığında saati korumak için)
        $currentIn  = \Carbon\Carbon::parse($booking->check_in);
        $currentOut = \Carbon\Carbon::parse($booking->check_out);

        // 2. Genel Alanları Doldur (Tarihleri şimdilik hariç tutuyoruz)
        $booking->fill($request->except(['check_in', 'check_out', 'snapshot_guest_name']));

        // 3. Giriş Tarihi ve Saati Hesapla
        if ($request->has('check_in')) {
            $rawIn = $request->input('check_in');
            // Eğer "2026-03-27 12:30" gibi tam format geldiyse onu kullan, 
            // sadece tarih geldiyse eski saati (08:30 vb.) üzerine ekle.
            $booking->check_in = str_contains($rawIn, ':') 
                ? \Carbon\Carbon::parse($rawIn)->toDateTimeString()
                : \Carbon\Carbon::parse($rawIn)->setTime($currentIn->hour, $currentIn->minute)->toDateTimeString();
        }

        // 4. Çıkış Tarihi ve Saati Hesapla (Kritik Alan)
        if ($request->has('check_out')) {
            $rawOut = $request->input('check_out');
            $booking->check_out = str_contains($rawOut, ':') 
                ? \Carbon\Carbon::parse($rawOut)->toDateTimeString()
                : \Carbon\Carbon::parse($rawOut)->setTime($currentOut->hour, $currentOut->minute)->toDateTimeString();
        }

        // 5. Müsaitlik Kontrolü (15 Dakikalık Boşluk ve ID Dışlama Dahil)
        $targetRoomId = $request->input('room_id', $booking->room_id);
        $room = Room::findOrFail($targetRoomId);

        if (!$this->isAvailable($targetRoomId, $booking->check_in, $booking->check_out, $room->capacity, $id)) {
            \Log::warning("!!! HATA: Oda Dolu !!!", ['booking_id' => $id]);
            return response()->json(['success' => false, 'message' => "Bu tarihlerde oda dolu!"], 422);
        }

        // 6. Dirty Kontrolü ve Kayıt
        // snapshot_guest_name gibi otomatik alanları burada set et ki isDirty() onları da görsün
        if ($request->has('full_name')) {
            $booking->snapshot_guest_name = strtoupper($request->input('full_name'));
        }

        \Log::info("Adım 5: Değişen Alanlar (Dirty Check)", $booking->getDirty());

        if ($booking->isDirty()) {
            $booking->save();
            
            \Log::info("✅ Adım 6: Veritabanına Yazıldı.");

            // Yan işlemleri yap (Sadece kayıt varsa)
            $booking = $booking->fresh(['room', 'guest']);
            $this->logAction($booking, 'updated', $oldData);
            $this->syncGuest($booking);

            return response()->json([
                'success' => true, 
                'data' => new BookingResource($booking),
                'message' => 'Kayıt başarıyla güncellendi.'
            ]);
        }

        // Değişiklik yoksa
        \Log::info("Bilgi: Hiçbir değişiklik algılanmadı.");
        return response()->json([
            'success' => true, 
            'data' => new BookingResource($booking),
            'message' => 'Herhangi bir değişiklik yapılmadı.'
        ]);

    } catch (\Exception $e) {
        \Log::error("🔴 KRİTİK HATA: " . $e->getMessage());
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}
    /**
     * Müsaitlik Sorgusu
     */
private function isAvailable($roomId, $start, $end, $capacity, $excludeId = null)
{
    $checkIn = \Carbon\Carbon::parse($start);
    $checkOut = \Carbon\Carbon::parse($end);

    \Log::info("=== [MÜSAİTLİK ANALİZİ] ===");
    \Log::info("SORGULANAN: $start - $end | Kapasite: $capacity");

    // 1. Çakışan tüm kayıtları çek (Kendimiz hariç)
    $conflicts = \App\Models\Booking::where('room_id', $roomId)
        ->whereIn('status', ['confirmed', 'checked_in'])
        ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
        ->where(function ($query) use ($checkIn, $checkOut) {
            // Tam saniye sınırlarında çakışma olmasın diye 1 saniye tolerans
            $query->where('check_in', '<', $checkOut->copy()->subSecond())
                  ->where('check_out', '>', $checkIn->copy()->addSecond());
        })
        ->get();

    if ($conflicts->isEmpty()) {
        \Log::info("✅ ENGEL YOK: Oda tamamen müsait.");
        return true;
    }

    // 2. KESİN ÇÖZÜM: Saatlik Çakışma Analizi
    // Bizim kalacağımız her bir günü döngüye alıyoruz
    $currentDay = $checkIn->copy()->startOfDay();
    $endDay = $checkOut->copy()->endOfDay();

    while ($currentDay->lte($endDay)) {
        
        // O güne ait kritik saat dilimleri (Girişler/Çıkışlar genelde öğlendir)
        // 12:00, 14:00 gibi kritik zamanları kontrol etmek için günün ortasını baz alıyoruz
        $midDay = $currentDay->copy()->setTime(13, 0, 0); // Saat 13:00 (Çıkışlar yapılmış, girişler başlamış olur)

        $peopleAtThisMoment = 0;

        foreach ($conflicts as $c) {
            $cIn = \Carbon\Carbon::parse($c->check_in);
            $cOut = \Carbon\Carbon::parse($c->check_out);

            // Eğer çakışan rezervasyon günün bu kritik saatini kapsıyorsa sayacı 1 artır
            if ($midDay->between($cIn, $cOut)) {
                $peopleAtThisMoment++;
            }
        }

        // Mevcutlar + Biz (1) > Kapasite ise oda doludur!
        if (($peopleAtThisMoment + 1) > $capacity) {
            \Log::warning("⚠️ ÇAKIŞMA: {$currentDay->toDateString()} tarihinde odada kapasite yetersiz!");
            \Log::info("=== [ANALİZ BİTTİ] ===");
            return false;
        }

        $currentDay->addDay();
    }

    \Log::info("✅ FİNAL: Kapasite yeterli. EVET ✅");
    \Log::info("=== [ANALİZ BİTTİ] ===");
    return true;
}
public function move(Request $request, $id)
{
    try {
        \Log::info("--- [MOVE İŞLEMİ BAŞLADI] ID: {$id} ---");

        $booking = Booking::findOrFail($id);
        $oldData = $booking->toArray();

        // 1. Orijinal Carbon objelerini oluştur
        $oldIn = \Carbon\Carbon::parse($booking->check_in);
        $oldOut = \Carbon\Carbon::parse($booking->check_out);

        // 2. Yeni Günü Belirle (Saatleri DB'den koru)
        if ($request->has('check_in')) {
            $targetDate = \Carbon\Carbon::parse($request->input('check_in'));
            
            // Kaç gün kaydırdığımızı bulalım (Örn: 2 gün ileri)
            // startOfDay kullanıyoruz ki saat farkı gün sayısını şaşırtmasın
            $dayDiff = $oldIn->copy()->startOfDay()->diffInDays($targetDate->copy()->startOfDay(), false);

            // Yeni Check-in: Eski giriş saatini (12:30:00) kuruşu kuruşuna koru
            $newIn = $oldIn->copy()->addDays($dayDiff);
            $booking->check_in = $newIn->toDateTimeString();

            // ✨ KRİTİK DÜZELTME: 
            // Dakika eklemek (diffInMinutes) yerine "Gün Farkı" ekliyoruz.
            // Böylece DB'de 12:15 olan çıkış saati, yeni günde de TAM 12:15 kalır.
            $newOut = $oldOut->copy()->addDays($dayDiff);
            $booking->check_out = $newOut->toDateTimeString();

            \Log::info("Move Analizi: {$dayDiff} gün kaydırıldı. Yeni: {$booking->check_in} - {$booking->check_out}");
        }

        if ($request->has('room_id')) {
            $booking->room_id = $request->input('room_id');
        }

        // 3. Müsaitlik Kontrolü (Exclude ID ile kendini dışla)
        $room = Room::findOrFail($booking->room_id);
        
        if (!$this->isAvailable($booking->room_id, $booking->check_in, $booking->check_out, $room->capacity, $id)) {
            \Log::warning("Move Hatası: Oda Dolu!", ['id' => $id]);
            return response()->json(['success' => false, 'message' => 'Bu tarihlerde oda dolu!'], 422);
        }

        // 4. Kaydet ve Fresh veriyi döndür
        $booking->save();
        
        // Yan işlemler
        if (method_exists($this, 'logAction')) $this->logAction($booking, 'moved', $oldData);
        if (method_exists($this, 'syncGuest')) $this->syncGuest($booking);

        return response()->json([
            'success' => true, 
            'data' => $booking->fresh(['room', 'guest']),
            'message' => 'Rezervasyon başarıyla taşındı.'
        ]);

    } catch (\Exception $e) {
        \Log::error("🔴 Move Hatası: " . $e->getMessage());
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