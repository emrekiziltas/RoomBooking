<?php

namespace Database\Factories;

use App\Models\Room;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class BookingFactory extends Factory
{
    public function definition(): array
    {
        $start = $this->faker->dateTimeBetween('+1 day', '+30 days');
        $end   = (clone $start)->modify('+1 hour');

        return [
            'room_id'    => Room::factory(),
            'user_id'    => User::factory(),
            'title'      => $this->faker->sentence(3),
            'start_time' => $start,
            'end_time'   => $end,
            'color'      => $this->faker->hexColor(),
        ];
    }
}