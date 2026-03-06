<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LookupType extends Model
{
    protected $fillable = [
        'key',
        'label',
        'icon',
        'can_have_children',
        'is_system',
        'is_active',
    ];

    protected $casts = [
        'can_have_children' => 'boolean',
        'is_system' => 'boolean',
        'is_active' => 'boolean',
    ];

    // İlişkiler
    public function values(): HasMany
    {
        return $this->hasMany(LookupValue::class, 'type_id');
    }

    public function activeValues(): HasMany
    {
        return $this->values()->where('is_active', true)->orderBy('sort_order');
    }

    // Scope'lar
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByKey($query, string $key)
    {
        return $query->where('key', $key);
    }
}
