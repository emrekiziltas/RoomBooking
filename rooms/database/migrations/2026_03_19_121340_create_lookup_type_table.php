<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('lookup_types', function (Blueprint $table) {
            $table->id();
            $table->string('key', 50)->unique();
            $table->string('label', 100);
            $table->string('icon', 50)->nullable();
            $table->boolean('can_have_children')->default(false);
            $table->boolean('is_system')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps(); // created_at ve updated_at otomatik eklenir
        });
    }

    public function down()
    {
        Schema::dropIfExists('lookup_types');
    }
};