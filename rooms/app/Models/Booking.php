<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;


class Booking extends Model
{
    use HasFactory;
    
    protected $fillable = ['room_id', 'user_id', 'title', 'start_time', 'end_time', 'color'];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
    ];

    // İyileştirme: Sadece belirli bir tarih aralığındaki rezervasyonları getiren scope
    public function scopeInTimeRange($query, $start, $end)
    {
        return $query->where('start_time', '>=', $start)
                     ->where('end_time', '<=', $end);
    }

    public function room(): BelongsTo { return $this->belongsTo(Room::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }

    public function bookings()
{
    // bookings tablosundaki room_id kolonu ile eşleşir
   // return $this->hasMany(\App\Models\Booking::class, 'room_id'); 
}
}