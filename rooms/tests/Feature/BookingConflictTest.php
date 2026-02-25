<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Room;
use App\Models\Booking;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingConflictTest extends TestCase
{
   // use RefreshDatabase;

    private User $user;
    private Room $room;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['role' => 'user']);
        $this->room = Room::factory()->create();
    }

    public function test_it_prevents_overlapping_bookings()
    {
        Booking::factory()->create([
            'user_id'    => $this->user->id,
            'room_id'    => $this->room->id,
            'start_time' => Carbon::parse('2026-03-01 14:00:00'),
            'end_time'   => Carbon::parse('2026-03-01 15:00:00'),
        ]);

        // Çakışan rezervasyon
        $response = $this->actingAs($this->user)->postJson('/api/bookings', [
            'room_id'    => $this->room->id,
            'title'      => 'Çakışan',
            'start_time' => '2026-03-01 14:15:00',
            'end_time'   => '2026-03-01 14:45:00',
        ]);

        $response->assertStatus(409);
    }

    public function test_consecutive_bookings_are_allowed()
    {
        Booking::factory()->create([
            'user_id'    => $this->user->id,
            'room_id'    => $this->room->id,
            'start_time' => Carbon::parse('2026-03-01 14:00:00'),
            'end_time'   => Carbon::parse('2026-03-01 15:00:00'),
        ]);

        // Peş peşe rezervasyon (15:00'dan başlıyor)
        $response = $this->actingAs($this->user)->postJson('/api/bookings', [
            'room_id'    => $this->room->id,
            'title'      => 'Peş Peşe',
            'start_time' => '2026-03-01 15:00:00',
            'end_time'   => '2026-03-01 16:00:00',
        ]);

        $response->assertStatus(201);
    }

    public function test_same_time_different_room_is_allowed()
    {
        $otherRoom = Room::factory()->create();

        Booking::factory()->create([
            'user_id'    => $this->user->id,
            'room_id'    => $this->room->id,
            'start_time' => Carbon::parse('2026-03-01 14:00:00'),
            'end_time'   => Carbon::parse('2026-03-01 15:00:00'),
        ]);

        // Farklı odaya aynı saat
        $response = $this->actingAs($this->user)->postJson('/api/bookings', [
            'room_id'    => $otherRoom->id,
            'title'      => 'Farklı Oda',
            'start_time' => '2026-03-01 14:00:00',
            'end_time'   => '2026-03-01 15:00:00',
        ]);

        $response->assertStatus(201);
    }

    public function test_move_booking_to_available_slot()
    {
        $booking = Booking::factory()->create([
            'user_id'    => $this->user->id,
            'room_id'    => $this->room->id,
            'start_time' => Carbon::parse('2026-03-01 14:00:00'),
            'end_time'   => Carbon::parse('2026-03-01 15:00:00'),
        ]);

        $response = $this->actingAs($this->user)->patchJson("/api/bookings/{$booking->id}/move", [
            'room_id'    => $this->room->id,
            'start_time' => '2026-03-01 16:00:00',
            'end_time'   => '2026-03-01 17:00:00',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.start_time', '2026-03-01T16:00:00.000000Z');
    }

    public function test_move_booking_to_conflicting_slot_fails()
    {
        $booking1 = Booking::factory()->create([
            'user_id'    => $this->user->id,
            'room_id'    => $this->room->id,
            'start_time' => Carbon::parse('2026-03-01 14:00:00'),
            'end_time'   => Carbon::parse('2026-03-01 15:00:00'),
        ]);

        Booking::factory()->create([
            'user_id'    => $this->user->id,
            'room_id'    => $this->room->id,
            'start_time' => Carbon::parse('2026-03-01 16:00:00'),
            'end_time'   => Carbon::parse('2026-03-01 17:00:00'),
        ]);

        // booking1'i booking2'nin saatine taşımaya çalış
        $response = $this->actingAs($this->user)->patchJson("/api/bookings/{$booking1->id}/move", [
            'room_id'    => $this->room->id,
            'start_time' => '2026-03-01 16:00:00',
            'end_time'   => '2026-03-01 17:00:00',
        ]);

        $response->assertStatus(409);
    }

    public function test_resize_booking()
    {
        $booking = Booking::factory()->create([
            'user_id'    => $this->user->id,
            'room_id'    => $this->room->id,
            'start_time' => Carbon::parse('2026-03-01 14:00:00'),
            'end_time'   => Carbon::parse('2026-03-01 15:00:00'),
        ]);

        $response = $this->actingAs($this->user)->patchJson("/api/bookings/{$booking->id}/resize", [
            'end_time' => '2026-03-01 17:00:00',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.end_time', '2026-03-01T17:00:00.000000Z');
    }

    public function test_resize_booking_conflict_fails()
    {
        $booking1 = Booking::factory()->create([
            'user_id'    => $this->user->id,
            'room_id'    => $this->room->id,
            'start_time' => Carbon::parse('2026-03-01 14:00:00'),
            'end_time'   => Carbon::parse('2026-03-01 15:00:00'),
        ]);

        Booking::factory()->create([
            'user_id'    => $this->user->id,
            'room_id'    => $this->room->id,
            'start_time' => Carbon::parse('2026-03-01 16:00:00'),
            'end_time'   => Carbon::parse('2026-03-01 17:00:00'),
        ]);

        // booking1'i 16:30'a kadar uzatmaya çalış
        $response = $this->actingAs($this->user)->patchJson("/api/bookings/{$booking1->id}/resize", [
            'end_time' => '2026-03-01 16:30:00',
        ]);

        $response->assertStatus(409);
    }
}
