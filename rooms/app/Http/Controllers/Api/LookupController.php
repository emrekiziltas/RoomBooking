<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LookupType;
use App\Models\LookupValue;
use Illuminate\Http\Request;

class LookupController extends Controller
{
    /**
     * Navbar menülerini döner.
     */
    public function getNavigation()
    {
        // 'nav_menu' tipindeki aktif değerleri çekiyoruz
        $navigation = LookupValue::whereHas('type', function ($query) {
            $query->where('key', 'nav_menu');
        })
        ->where('is_active', true)
        ->orderBy('sort_order')
        ->get();

        return response()->json($navigation);
    }

    /**
     * Kat bilgilerini (Floors) döner.
     */
    public function getFloors()
    {
        $floors = LookupValue::whereHas('type', function ($query) {
            $query->where('key', 'floor');
        })
        ->where('is_active', true)
        ->orderBy('sort_order')
        ->get();

        return response()->json($floors);
    }
public function getSystemSettings()
{
    $type = \App\Models\LookupType::where('key', 'system_settings')->first();
    
    if (!$type) return response()->json(['success' => false], 404);

    // Bu tipe ait ne kadar ayar varsa (Kapasite, Logo, Saat vb.) hepsini getir
    $settings = \App\Models\LookupValue::where('type_id', $type->id)
                ->where('is_active', 1)
                ->get(['key', 'metadata', 'label']);

    return response()->json([
        'success' => true,
        'data' => $settings
    ]);
}
    public function getByType($typeId)
{
    // type_id'si gönderilen değere (bizim durumumuzda 3) eşit olanları getir
    $values = \App\Models\LookupValue::where('type_id', $typeId)
                ->select('id', 'key', 'label', 'type_id')
                ->get();

    return response()->json($values);
}
}