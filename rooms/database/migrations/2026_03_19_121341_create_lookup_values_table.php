<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('lookup_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('type_id')->constrained('lookup_types')->onDelete('cascade');
            $table->integer('parent_id')->nullable()->index(); // Kendi içinde hiyerarşi için
            $table->string('key', 50)->nullable();
            $table->string('label', 100);
            $table->string('icon', 50)->nullable();
            $table->string('bg_color_class', 100)->nullable();
            $table->string('border_color_class', 100)->nullable();
            $table->string('active_bg_class', 100)->nullable();
            $table->json('metadata')->nullable(); // Ekstra ayarlar için süper esneklik
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('lookup_values');
    }
};