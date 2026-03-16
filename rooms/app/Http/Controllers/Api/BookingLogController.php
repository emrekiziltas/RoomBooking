<?php

namespace App\Http\Controllers\Api;

use App\Models\BookingLog;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class BookingLogController extends Controller
{
    public function index(Request $request)
    {
        $limit = min((int) $request->get('limit', 20), 100);

        $logs = BookingLog::with(['user', 'booking.room'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($log) {
                return [
                    'id'         => $log->id,
                    'action'     => $log->action,
                    'booking_id' => $log->booking_id,
                    'room'       => $log->booking?->room?->name ?? $log->old_data['room_id'] ?? '—',
                    'user'       => $log->user?->name ?? '—',
                    'old_data'   => $log->old_data,
                    'new_data'   => $log->new_data,
                    'diff'       => $this->getDiff($log->old_data, $log->new_data),
                    'created_at' => $log->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return response()->json(['data' => $logs]);
    }

    private function getDiff(?array $old, ?array $new): array
    {
        if (!$old || !$new) return [];

        $watchFields = ['title', 'room_id', 'start_time', 'end_time'];
        $diff = [];

        foreach ($watchFields as $field) {
            $oldVal = $old[$field] ?? null;
            $newVal = $new[$field] ?? null;

            if ($oldVal !== $newVal) {
                $diff[] = [
                    'field' => $field,
                    'old'   => $oldVal,
                    'new'   => $newVal,
                ];
            }
        }

        return $diff;
    }
}