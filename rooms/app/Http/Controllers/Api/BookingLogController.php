<?php

namespace App\Http\Controllers\Api;

use App\Models\BookingLog;
use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class BookingLogController extends Controller
{
    public function index(Request $request)
    {
        $limit = min((int) $request->get('limit', 20), 100);

        $roomMap = Room::pluck('name', 'id')->toArray();

        $logs = BookingLog::with(['user', 'booking.room'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($log) use ($roomMap) {
                return [
                    'id'         => $log->id,
                    'action'     => $log->action,
                    'booking_id' => $log->booking_id,
                    'room'       => $log->booking?->room?->name ?? ($roomMap[$log->old_data['room_id'] ?? null] ?? '—'),
                    'user'       => $log->user?->name ?? '—',
                    'old_data'   => $log->old_data,
                    'new_data'   => $log->new_data,
                    'diff'       => $this->getDiff($log->old_data, $log->new_data, $roomMap),
                    'created_at' => $log->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return response()->json(['data' => $logs]);
    }

    private function getDiff(?array $old, ?array $new, array $roomMap = []): array
    {
        if (!$old && $new) {
            return [
                ['field' => 'start_time', 'old' => null, 'new' => $new['start_time'] ?? null],
                ['field' => 'end_time',   'old' => null, 'new' => $new['end_time'] ?? null],
            ];
        }

        if ($old && !$new) {
            return [
                ['field' => 'start_time', 'old' => $old['start_time'] ?? null, 'new' => null],
                ['field' => 'end_time',   'old' => $old['end_time'] ?? null,   'new' => null],
            ];
        }

        if (!$old || !$new) return [];

        $watchFields = ['title', 'room_id', 'start_time', 'end_time'];
        $diff = [];

        foreach ($watchFields as $field) {
            $oldVal = $old[$field] ?? null;
            $newVal = $new[$field] ?? null;

            if ($oldVal !== $newVal) {
                if ($field === 'room_id') {
                    $diff[] = [
                        'field' => 'room_id',
                        'old'   => $roomMap[$oldVal] ?? $oldVal,
                        'new'   => $roomMap[$newVal] ?? $newVal,
                    ];
                } else {
                    $diff[] = ['field' => $field, 'old' => $oldVal, 'new' => $newVal];
                }
            }
        }

        return $diff;
    }
}