
<?php
/*
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\BookingController;
use Illuminate\Support\Facades\Route;

// Auth middleware YOK, direkt route'lar
Route::post('auth/register', [AuthController::class, 'register']);
Route::post('auth/login', [AuthController::class, 'login']);

Route::apiResource('rooms', RoomController::class)->only(['index', 'show']);
Route::get('rooms/{id}/bookings', [RoomController::class, 'bookings']);

Route::apiResource('bookings', BookingController::class);
Route::patch('bookings/{id}/move', [BookingController::class, 'move']);
Route::patch('bookings/{id}/resize', [BookingController::class, 'resize']);
*/

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\BookingController;
use Illuminate\Support\Facades\Route;

// Auth gerekmez
Route::post('auth/register', [AuthController::class, 'register']);
Route::post('auth/login', [AuthController::class, 'login']);

// Auth gerekir
Route::middleware('auth:sanctum')->group(function () {
    
    Route::post('auth/logout', [AuthController::class, 'logout']);

    Route::get('rooms/available', [RoomController::class, 'available']);
    Route::get('rooms/available-ranges', [RoomController::class, 'availableRanges']); 

    Route::apiResource('rooms', RoomController::class)->only(['index', 'show', 'update']);

    Route::apiResource('rooms', RoomController::class)->only(['index', 'show']);
    
    Route::get('rooms/{id}/bookings', [RoomController::class, 'bookings']);

    Route::patch('bookings/{id}/move', [BookingController::class, 'move']);
    Route::patch('bookings/{id}/resize', [BookingController::class, 'resize']);
    Route::apiResource('bookings', BookingController::class);
});