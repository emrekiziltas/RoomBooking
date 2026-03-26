<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Room;
use App\Models\Guest;
use Illuminate\Database\Seeder;
use Faker\Factory as Faker;
use Carbon\Carbon;

class BookingSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('en_GB');
        $rooms = Room::all();
        $guests = Guest::all();

        if ($guests->isEmpty() || $rooms->isEmpty()) {
            $this->command->error("HATA: Önce odaları ve misafirleri doldurmalısın!");
            return;
        }

        foreach ($rooms as $room) {
            // Her oda için 1-5 arası deneme yap (Kapasiteye takılırsa daha az atabilir)
            $attempts = rand(1, 5); 

            for ($i = 0; $i < $attempts; $i++) {
                $guest = $guests->random();
                $randomRoleId = rand(33, 35); 
                
                $startDate = Carbon::today()->addDays(rand(0, 15));
                $endDate = (clone $startDate)->addDays(rand(2, 5));

                $checkInStr = $startDate->format('Y-m-d 08:30:00');
                $checkOutStr = $endDate->format('Y-m-d 17:00:00');

                // ÇAKIŞMA KONTROLÜ (Controller'daki mantığın aynısı)
                $occupancy = Booking::where('room_id', $room->id)
                    ->where(function ($query) use ($checkInStr, $checkOutStr) {
                        $query->where('check_in', '<', $checkOutStr)
                              ->where('check_out', '>', $checkInStr);
                    })
                    ->whereIn('status', ['confirmed', 'checked_in', 'staying', 'completed'])
                    ->count();

                // Kapasite dolmamışsa kaydet
                if ($occupancy < $room->capacity) {
                    Booking::create([
                        'guest_id'               => $guest->id,
                        'room_id'                => $room->id,
                        'check_in'               => $checkInStr,
                        'check_out'              => $checkOutStr,
                        'status'                 => $faker->randomElement(['confirmed', 'pending', 'checked_in']),
                        'snapshot_guest_name'    => $guest->full_name,
                        'snapshot_guest_email'   => $guest->email,
                        'snapshot_is_vip'        => rand(0, 1),
                        'snapshot_guest_role_id' => $randomRoleId, 
                    ]);
                }
            }
        }
        
        $this->command->info("Booking tablosuna kapasite kurallarına uygun veriler basıldı! 🚀");
    }
}