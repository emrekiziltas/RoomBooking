<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('rooms', function (Blueprint $table) {
            if (!Schema::hasColumn('rooms', 'floor_id')) {
                $table->unsignedBigInteger('floor_id')->nullable()->after('capacity');
                $table->foreign('floor_id')
                      ->references('id')
                      ->on('lookup_values')
                      ->onDelete('set null');
            }

            if (!Schema::hasColumn('rooms', 'room_type_id')) {
                $table->unsignedBigInteger('room_type_id')->nullable()->after('floor_id');
                $table->foreign('room_type_id')
                      ->references('id')
                      ->on('lookup_values')
                      ->onDelete('set null');
            }
        });
    }

    public function down()
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->dropForeign(['floor_id']);
            $table->dropForeign(['room_type_id']);
            $table->dropColumn(['floor_id', 'room_type_id']);
        });
    }
};