<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\LookupController; // Yeni ekledik
use Illuminate\Support\Facades\Route;

// --- 🔓 Herkese Açık Route'lar ---
Route::post('auth/register', [AuthController::class, 'register']);
Route::post('auth/login', [AuthController::class, 'login']);
    Route::get('navigation', [LookupController::class, 'getNavigation']);

// --- 🔒 Giriş Yapmış Kullanıcılar (Sanctum) ---
Route::middleware('auth:sanctum')->group(function () {
    
    Route::post('auth/logout', [AuthController::class, 'logout']);

    // Dinamik Menü ve Kat Bilgileri (Yeni Lookup Sistemi)

    Route::get('floors', [LookupController::class, 'getFloors']);

    // Oda İşlemleri
    Route::get('rooms/available', [RoomController::class, 'available']);
    Route::get('rooms/available-ranges', [RoomController::class, 'availableRanges']); 
    Route::get('rooms/{id}/bookings', [RoomController::class, 'bookings']);
    
    // Tek bir apiResource yeterli (index, show, update kapsar)
    Route::apiResource('rooms', RoomController::class)->only(['index', 'show', 'update']);

    // Rezervasyon İşlemleri
    Route::patch('bookings/{id}/move', [BookingController::class, 'move']);
    Route::patch('bookings/{id}/resize', [BookingController::class, 'resize']);
    Route::apiResource('bookings', BookingController::class);
});