<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Guest;
use Exception;

class GuestController extends Controller
{
    public function search(Request $request) 
    {
        try {
            $q = $request->query('q');
        
        // 'with("role")' diyerek yukarıda tanımladığımız ilişkiyi çağırıyoruz
        $guests = Guest::with('role') 
                    ->where('full_name', 'LIKE', "%{$q}%")
                    ->limit(5)
                    ->get();
                    
        return response()->json($guests);
            
        } catch (Exception $e) {
            // Hata neyse direkt JSON olarak görelim
            return response()->json([
                'message' => 'Bir hata oluştu!',
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }
}