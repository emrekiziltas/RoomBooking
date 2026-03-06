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
}