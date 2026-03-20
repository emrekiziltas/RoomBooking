<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Guest; 
use Faker\Factory as Faker;

class GuestSeeder extends Seeder
{
    public function run(): void
    {
        // İngiliz formatında (GB) veriler için
        $faker = Faker::create('en_GB'); 

        for ($i = 0; $i < 50; $i++) {
            Guest::create([
                'full_name' => $faker->name,
                'email'     => $faker->unique()->safeEmail,
                'phone'     => $faker->phoneNumber,
                'company'   => $faker->company,
                'is_vip'    => $faker->boolean(15), // %15 VIP ihtimali
                
                // Roller: 33 (Standard), 34 (Organiser), 35 (Co-organiser)
                'role_id'   => rand(33, 35), 
            ]);
        }

        $this->command->info("50 adet misafir (Guest) rolleriyle birlikte başarıyla oluşturuldu! 👤✨");
    }
}