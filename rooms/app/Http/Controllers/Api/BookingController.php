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
        // 1. Validasyon: Buradaki alanlar frontend'den gelen ham verilerdir.
        $validated = $request->validate([
            'room_id'                => 'required|exists:rooms,id',
            'check_in'               => 'required',
            'check_out'              => 'required',
            'guest_id'               => 'nullable|exists:guests,id',
            // Aşağıdakileri 'nullable' yaparak 422 hatasının önüne geçiyoruz
            'snapshot_guest_name'    => 'nullable|string',
            'snapshot_guest_email'   => 'nullable|string',
            'snapshot_guest_role_id' => 'nullable', 
        ]);

        $room = Room::findOrFail($validated['room_id']);

        // 2. Veri Hazırlama (Update mantığı ile tam eşlenik)
        
        // İSİM: Eğer direkt gelmediyse guest_data objesinin içine bak
        $guestName = $request->input('snapshot_guest_name') 
                     ?? $request->input('guest_data.full_name')
                     ?? 'GUEST'; // Hiçbiri yoksa varsayılan

        // EMAIL: Boş kalmaması için kesin bir değer atıyoruz (1364 hatasını önler)
        $guestEmail = $request->input('snapshot_guest_email') 
                      ?? $request->input('guest_data.email') 
                      ?? 'guest@hotel.com'; 

        // ROL:
        $guestRole = $request->input('snapshot_guest_role_id') 
                     ?? $request->input('guest_data.role_id') 
                     ?? 33;

        // VIP:
        $isVip = $request->has('snapshot_is_vip') 
                 ? $request->boolean('snapshot_is_vip') 
                 : $request->boolean('guest_data.is_vip');

        // 3. Çakışma Kontrolü
        if (!$this->isAvailable($validated['room_id'], $validated['check_in'], $validated['check_out'], $room->capacity)) {
            return response()->json(['success' => false, 'message' => "Oda kapasitesi dolu!"], 422);
        }

        // 4. Kayıt İşlemi
        $booking = DB::transaction(function () use ($validated, $guestName, $guestEmail, $guestRole, $isVip) {
            
            return Booking::create([
                'room_id'                => $validated['room_id'],
                'guest_id'               => $validated['guest_id'] ?? null,
                'check_in'               => $validated['check_in'],
                'check_out'              => $validated['check_out'],
                'snapshot_guest_name'    => $guestName,
                'snapshot_guest_email'   => $guestEmail,
                'snapshot_guest_role_id' => $guestRole,
                'snapshot_is_vip'        => $isVip,
                // Eğer veritabanında status_id/type_id VARSA buraya ekle, YOKSA ekleme.
            ]);
        });

        // 5. Log Kaydı
        try {
            BookingLog::create([
                'booking_id' => $booking->id,
                'user_id'    => auth()->id(),
                'action'     => 'created',
                'new_data'   => $booking->toArray(),
            ]);
        } catch (\Exception $logEx) {
            Log::warning("Log kaydı yapılamadı: " . $logEx->getMessage());
        }

        return response()->json([
            'success' => true, 
            'data' => new BookingResource($booking->load(['room', 'guest']))
        ], 201);

    } catch (\Illuminate\Validation\ValidationException $e) {
        // 422 Hatalarını logda detaylı görelim
        Log::error("Validasyon Hatası: ", $e->errors());
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
        $oldData = $booking->toArray();

        // 1. Validasyon (Title'ı sildik, snapshot_guest_role_id'yi isteğe bağlı yaptık)
        $validated = $request->validate([
            'room_id'                => 'sometimes|exists:rooms,id',
            'check_in'               => 'sometimes',
            'check_out'              => 'sometimes',
            'snapshot_guest_role_id' => 'sometimes', // Kuralı esnettik
        ]);

        // 2. Manuel Atamalar (Validasyon dışındaki nested verileri çekiyoruz)
        
        // İSİM: guest_data.full_name -> snapshot_guest_name
        if ($request->has('guest_data.full_name')) {
            $booking->snapshot_guest_name = $request->input('guest_data.full_name');
        }

        // ROL: snapshot_guest_role_id VEYA guest_data.role_id -> snapshot_guest_role_id
        $newRoleId = $request->input('snapshot_guest_role_id') ?? $request->input('guest_data.role_id');
        if ($newRoleId) {
            $booking->snapshot_guest_role_id = $newRoleId;
         //   Log::info("--- [LOG] ROL GÜNCELLENDİ: " . $newRoleId);
        }

        // VIP: guest_data.is_vip -> snapshot_is_vip
        if ($request->has('guest_data.is_vip')) {
            $booking->snapshot_is_vip = (bool) $request->input('guest_data.is_vip');
        }

        // 3. Geri Kalan Standart Alanlar (room_id, check_in vb.)
        $booking->fill($validated);
        
        // 4. KAYDET
        $saveResult = $booking->save();
        
        //Log::info("--- [6] BOOKING SAVE SONUCU: " . ($saveResult ? 'BAŞARILI' : 'BAŞARISIZ'));

        // 5. Guest Tablosu Güncelleme (Zorunlu güncelleme)
        if ($booking->guest_id) {
            Guest::where('id', $booking->guest_id)->update([
                'full_name' => $booking->snapshot_guest_name,
                'role_id'   => $booking->snapshot_guest_role_id,
                'is_vip'    => $booking->snapshot_is_vip,
            ]);
           // Log::info("--- [9] GUEST TABLOSU SENKRONİZE EDİLDİ ---");
        }

        // Log Kaydı vb. işlemler...
        // ...

        return response()->json([
            'success' => true, 
            'data' => new BookingResource($booking->fresh(['room', 'guest']))
        ]);

    } catch (\Exception $e) {
        Log::error("--- [!] HATA ---: " . $e->getMessage());
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