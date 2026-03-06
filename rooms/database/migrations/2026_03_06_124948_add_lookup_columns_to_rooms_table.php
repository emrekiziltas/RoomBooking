<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

public function up()
{
    Schema::table('rooms', function (Blueprint $table) {
        // 1. Önce kolonları 'unsignedBigInteger' olarak (ID tipiyle aynı) oluşturuyoruz
        $table->unsignedBigInteger('floor_id')->nullable()->after('capacity');
        $table->unsignedBigInteger('room_type_id')->nullable()->after('floor_id');

        // 2. Sonra bu kolonları foreign key olarak bağlıyoruz
        $table->foreign('floor_id')
              ->references('id')
              ->on('lookup_values')
              ->onDelete('set null');

        $table->foreign('room_type_id')
              ->references('id')
              ->on('lookup_values')
              ->onDelete('set null');
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
