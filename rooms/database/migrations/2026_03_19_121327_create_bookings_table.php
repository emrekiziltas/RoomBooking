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
    Schema::create('bookings', function (Blueprint $table) {
        $table->id();
        // Aşağıdaki satır 'guests' tablosundaki 'id'ye bağlanır
        $table->foreignId('guest_id')->constrained('guests')->onDelete('cascade');
        $table->foreignId('room_id')->nullable()->constrained('rooms')->onDelete('set null');

        $table->dateTime('check_in');
        $table->dateTime('check_out');
        $table->string('status')->default('unassigned'); 

        $table->string('snapshot_guest_name');
        $table->string('snapshot_guest_email');
        $table->string('snapshot_guest_company')->nullable();
        $table->boolean('snapshot_is_vip')->default(false);
        
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
