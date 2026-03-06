<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Room;
use App\Models\LookupValue;
use Illuminate\Support\Facades\DB;

class RoomSeeder extends Seeder
{
    public function run()
    {
        // 1. Kat ID'lerini LookupValue tablosundan 'key' bazlı çekelim
        $floors = [
            'F' => LookupValue::where('key', 'floor_f')->value('id'),
            'M' => LookupValue::where('key', 'floor_m')->value('id'),
            'S' => LookupValue::where('key', 'floor_s')->value('id'),
        ];

        // 2. Görseldeki tüm verileri (Oda Adı => Kapasite) olarak tanımlayalım
        $roomsData = [
            // First Floor (F)
            'F1' => 2, 'F2' => 2, 'F3' => 3, 'F6' => 2, 'F7' => 2, 'F8' => 2,
            // Mezzanine Floor (M)
            'M1' => 2, 'M2' => 3, 'M3' => 2, 'M4' => 2, 'M5' => 3, 'M6' => 2, 
            'M7' => 2, 'M8' => 2, 'M9' => 1, 'M10' => 3, 'M11' => 3, 'M12' => 2, 
            'M13' => 3, 'M14' => 1,
            // Second Floor (S)
            'S1' => 1, 'S2' => 2, 'S3' => 2, 'S4' => 1, 'S5' => 2, 'S6' => 2, 
            'S7' => 2, 'S8' => 2,
        ];

        // 3. Döngü ile akıllı kayıt işlemi
        foreach ($roomsData as $name => $capacity) {
            // İsimden ilk harfi al (F, M veya S)
            $prefix = substr($name, 0, 1);
            
            // Eğer kat id bulunamazsa hata almamak için kontrol
            $floorId = $floors[$prefix] ?? null;

            if ($floorId) {
                Room::create([
                    'name' => $name,
                    'capacity' => $capacity,
                    'floor_lookup_id' => $floorId,
                    // Başlangıç özellikleri boş veya varsayılan JSON
                    'features' => json_encode([
                        'klima' => true, 
                        'blackboard' => in_array($prefix, ['M', 'S']) // Örnek mantık
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
        
        $this->command->info('Toplam ' . count($roomsData) . ' oda başarıyla yüklendi!');
    }
}