<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
Schema::table('bookings', function (Blueprint $table) {
    // Sütun ekleme
    // Sütunu 'snapshot_' ön ekiyle ekliyoruz
    $table->unsignedBigInteger('snapshot_guest_role_id')->default(33)->after('snapshot_is_vip');
    
    // İlişki (Foreign Key)
    $table->foreign('snapshot_guest_role_id')->references('id')->on('lookup_values');
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            //
        });
    }
};
