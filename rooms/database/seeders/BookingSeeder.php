<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Faker\Factory as Faker;

class BookingSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('bookings')->truncate();

        $rooms = DB::table('rooms')->get();
        $users = DB::table('users')->pluck('id')->toArray();
        $faker = Faker::create('en_GB');
        $bookings = [];

        // -7 günden başla, +14 güne kadar git
        for ($day = -7; $day <= 14; $day++) {
            $startDate = Carbon::today()->addDays($day);

            // Hafta sonu başlangıçlı rezervasyon yapmayalım
            if ($startDate->isWeekend()) continue;

            foreach ($rooms as $room) {
                // Her gün her oda için %30 ihtimalle çoklu gün rezervasyonu başlasın
                if (rand(1, 100) > 30) continue;

                $userId = $users[array_rand($users)];
                
                // RASTGELE SÜRE: 1 ile 4 gün arasında sürsün
                $durationDays = rand(1, 4); 
                $endDate = $startDate->copy()->addDays($durationDays);

                // Eğer bitiş hafta sonuna denk gelirse Cuma gününe çekelim (opsiyonel)
                if ($endDate->isWeekend()) {
                    $endDate = $startDate->copy()->next(Carbon::FRIDAY);
                }

                $prefix = $room->name[0];
                $color = $prefix === 'F' ? '#3B82F6' : ($prefix === 'M' ? '#10B981' : '#F97316');

                $bookings[] = [
                    'room_id'    => $room->id,
                    'user_id'    => $userId,
                    'title'      => $faker->name(),
                    'start_time' => $startDate->format('Y-m-d') . ' 08:30:00',
                    'end_time'   => $endDate->format('Y-m-d') . ' 16:30:00',
                    'color'      => $color,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        // Toplu insert (Performans için)
        $chunks = array_chunk($bookings, 100);
        foreach ($chunks as $chunk) {
            DB::table('bookings')->insert($chunk);
        }

        $this->command->info(count($bookings) . ' adet (bazıları çoklu gün) booking oluşturuldu.');
    }
}