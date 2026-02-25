<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoomSeeder extends Seeder
{
    public function run(): void
    {
        $now = now()->toDateTimeString();
        
        DB::table('rooms')->insert([
            ['name' => 's1', 'capacity' => 2, 'features' => json_encode(['whiteboard' => true]),  'created_at' => $now, 'updated_at' => $now],
            ['name' => 's2', 'capacity' => 3, 'features' => json_encode(['whiteboard' => true]),  'created_at' => $now, 'updated_at' => $now],
            ['name' => 's3', 'capacity' => 4, 'features' => json_encode(['whiteboard' => false]), 'created_at' => $now, 'updated_at' => $now],
            ['name' => 's4', 'capacity' => 2, 'features' => json_encode(['whiteboard' => true]),  'created_at' => $now, 'updated_at' => $now],
            ['name' => 'm1', 'capacity' => 3, 'features' => json_encode(['whiteboard' => true]),  'created_at' => $now, 'updated_at' => $now],
            ['name' => 'm2', 'capacity' => 3, 'features' => json_encode(['whiteboard' => false]), 'created_at' => $now, 'updated_at' => $now],
        ]);
    }
}