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
    Schema::table('rooms', function (Blueprint $table) {
        // Nullable yapıyoruz çünkü tablo dolu, hata almamalıyız
        $table->foreignId('floor_id')->nullable()->constrained('lookup_values')->onDelete('set null');
        $table->foreignId('room_type_id')->nullable()->constrained('lookup_values')->onDelete('set null');
    });
}
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            //
        });
    }
};
