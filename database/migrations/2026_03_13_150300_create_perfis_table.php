<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('perfis', function (Blueprint $table): void {
            $table->id();
            $table->string('nome', 120);
            $table->text('descricao')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('perfis');
    }
};
