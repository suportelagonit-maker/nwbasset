<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unidades_administrativas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('filial_id')->constrained('filiais')->cascadeOnDelete();
            $table->string('nome', 180);
            $table->string('codigo', 30);
            $table->text('descricao')->nullable();
            $table->string('status', 20)->default('ativo');
            $table->timestamps();

            $table->unique(['empresa_id', 'codigo']);
            $table->index(['empresa_id', 'filial_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unidades_administrativas');
    }
};
