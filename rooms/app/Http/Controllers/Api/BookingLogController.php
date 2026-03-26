<?php

namespace App\Http\Controllers\Api;

use App\Models\BookingLog;
use App\Models\Room;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class BookingLogController extends Controller
{
    public function index(Request $request)
    {
        $limit = min((int) $request->get('limit', 20), 100);

        // Oda isimlerini ID'ye göre eşleştirmek için (Performans için bir kez çekiyoruz)
        $roomMap = Room::pluck('name', 'id')->toArray();

        $logs = BookingLog::with(['user', 'booking.room'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($log) use ($roomMap) {
                return [
                    'id'         => $log->id,
                    'action'     => $log->action, // created, updated, deleted, moved
                    'booking_id' => $log->booking_id,
                    'room'       => $log->booking?->room?->name ?? ($roomMap[$log->old_data['room_id'] ?? null] ?? '—'),
                    'user'       => $log->user?->name ?? 'System',
                    'old_data'   => $log->old_data,
                    'new_data'   => $log->new_data,
                    // Farkları hesaplayan fonksiyon
                    'diff'       => $this->getDiff($log->old_data, $log->new_data, $roomMap),
                    'created_at' => $log->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return response()->json(['data' => $logs]);
    }

    private function getDiff(?array $old, ?array $new, array $roomMap = []): array
    {
        // 1. Yeni Kayıt (Old data yoksa)
        if (!$old && $new) {
            return [
                ['field' => 'guest', 'old' => null, 'new' => $new['snapshot_guest_name'] ?? '—'],
                ['field' => 'check_in', 'old' => null, 'new' => $new['check_in'] ?? null],
                ['field' => 'status', 'old' => null, 'new' => $new['status'] ?? null],
            ];
        }

        // 2. Silinme (New data yoksa)
        if ($old && !$new) {
            return [
                ['field' => 'guest', 'old' => $old['snapshot_guest_name'] ?? '—', 'new' => 'DELETED'],
            ];
        }

        if (!$old || !$new) return [];

        // 3. Güncelleme - Takip edilecek alanlar (YENİ YAPIYA GÖRE GÜNCELLENDİ)
        $watchFields = [
            'snapshot_guest_name' => 'Guest Name',
            'room_id'             => 'Room',
            'check_in'            => 'Check In',
            'check_out'           => 'Check Out',
            'status'              => 'Status',
            'snapshot_is_vip'     => 'VIP Status'
        ];

        $diff = [];

        foreach ($watchFields as $field => $label) {
            $oldVal = $old[$field] ?? null;
            $newVal = $new[$field] ?? null;

            // Değerler farklıysa diff'e ekle
            if ($oldVal !== $newVal) {
                // Özel durumlar (Oda ID'sini isme çevir, VIP'yi Evet/Hayır yap vb.)
                $formattedOld = $oldVal;
                $formattedNew = $newVal;

                if ($field === 'room_id') {
                    $formattedOld = $roomMap[$oldVal] ?? "Room #$oldVal";
                    $formattedNew = $roomMap[$newVal] ?? "Room #$newVal";
                } elseif ($field === 'snapshot_is_vip') {
                    $formattedOld = $oldVal ? 'VIP' : 'Normal';
                    $formattedNew = $newVal ? 'VIP' : 'Normal';
                }

                $diff[] = [
                    'field' => $label,
                    'old'   => $formattedOld,
                    'new'   => $formattedNew,
                ];
            }
        }

        return $diff;
    }
}