<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\LookupValue;

class Room extends Model
{
    use HasFactory;

    // Veritabanındaki kolonlarla birebir uyumlu olmalı
    protected $fillable = [
        'name',
        'capacity',    // <-- Bunu unutma, tabloda zorunlu bir kolondu!
        'floor_id',
        'room_type_id'
    ];

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    // Odanın Katı (Bir oda bir kata aittir)
    public function floor() 
    {
        return $this->belongsTo(LookupValue::class, 'floor_id');
    }

    // Odanın Tipi (Standart, Suit vs.)
    public function roomType() 
    {
        return $this->belongsTo(LookupValue::class, 'room_type_id');
    }

    // Odanın Özellikleri (Çoka Çok İlişki)
    public function features()
    {
        return $this->belongsToMany(
            LookupValue::class, 
            'room_features',   // Ara tablomuz
            'room_id',         // Bu modelin ara tablodaki karşılığı
            'lookup_value_id'  // Karşı modelin ara tablodaki karşılığı
        );
    }
}