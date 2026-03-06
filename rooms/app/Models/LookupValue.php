<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LookupValue extends Model
{
    protected $fillable = [
        'type_id',
        'parent_id',
        'key',
        'label',
        'icon',
        'bg_color_class',
        'border_color_class',
        'active_bg_class',
        'metadata',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'metadata' => 'array',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function type(): BelongsTo
    {
        return $this->belongsTo(LookupType::class, 'type_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(LookupValue::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(LookupValue::class, 'parent_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByType($query, $typeKey)
    {
        return $query->whereHas('type', function ($q) use ($typeKey) {
            $q->where('key', $typeKey);
        });
    }

    public function scopeRoots($query)
    {
        return $query->whereNull('parent_id');
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order');
    }
}
