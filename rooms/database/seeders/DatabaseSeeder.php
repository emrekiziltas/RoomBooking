<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Room;
use App\Models\Booking;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(LookupTypesSeeder::class);

        // 1. Önce odaları oluştur
        $this->call(RoomSeeder::class);

        // 2. Test kullanıcısı oluştur
        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        // 3. 10 tane rastgele kullanıcı oluştur
        $users = User::factory(10)->create();
        $rooms = Room::all();

        // 4. 20 tane örnek rezervasyon oluştur
        for ($i = 0; $i < 20; $i++) {
            $start = now()->addDays(rand(1, 10))->setHour(rand(9, 17))->setMinute(0);
            
            Booking::create([
                'room_id' => $rooms->random()->id,
                'user_id' => $users->random()->id,
                'title' => 'Proje Değerlendirme ' . ($i + 1),
                'start_time' => $start,
                'end_time' => $start->copy()->addHours(rand(1, 3)),
                'color' => '#' . str_pad(dechex(mt_rand(0, 0xFFFFFF)), 6, '0', STR_PAD_LEFT),
            ]);
        }
    }
}