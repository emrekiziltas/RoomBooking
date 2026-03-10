<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminCheck
{
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Kullanıcı giriş yapmış mı?
        // 2. Veritabanındaki 'role' sütunu 'admin' mi?
        if (auth()->check() && auth()->user()->role === 'admin') {
            return $next($request);
        }

        // Eğer admin değilse süreci durdur ve 403 (Forbidden) dön
        return response()->json([
            'message' => 'Bu işlem için yönetici yetkisi gereklidir.',
            'error' => 'unauthorized_admin'
        ], 403);
    }
}