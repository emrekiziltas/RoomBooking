<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\LookupType;
use App\Models\LookupValue;

class LookupTypesSeeder extends Seeder
{
    public function run(): void
    {
        // ... (1. Booking Types, 2. Floors ve 3. Equipment kısımları aynı kalıyor) ...

        // 4. Navigation Menu (Senin Navbar İçin)
        $navType = LookupType::create([
            'key' => 'nav_menu',
            'label' => 'Main Navigation',
            'icon' => 'Menu',
            'can_have_children' => false,
            'is_system' => true,
            'is_active' => true,
        ]);

        $menus = [
            ['label' => 'Calendar',           'path' => '/calendar',          'sort' => 1],
            ['label' => 'Reports',            'path' => '/reports',           'sort' => 2],
            ['label' => 'Bookings',           'path' => '/bookings',          'sort' => 3],
            ['label' => 'Available',          'path' => '/available',         'sort' => 4],
            ['label' => 'Range Availability', 'path' => '/available-ranges',  'sort' => 5],
            ['label' => 'Rooms',              'path' => '/rooms',             'sort' => 6],
        ];

        foreach ($menus as $menu) {
            LookupValue::create([
                'type_id' => $navType->id,
                'key' => strtolower(str_replace(' ', '_', $menu['label'])),
                'label' => $menu['label'],
                'sort_order' => $menu['sort'],
                'metadata' => json_encode(['path' => $menu['path']]),
                // Senin linkStyles içindeki Indigo ve Slate sınıflarını buraya kaydediyoruz
                'bg_color_class' => 'text-slate-400 border-transparent hover:text-slate-900 hover:border-slate-300',
                'active_bg_class' => 'text-indigo-600 border-indigo-600',
                'is_active' => true,
            ]);
        }
    }
}