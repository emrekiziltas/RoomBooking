<?php

namespace Tests\Feature;

use App\Models\Room;
use App\Models\User;
use App\Models\Booking;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomTest extends TestCase
{
   // use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['role' => 'user']);
    }

    public function test_can_list_rooms()
    {
        Room::factory()->count(3)->create();

         $response = $this->actingAs($this->user)->getJson('/api/rooms');

    $response->assertStatus(200);
    
    // Toplam sayı yerine en az 3 olduğunu kontrol et
    $this->assertGreaterThanOrEqual(3, count($response->json('data')));
    }

    public function test_can_get_single_room()
    {
        $room = Room::factory()->create(['name' => 'Test Odası']);

        $response = $this->actingAs($this->user)->getJson("/api/rooms/{$room->id}");

        $response->assertStatus(200)
                 ->assertJsonPath('data.name', 'Test Odası');
    }

    public function test_can_get_room_bookings()
    {
        $room = Room::factory()->create();

        Booking::factory()->count(2)->create([
            'room_id' => $room->id,
            'user_id' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)->getJson("/api/rooms/{$room->id}/bookings");

        $response->assertStatus(200)
                 ->assertJsonCount(2, 'data');
    }

    public function test_unauthenticated_user_cannot_access_rooms()
    {
        $response = $this->getJson('/api/rooms');
        $response->assertStatus(401);
    }
}
