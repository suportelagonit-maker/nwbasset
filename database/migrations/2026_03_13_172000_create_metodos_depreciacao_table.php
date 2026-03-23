<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('metodos_depreciacao', function (Blueprint $table): void {
            $table->id();
            $table->string('nome', 120);
            $table->string('codigo', 40)->unique();
            $table->text('descricao')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('metodos_depreciacao');
    }
};
