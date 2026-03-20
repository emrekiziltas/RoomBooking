<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LookupSeeder extends Seeder
{
    public function run()
    {
        // 1. Önce Tipleri (Types) ekleyelim (Eğer daha önce eklemediysen)
        $types = [
            ['id' => 1, 'key' => 'booking_type', 'label' => 'Booking Types', 'icon' => 'Calendar', 'is_system' => 1],
            ['id' => 2, 'key' => 'floor', 'label' => 'Floors', 'icon' => 'Building', 'is_system' => 1],
            ['id' => 3, 'key' => 'equipment', 'label' => 'Equipment', 'icon' => 'Wrench', 'is_system' => 0],
            ['id' => 4, 'key' => 'nav_menu', 'label' => 'Main Navigation', 'icon' => 'Menu', 'is_system' => 1],
            ['id' => 5, 'key' => 'system_settings', 'label' => 'System Settings', 'icon' => 'cog', 'is_system' => 1],
            ['id' => 6, 'key' => 'roles', 'label' => 'roles', 'icon' => 'cog', 'is_system' => 1],
        ];

        foreach ($types as $type) {
            DB::table('lookup_types')->updateOrInsert(['id' => $type['id']], $type);
        }

        // 2. Senin SQL Dump'ındaki tüm veriler (32 Satır)
        $values = [
            // Booking Types
            ['id' => 1, 'type_id' => 1, 'parent_id' => null, 'key' => 'booking', 'label' => 'Bookings', 'icon' => 'Calendar', 'bg_color_class' => 'bg-red-100', 'border_color_class' => 'border-blue-300', 'active_bg_class' => 'bg-blue-600 text-white border-blue-600', 'metadata' => '{"value": "Bookin", "description": "Regular room booking"}', 'sort_order' => 1],
            ['id' => 2, 'type_id' => 1, 'parent_id' => null, 'key' => 'maintenance', 'label' => 'Maintenance', 'icon' => 'Wrench', 'bg_color_class' => 'bg-red-100', 'border_color_class' => 'border-red-300', 'active_bg_class' => 'bg-red-600 text-white border-red-600', 'metadata' => '{"description": "Room maintenance or repairs"}', 'sort_order' => 2],
            ['id' => 3, 'type_id' => 1, 'parent_id' => null, 'key' => 'other', 'label' => 'Other', 'icon' => 'FileText', 'bg_color_class' => 'border-red-200', 'border_color_class' => 'border-gray-300', 'active_bg_class' => 'bg-gray-600 text-white border-gray-600', 'metadata' => '{"description": "Other purposes"}', 'sort_order' => 3],
            
            // Floors
            ['id' => 4, 'type_id' => 2, 'parent_id' => null, 'key' => 'F', 'label' => 'First Floory', 'icon' => '1', 'bg_color_class' => 'text-green-700', 'border_color_class' => 'border-red-400', 'active_bg_class' => 'bg-blue-100', 'metadata' => '{"floor_number": 0, "has_elevator": true, "description": "Ground floor with reception area"}', 'sort_order' => 1],
            ['id' => 5, 'type_id' => 2, 'parent_id' => null, 'key' => 'M', 'label' => 'Mezzanine Floor', 'icon' => '1', 'bg_color_class' => 'text-sky-400', 'border_color_class' => 'border-red-400', 'active_bg_class' => 'bg-blue-100', 'metadata' => '{"floor_number": 1, "has_elevator": true, "description": "Mez floor with  "}', 'sort_order' => 1],
            ['id' => 6, 'type_id' => 2, 'parent_id' => null, 'key' => 'S', 'label' => 'Second Floor', 'icon' => '1', 'bg_color_class' => 'text-lime-400', 'border_color_class' => 'border-purple-400', 'active_bg_class' => 'bg-orange-100', 'metadata' => '{"floor_number": 2, "has_elevator": true, "description": "Top floor with panoramic views"}', 'sort_order' => 3],
            ['id' => 32, 'type_id' => 2, 'parent_id' => null, 'key' => 'U', 'label' => 'Unassinged', 'icon' => '1', 'bg_color_class' => 'text-yellow-400', 'border_color_class' => 'border-purple-400', 'active_bg_class' => 'bg-orange-100', 'metadata' => '{"floor_number": 2, "has_elevator": true, "description": "Top floor with panoramic views"}', 'sort_order' => 4],

            // Equipment & Sub-items
            ['id' => 7, 'type_id' => 3, 'parent_id' => null, 'key' => 'projector', 'label' => 'Projector', 'icon' => 'Projector', 'bg_color_class' => null, 'border_color_class' => null, 'active_bg_class' => null, 'metadata' => null, 'sort_order' => 1],
            ['id' => 8, 'type_id' => 3, 'parent_id' => 7, 'key' => 'hdmi', 'label' => 'HDMI Connection', 'icon' => 'Cable', 'bg_color_class' => null, 'border_color_class' => null, 'active_bg_class' => null, 'metadata' => null, 'sort_order' => 1],
            ['id' => 9, 'type_id' => 3, 'parent_id' => 7, 'key' => 'wireless', 'label' => 'Wireless Projection', 'icon' => 'Wifi', 'bg_color_class' => null, 'border_color_class' => null, 'active_bg_class' => null, 'metadata' => null, 'sort_order' => 2],
            ['id' => 10, 'type_id' => 3, 'parent_id' => null, 'key' => 'whiteboard', 'label' => 'Whiteboard', 'icon' => 'MessageSquare', 'bg_color_class' => 'bg-indigo-100 text-indigo-700', 'border_color_class' => null, 'active_bg_class' => null, 'metadata' => null, 'sort_order' => 2],
            ['id' => 11, 'type_id' => 3, 'parent_id' => null, 'key' => 'tv', 'label' => 'TV Screen', 'icon' => 'Tv', 'bg_color_class' => 'bg-pink-100 text-pink-700', 'border_color_class' => null, 'active_bg_class' => null, 'metadata' => null, 'sort_order' => 3],
            ['id' => 18, 'type_id' => 3, 'parent_id' => null, 'key' => 'ac', 'label' => 'AC', 'icon' => '', 'bg_color_class' => '', 'border_color_class' => '', 'active_bg_class' => '', 'metadata' => null, 'sort_order' => 0],
            ['id' => 19, 'type_id' => 3, 'parent_id' => null, 'key' => 'fan', 'label' => 'Fan', 'icon' => '', 'bg_color_class' => '', 'border_color_class' => '', 'active_bg_class' => '', 'metadata' => null, 'sort_order' => 0],
            ['id' => 20, 'type_id' => 3, 'parent_id' => null, 'key' => 'klima', 'label' => 'Klima', 'icon' => '', 'bg_color_class' => '', 'border_color_class' => '', 'active_bg_class' => '', 'metadata' => null, 'sort_order' => 0],
            ['id' => 21, 'type_id' => 3, 'parent_id' => null, 'key' => 'kahve', 'label' => 'Kahve', 'icon' => '', 'bg_color_class' => '', 'border_color_class' => '', 'active_bg_class' => '', 'metadata' => null, 'sort_order' => 0],
            ['id' => 22, 'type_id' => 3, 'parent_id' => null, 'key' => 'rew', 'label' => 'Rew', 'icon' => '', 'bg_color_class' => '', 'border_color_class' => '', 'active_bg_class' => '', 'metadata' => null, 'sort_order' => 0],
            ['id' => 23, 'type_id' => 3, 'parent_id' => null, 'key' => 'blackboard', 'label' => 'Blackboard', 'icon' => '', 'bg_color_class' => '', 'border_color_class' => '', 'active_bg_class' => '', 'metadata' => null, 'sort_order' => 0],
            ['id' => 24, 'type_id' => 3, 'parent_id' => null, 'key' => 'dc', 'label' => 'dc', 'icon' => null, 'bg_color_class' => null, 'border_color_class' => null, 'active_bg_class' => null, 'metadata' => null, 'sort_order' => 0],
            ['id' => 25, 'type_id' => 3, 'parent_id' => null, 'key' => 'bla', 'label' => 'bla', 'icon' => null, 'bg_color_class' => null, 'border_color_class' => null, 'active_bg_class' => null, 'metadata' => null, 'sort_order' => 0],
            ['id' => 28, 'type_id' => 3, 'parent_id' => null, 'key' => 'vxv', 'label' => 'vxv', 'icon' => null, 'bg_color_class' => null, 'border_color_class' => null, 'active_bg_class' => null, 'metadata' => null, 'sort_order' => 0],
            ['id' => 29, 'type_id' => 3, 'parent_id' => null, 'key' => 'fsd', 'label' => 'fsd', 'icon' => null, 'bg_color_class' => null, 'border_color_class' => null, 'active_bg_class' => null, 'metadata' => null, 'sort_order' => 0],

            // Navigation Menu
            ['id' => 12, 'type_id' => 4, 'parent_id' => null, 'key' => 'calendar', 'label' => 'Calendar', 'icon' => '1', 'bg_color_class' => 'text-red-700', 'border_color_class' => null, 'active_bg_class' => 'text-indigo-600 border-indigo-600', 'metadata' => '{"path":"/calendar"}', 'sort_order' => 1],
            ['id' => 14, 'type_id' => 4, 'parent_id' => null, 'key' => 'bookings', 'label' => 'Bookings', 'icon' => '1', 'bg_color_class' => 'text-slate-400 border-transparent hover:text-slate-900 hover:border-slate-300', 'border_color_class' => null, 'active_bg_class' => 'text-indigo-600 border-indigo-600', 'metadata' => '{"path":"/bookings"}', 'sort_order' => 2],
            ['id' => 31, 'type_id' => 4, 'parent_id' => null, 'key' => 'assigns', 'label' => 'Assign', 'icon' => '1', 'bg_color_class' => 'text-slate-400 border-transparent hover:text-indigo-600', 'border_color_class' => null, 'active_bg_class' => 'text-indigo-600 border-indigo-600', 'metadata' => '{"path":"/assigns", "requiresAdmin": true}', 'sort_order' => 3],
            ['id' => 15, 'type_id' => 4, 'parent_id' => null, 'key' => 'available', 'label' => 'Room Availability', 'icon' => '1', 'bg_color_class' => 'text-slate-400 border-transparent hover:text-slate-900 hover:border-slate-300', 'border_color_class' => null, 'active_bg_class' => 'text-indigo-600 border-indigo-600', 'metadata' => '{"path":"/available"}', 'sort_order' => 4],
            ['id' => 16, 'type_id' => 4, 'parent_id' => null, 'key' => 'range_availability', 'label' => 'Range Availability', 'icon' => '1', 'bg_color_class' => 'text-slate-400 border-transparent hover:text-slate-900 hover:border-slate-300', 'border_color_class' => null, 'active_bg_class' => 'text-indigo-600 border-indigo-600', 'metadata' => '{"path":"/available-ranges"}', 'sort_order' => 5],
            ['id' => 30, 'type_id' => 4, 'parent_id' => null, 'key' => 'reports', 'label' => 'Reports', 'icon' => '1', 'bg_color_class' => 'text-slate-400 border-transparent hover:text-indigo-600', 'border_color_class' => null, 'active_bg_class' => 'text-indigo-600 border-indigo-600', 'metadata' => '{"path":"/reports", "requiresAdmin": true}', 'sort_order' => 6],
            ['id' => 17, 'type_id' => 4, 'parent_id' => null, 'key' => 'rooms', 'label' => 'Rooms', 'icon' => '1', 'bg_color_class' => 'text-slate-400', 'border_color_class' => null, 'active_bg_class' => 'text-indigo-600 border-indigo-600', 'metadata' => '{"path": "/rooms", "requiresAdmin": true}', 'sort_order' => 7],
            ['id' => 27, 'type_id' => 4, 'parent_id' => null, 'key' => 'settings', 'label' => 'Settings', 'icon' => '1', 'bg_color_class' => 'text-slate-400 border-transparent hover:text-indigo-600', 'border_color_class' => null, 'active_bg_class' => 'text-indigo-600 border-indigo-600', 'metadata' => '{"path": "/settings", "requiresAdmin": true}', 'sort_order' => 8],
// --- System Settings ---
            ['id' => 26, 'type_id' => 5, 'parent_id' => null, 'key' => 'max_room_capacity', 'label' => 'Max Room Capacity', 'icon' => '1', 'bg_color_class' => 'text-slate-100', 'border_color_class' => '', 'active_bg_class' => '', 'metadata' => '"4"', 'sort_order' => 0],

            // --- Guest Roles (Yeni Eklenenler) ---
            [
                'id' => 33, 
                'type_id' => 6, 
                'parent_id' => null, 
                'key' => 'standard', 
                'label' => 'Standard', 
                'icon' => 'User', 
                'bg_color_class' => 'bg-slate-100', 
                'border_color_class' => 'border-slate-300', 
                'active_bg_class' => 'bg-slate-800 text-white', 
                'metadata' => json_encode(['description' => 'Regular guest']), 
                'sort_order' => 1
            ],
            [
                'id' => 34, 
                'type_id' => 6, 
                'parent_id' => null, 
                'key' => 'organiser', 
                'label' => 'Organiser', 
                'icon' => 'Star', 
                'bg_color_class' => 'bg-yellow-100', 
                'border_color_class' => 'border-yellow-500', 
                'active_bg_class' => 'bg-yellow-500 text-black', 
                'metadata' => json_encode(['is_vip' => true]), 
                'sort_order' => 2
            ],
            [
                'id' => 35, 
                'type_id' => 6, 
                'parent_id' => null, 
                'key' => 'co_organiser', 
                'label' => 'Co-organiser', 
                'icon' => 'Users', 
                'bg_color_class' => 'bg-blue-100', 
                'border_color_class' => 'border-blue-500', 
                'active_bg_class' => 'bg-blue-600 text-white', 
                'metadata' => json_encode(['description' => 'Assistant']), 
                'sort_order' => 3
            ],
        ];
        
        

        foreach ($values as $value) {
            DB::table('lookup_values')->updateOrInsert(['id' => $value['id']], $value);
        }
    }
}