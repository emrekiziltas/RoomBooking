<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LookupValue;
use Illuminate\Http\Request;

class LookupController extends Controller
{
    // Settings.tsx'in GET isteği attığı metod (Az önce eksik olan buydu)
public function index() 
{
    return response()->json([
        'success' => true,
        // Eager Loading: LookupValue ile birlikte ona bağlı Type verisini de getir
        'data' => \App\Models\LookupValue::with('type')->get()
    ]);
}
    public function getNavigation()
    {
        $navigation = LookupValue::whereHas('type', function ($query) {
            $query->where('key', 'nav_menu');
        })->where('is_active', true)->orderBy('sort_order')->get();

        return response()->json($navigation);
    }

    public function getFloors()
    {
        $floors = LookupValue::whereHas('type', function ($query) {
            $query->where('key', 'floor');
        })->where('is_active', true)->orderBy('sort_order')->get();

        return response()->json($floors);
    }
public function update(Request $request, $id)
{
    try {
        // 1. Kaydı bul (Eğer ID yanlışsa direkt 404 döner)
        $setting = \App\Models\LookupValue::findOrFail($id);

        // 2. Gelen verileri tek tek ata (Zırhlı Yöntem)
        if ($request->has('label')) {
            $setting->label = $request->input('label');
        }
        
        if ($request->has('key')) {
            $setting->key = $request->input('key');
        }
        if ($request->has('bg_color_class')) {
            $rawColor = $request->input('bg_color_class');
            
            // Eğer veri "bg-blue-100 text-blue-700" şeklinde gelirse 
            // sadece "bg-blue-100" kısmını alır.
            $cleanColor = explode(' ', trim($rawColor))[0];
            
            $setting->bg_color_class = $cleanColor;
        }
        
        if ($request->has('metadata')) {
            // Metadata sütunu modelde 'array' veya 'json' olarak cast edilmiş olmalı
            $setting->metadata = $request->input('metadata');
        }

        // 3. Veritabanına kaydet
        $setting->save();

        // 4. Başarılı yanıt dön
        return response()->json([
            'success' => true,
            'message' => 'Ayarlar başarıyla güncellendi.',
            'data'    => $setting->fresh() // Güncel haliyle geri gönder
        ]);

    } catch (\Exception $e) {
        // HATA VARSA: 500 hatasının nedenini JSON olarak döndür ki React konsolunda görelim
        return response()->json([
            'success' => false,
            'error'   => $e->getMessage(),
            'trace'   => $e->getTraceAsString()
        ], 500);
    }
}
    public function getByType($typeId)
    {
        $values = LookupValue::where('type_id', $typeId)
                    ->select('id', 'key', 'label', 'type_id', 'metadata')
                    ->get();
        return response()->json($values);
    }

    public function updateSetting(Request $request, $id)
    {
        $setting = LookupValue::findOrFail($id);

        $updated = $setting->update([
            'label'    => $request->input('label'),
            'key'      => $request->input('key'),
            'metadata' => $request->input('metadata'),
        ]);

        return response()->json([
            'success' => $updated,
            'data'    => $setting->fresh()
        ]);
    }
}