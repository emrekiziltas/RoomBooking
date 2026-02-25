<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

class BookingAuthTest extends TestCase
{
    private string $email;

    protected function setUp(): void
    {
        parent::setUp();
        $this->email = 'test_' . time() . '_' . rand(100, 999) . '@test.com';
    }

    public function test_user_can_register()
    {
        $response = $this->postJson('/api/auth/register', [
            'name'                  => 'Test User',
            'email'                 => $this->email,
            'password'              => '123456',
            'password_confirmation' => '123456',
        ]);

        $response->assertStatus(201)
                 ->assertJsonStructure(['success', 'data', 'token']);
    }

    public function test_user_cannot_register_with_duplicate_email()
    {
        User::factory()->create(['email' => $this->email]);

        $response = $this->postJson('/api/auth/register', [
            'name'                  => 'Test User 2',
            'email'                 => $this->email,
            'password'              => '123456',
            'password_confirmation' => '123456',
        ]);

        $response->assertStatus(422)
                 ->assertJsonPath('success', false);
    }

    public function test_user_can_login()
    {
        User::factory()->create([
            'email'    => $this->email,
            'password' => bcrypt('123456'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => $this->email,
            'password' => '123456',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['success', 'data', 'token']);
    }

    public function test_user_cannot_login_with_wrong_password()
    {
        User::factory()->create([
            'email'    => $this->email,
            'password' => bcrypt('123456'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => $this->email,
            'password' => 'yanlis_sifre',
        ]);

        $response->assertStatus(401)
                 ->assertJsonPath('success', false);
    }

    public function test_unauthenticated_request_returns_401()
    {
        $response = $this->getJson('/api/bookings');
        $response->assertStatus(401);
    }
}