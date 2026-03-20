<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
public function up()
{
    Schema::create('guests', function (Blueprint $table) {
        $table->id(); // Bu bizim guest_id'miz olacak
        $table->string('full_name');
        $table->string('email')->unique();
        $table->string('phone')->nullable();
        $table->string('company')->nullable();
        $table->boolean('is_vip')->default(false);
        $table->timestamps();
    });
}
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('guests');
    }
};
