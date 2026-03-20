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
    Schema::table('booking_logs', function (Blueprint $table) {
        $table->dropForeign(['booking_id']);
        $table->unsignedBigInteger('booking_id')->nullable()->change();
        $table->foreign('booking_id')
              ->references('id')
              ->on('bookings')
              ->onDelete('set null');
    });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
