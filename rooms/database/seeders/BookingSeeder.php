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
            $this->command->error("HATA: Önce odaları ve misafirleri (GuestSeeder) doldurmalısın!");
            return;
        }

        foreach ($rooms as $room) {
            $bookingCount = rand(1, 2);

            for ($i = 0; $i < $bookingCount; $i++) {
                $guest = $guests->random();
                
                // Roller: 33 (Standard), 34 (Organiser), 35 (Co-organiser)
                $randomRoleId = rand(33, 35); 

                $startDate = Carbon::today()->addDays(rand(0, 15));
                $endDate = (clone $startDate)->addDays(rand(2, 5));

                Booking::create([
                    'guest_id'               => $guest->id,
                    'room_id'                => $room->id,
                    'check_in'               => $startDate->format('Y-m-d 08:30:00'),
                    'check_out'              => $endDate->format('Y-m-d 17:00:00'),
                    'status'                 => $faker->randomElement(['confirmed', 'pending', 'checked_in']),
                    
                    // Canlı Rol (Misafirin şu anki rolüyle aynı da yapabilirsin)
                    'guest_role_id'          => $randomRoleId,

                    // --- SNAPSHOT ALANLARI ---
                    'snapshot_guest_name'    => $guest->full_name,
                    'snapshot_guest_email'   => $guest->email,
                    'snapshot_guest_company' => $guest->company,
                    'snapshot_is_vip'        => $guest->is_vip,
                    // Rezervasyon anındaki rol donduruluyor:
                    'snapshot_guest_role_id' => $randomRoleId, 
                ]);
            }
        }
        
        $this->command->info("Booking tablosuna rollerle birlikte gerçekçi veriler basıldı! 🚀");
    }
}