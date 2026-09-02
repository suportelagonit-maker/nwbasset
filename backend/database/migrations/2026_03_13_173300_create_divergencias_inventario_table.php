<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('divergencias_inventario', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('inventario_id')->constrained('inventarios')->cascadeOnDelete();
            $table->foreignId('bem_patrimonial_id')->constrained('bens_patrimoniais')->cascadeOnDelete();
            $table->string('tipo_divergencia', 40);
            $table->text('descricao');
            $table->timestamps();

            $table->index(['inventario_id', 'tipo_divergencia']);
            $table->index(['inventario_id', 'bem_patrimonial_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('divergencias_inventario');
    }
};
