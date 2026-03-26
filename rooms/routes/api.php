<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\LookupController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\BookingLogController;
use App\Http\Controllers\Api\AssignController;
use App\Http\Controllers\Api\GuestController;


// --- 🔓 Herkese Açık ---
Route::post('auth/register', [AuthController::class, 'register']);
Route::post('auth/login', [AuthController::class, 'login']);
Route::post('/auth/google', [AuthController::class, 'googleLogin']);
    Route::get('rooms/available-ranges', [RoomController::class, 'availableRanges']); 

 //    Route::get('assigns', [AssignController::class, 'index']);
     
// --- 🔒 Giriş Yapmış Kullanıcılar ---
    Route::middleware('auth:sanctum')->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('/guests/search', [GuestController::class, 'search']);
    Route::get('/guests/search', [GuestController::class, 'search']);
    Route::apiResource('bookings', BookingController::class)->except(['show']);
    Route::get('floors', [LookupController::class, 'getFloors']);
    Route::get('navigation', [LookupController::class, 'getNavigation']);
    Route::get('lookup-values/type/{typeId}', [LookupController::class, 'getByType']);

    
    // --- 🏨 Oda İşlemleri (Görüntüleme) ---
    Route::get('rooms/available', [RoomController::class, 'available']);

    Route::get('rooms/{id}/bookings', [RoomController::class, 'bookings']);
    
    // Sadece listeleme ve tekil görüntüleme her kullanıcıya açık
    Route::apiResource('rooms', RoomController::class)->only(['index', 'show']);

    // --- 📅 Rezervasyon İşlemleri ---
    Route::get('booking-logs', [BookingLogController::class, 'index']);
    Route::get('bookings/recent', [BookingController::class, 'recent']);
    Route::patch('bookings/{id}/move', [BookingController::class, 'move']);
    Route::patch('bookings/{id}/resize', [BookingController::class, 'resize']);
    Route::apiResource('bookings', BookingController::class);

    // --- 🛡️ Admin Özel İşlemler ---
    Route::middleware(\App\Http\Middleware\AdminCheck::class)->group(function () {
        
        // Settings Yönetimi
    Route::get('settings', [LookupController::class, 'index']);
    Route::get('assigns', [AssignController::class, 'index']);
    Route::put('settings/{id}', [LookupController::class, 'update']);

        // ODA GÜNCELLEME (İşte eksik olan ve 405 veren rota burasıydı)
    Route::put('rooms/{id}', [RoomController::class, 'update']);
    Route::patch('rooms/{id}', [RoomController::class, 'update']);
    });
});