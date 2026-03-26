<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tipos_bens_patrimoniais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->string('nome', 120);
            $table->timestamps();

            $table->unique(['empresa_id', 'nome']);
            $table->index('empresa_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tipos_bens_patrimoniais');
    }
};
