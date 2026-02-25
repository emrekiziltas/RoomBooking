<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Room>
 */
class RoomFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
           'name'     => $this->faker->word(),
            'capacity' => $this->faker->numberBetween(2, 20),
            'features' => json_encode(['whiteboard' => $this->faker->boolean()]),
        ];
    }
}
