<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventario_itens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('inventario_id')->constrained('inventarios')->cascadeOnDelete();
            $table->foreignId('bem_patrimonial_id')->constrained('bens_patrimoniais')->cascadeOnDelete();
            $table->boolean('localizado')->default(false);
            $table->date('data_verificacao')->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();

            $table->unique(['inventario_id', 'bem_patrimonial_id']);
            $table->index(['inventario_id', 'localizado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventario_itens');
    }
};
