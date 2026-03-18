<?php

namespace App\Http\Controllers\Api; 

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\Request;

class AssignController extends Controller
{
    public function index()
    {
        // 'room' ilişkisini kullanarak oda adı 'Unassigned' olanları filtrele
        $unassignedBookings = Booking::whereHas('room', function($query) {
            $query->where('name', 'Unassigned');
        })
        ->orderBy('start_time', 'asc')
        ->get();

        return response()->json($unassignedBookings);
    }
}