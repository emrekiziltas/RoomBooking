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
     * 
     */
    public function index(Request $request)
    {
        $sortColumn = in_array($request->sort, ['updated_at', 'created_at', 'check_in', 'check_out']) 
            ? $request->sort : 'check_in';
        $sortOrder = in_array($request->order, ['asc', 'desc']) ? $request->order : 'asc';

        $query = Booking::with(['room', 'type', 'status'])
            ->when($request->room_id, fn($q) => $q->where('room_id', $request->room_id))
            ->orderBy($sortColumn, $sortOrder);

        if ($request->has('limit') && is_numeric($request->limit)) {
            $query->limit((int) $request->limit);
        }

        $guestRoles = DB::table('lookup_values')->where('type_id', 6)->orderBy('sort_order')->get();

        return BookingResource::collection($query->get())->additional([
            'meta' => ['guest_roles' => $guestRoles]
        ]);
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
                    'check_in'               => Carbon::parse($validated['check_in'])->toDateString(),
                    'check_out'              => Carbon::parse($validated['check_out'])->toDateString(),
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

        // Mevcut değerleri fallback (varsayılan) olarak alıyoruz
        $targetRoomId   = $request->input('room_id', $booking->room_id);
        $targetCheckIn  = $request->input('check_in', $booking->check_in);
        $targetCheckOut = $request->input('check_out', $booking->check_out);
        
        $room = Room::findOrFail($targetRoomId);

        // ÇAKIŞMA KONTROLÜ (Kendisi hariç)
        $start = Carbon::parse($targetCheckIn);
        $end = Carbon::parse($targetCheckOut);

        $conflict = Booking::where('room_id', $targetRoomId)
            ->where('id', '!=', $id) // Kendisini hariç tutar
            ->where(function ($query) use ($start, $end) {
                $query->where('check_in', '<', $end->toDateString())
                      ->where('check_out', '>', $start->toDateString());
            })
            ->first();

        if ($conflict) {
            $guestName = $conflict->snapshot_guest_name ?? 'Another Guest';
            $cStart = Carbon::parse($conflict->check_in)->format('d M');
            $cEnd = Carbon::parse($conflict->check_out)->format('d M');
            
            return response()->json([
                'success' => false,
                'message' => "CONFLICT: Room {$room->name} is occupied by {$guestName} ({$cStart} - {$cEnd})"
            ], 422);
        }

        // Verileri doldur ve formatla
        $booking->fill($validated);
        
        if ($request->has('check_in')) $booking->check_in = Carbon::parse($validated['check_in'])->toDateString();
        if ($request->has('check_out')) $booking->check_out = Carbon::parse($validated['check_out'])->toDateString();
        
        // VIP ve Rol Dönüşümleri
        if ($request->has('snapshot_guest_role_id')) $booking->snapshot_guest_role_id = (int)$request->input('snapshot_guest_role_id');
        if ($request->has('snapshot_is_vip')) $booking->snapshot_is_vip = $request->boolean('snapshot_is_vip');
        if ($request->has('snapshot_guest_name')) $booking->snapshot_guest_name = mb_convert_case($request->input('snapshot_guest_name'), MB_CASE_TITLE, "UTF-8");

        if ($booking->isDirty()) {
            $booking->save();
            $this->logAction($booking->fresh(), 'updated', $oldData);
            $this->syncGuest($booking->fresh());
        }

        return response()->json(['success' => true, 'data' => new BookingResource($booking->fresh(['room', 'guest']))]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

    /**
     * Müsaitlik Sorgusu (Özel Metod)
     */
private function isAvailable($roomId, $start, $end, $capacity, $excludeId = null)
{
    // Tarihleri Carbon nesnesine çevirip sadece tarih kısmını alıyoruz
    $checkIn  = Carbon::parse($start)->startOfDay();
    $checkOut = Carbon::parse($end)->startOfDay();

    $occupancy = Booking::where('room_id', $roomId)
        ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
        ->where(function ($query) use ($checkIn, $checkOut) {
            // Çakışma Mantığı: Başlangıç bitişten önce, bitiş başlangıçtan sonra
            $query->where('check_in', '<', $checkOut)
                  ->where('check_out', '>', $checkIn);
        })
        ->count();

    // Mevcut doluluk kapasiteden azsa TRUE döner (yani yer vardır)
    return $occupancy < $capacity;
}

    /**
     * Misafir Tablosuyla Senkronize Et
     */
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

    /**
     * İşlem Loglarını Kaydet
     */
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
        } catch (\Exception $e) { Log::warning("Log Error: " . $e->getMessage()); }
    }

    public function destroy($id)
    {
        $booking = Booking::findOrFail($id);
        $this->logAction($booking, 'deleted', $booking->toArray());
        $booking->delete();
        return response()->json(['success' => true]);
    }

    // Move metodu için ayrı bir işlem yapmaya gerek yok, update metodu move işlemini de kapsıyor.
    public function move(Request $request, $id) { return $this->update($request, $id); }
}