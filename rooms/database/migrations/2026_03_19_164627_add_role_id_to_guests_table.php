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
Schema::table('guests', function (Blueprint $table) {
    // Sütunu ekliyoruz
    $table->unsignedBigInteger('role_id')->nullable()->after('is_vip');
    
    // Foreign key bağlantısı (lookup_values tablosuna)
    $table->foreign('role_id')->references('id')->on('lookup_values')->onDelete('set null');
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('guests', function (Blueprint $table) {
            //
        });
    }
};
