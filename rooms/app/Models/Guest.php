<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Guest extends Model
{
    use HasFactory;

    // ÖNEMLİ: Veritabanına yazılacak alanları buraya eklemelisin
    protected $fillable = [
        'full_name', // Controller'da bunu güncelliyoruz
        'email',
        'phone',
        'role_id',   // Controller'da bunu güncelliyoruz
        'is_vip'     // Controller'da bunu güncelliyoruz
    ];

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }
   
public function role()
{
    // Doğru olan bu: LookupValue modeline role_id ile bağlanıyoruz.
    return $this->belongsTo(\App\Models\LookupValue::class, 'role_id');
}
}