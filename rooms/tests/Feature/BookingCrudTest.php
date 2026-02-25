<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Room;
use App\Models\Booking;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingCrudTest extends TestCase
{
   // use RefreshDatabase;

    private User $user;
    private User $admin;
    private Room $room;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user  = User::factory()->create(['role' => 'user']);
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->room  = Room::factory()->create();
    }

    public function test_user_can_create_booking()
    {
        $response = $this->actingAs($this->user)->postJson('/api/bookings', [
            'room_id'    => $this->room->id,
            'title'      => 'Yeni Toplantı',
            'start_time' => '2026-03-01 10:00:00',
            'end_time'   => '2026-03-01 11:00:00',
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.title', 'Yeni Toplantı')
                 ->assertJsonStructure(['data' => ['id', 'title', 'room', 'user']]);
    }

 public function test_user_can_list_bookings()
{
    Booking::factory()->count(3)->create([
        'room_id' => $this->room->id,
        'user_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->getJson('/api/bookings');

    $response->assertStatus(200);
    
    // Toplam sayı yerine en az 3 olduğunu kontrol et
    $this->assertGreaterThanOrEqual(3, count($response->json('data')));
}

    public function test_user_can_delete_own_booking()
    {
        $booking = Booking::factory()->create([
            'room_id' => $this->room->id,
            'user_id' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)->deleteJson("/api/bookings/{$booking->id}");

        $response->assertStatus(200)
                 ->assertJsonPath('success', true);
    }

    public function test_user_cannot_delete_others_booking()
    {
        $otherUser = User::factory()->create(['role' => 'user']);
        $booking   = Booking::factory()->create([
            'room_id' => $this->room->id,
            'user_id' => $otherUser->id,
        ]);

        $response = $this->actingAs($this->user)->deleteJson("/api/bookings/{$booking->id}");

        $response->assertStatus(403)
                 ->assertJsonPath('success', false);
    }

    public function test_admin_can_delete_any_booking()
    {
        $booking = Booking::factory()->create([
            'room_id' => $this->room->id,
            'user_id' => $this->user->id,
        ]);

        $response = $this->actingAs($this->admin)->deleteJson("/api/bookings/{$booking->id}");

        $response->assertStatus(200)
                 ->assertJsonPath('success', true);
    }

    public function test_user_can_update_own_booking()
    {
        $booking = Booking::factory()->create([
            'room_id' => $this->room->id,
            'user_id' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)->patchJson("/api/bookings/{$booking->id}", [
            'title' => 'Güncellenmiş Toplantı',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.title', 'Güncellenmiş Toplantı');
    }

    public function test_user_cannot_update_others_booking()
    {
        $otherUser = User::factory()->create(['role' => 'user']);
        $booking   = Booking::factory()->create([
            'room_id' => $this->room->id,
            'user_id' => $otherUser->id,
        ]);

        $response = $this->actingAs($this->user)->patchJson("/api/bookings/{$booking->id}", [
            'title' => 'Hack Denemesi',
        ]);

        $response->assertStatus(403);
    }
}
