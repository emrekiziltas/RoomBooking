<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class Booking extends Model
{
    use HasFactory;

// app/Models/Booking.php

protected $fillable = [
    'room_id',
    'user_id',
    'guest_id',
    'check_in',
    'check_out',
    'status',
    'type_id',
    // YENİ ALANLAR BURAYA:
    'snapshot_guest_name',
    'snapshot_guest_role_id',
    'snapshot_is_vip',
    'snapshot_guest_email',
    'snapshot_guest_company',
];

    protected $casts = [
        'check_in' => 'datetime',
        'check_out' => 'datetime',
        'snapshot_is_vip' => 'boolean',
    ];

    // --- RELATIONSHIPS ---

    /**
     * Get the room associated with the booking.
     */
    public function room(): BelongsTo 
    { 
        return $this->belongsTo(Room::class); 
    }

    /**
     * Get the user (staff) who created the booking.
     */
    public function user(): BelongsTo 
    { 
        return $this->belongsTo(User::class); 
    }
public function guest()
{
    // foreign_key'in 'guest_id' olduğundan emin ol
    return $this->belongsTo(Guest::class, 'guest_id');
}
    /**
     * Get the booking type (e.g., Reservation, Maintenance, Blocked) 
     * from lookup_values table.
     */
    public function type(): BelongsTo 
    { 
        return $this->belongsTo(LookupValue::class, 'type_id'); 
    }

    /**
     * Get the current status (e.g., Confirmed, Pending, Checked-in)
     * from lookup_values table.
     */
    public function status(): BelongsTo 
    { 
        return $this->belongsTo(LookupValue::class, 'status_id'); 
    }

    // --- SCOPES (QUERY BUILDER HELPERS) ---

    /**
     * Filter bookings within a specific date range.
     */
    public function scopeInTimeRange($query, $start, $end)
    {
        return $query->where('check_in', '>=', $start)
                     ->where('check_out', '<=', $end);
    }

    /**
     * Filter bookings arriving exactly today.
     */
    public function scopeArrivingToday($query)
    {
        return $query->whereDate('check_in', Carbon::today());
    }
    
}