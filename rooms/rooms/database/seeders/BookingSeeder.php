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

    $colors = [
        '#3B82F6', '#10B981', '#F97316',
    ];

    $bookings = [];

    $faker = Faker::create('en_GB');

    for ($day = -7; $day <= 14; $day++) {
        $date = Carbon::today()->addDays($day);

        if ($date->isWeekend()) continue;

        foreach ($rooms as $room) {
            // Her oda için rastgele 0-2 slot dolu olsun
            $slots = [
                //['start' => '08:30:00', 'end' => '12:30:00'],
                //['start' => '12:30:00', 'end' => '16:30:00'],
                ['start' => '08:30:00', 'end' => '16:30:00'],
            ];
            
            foreach ($slots as $slot) {
                // Kapasite kadar booking ekle (rastgele)
                $bookingCount = rand(0, $room->capacity);

                for ($i = 0; $i < $bookingCount; $i++) {
                    $userId = $users[array_rand($users)];
                    $prefix = $room->name[0];
                    $color = $prefix === 'F' ? '#3B82F6' : ($prefix === 'M' ? '#10B981' : '#F97316');

                    $bookings[] = [
                        'room_id'    => $room->id,
                        'user_id'    => $userId,
                        'title'      => $faker->name() ,
                        'start_time' => $date->format('Y-m-d') . ' ' . $slot['start'],
                        'end_time'   => $date->format('Y-m-d') . ' ' . $slot['end'],
                        'color'      => $color,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }
                

        }
    }

    DB::table('bookings')->insert($bookings);
    $this->command->info(count($bookings) . ' booking oluşturuldu.');
}
}