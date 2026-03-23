<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('responsabilidade_bens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('bem_patrimonial_id')->constrained('bens_patrimoniais')->cascadeOnDelete();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('filial_id')->constrained('filiais')->cascadeOnDelete();
            $table->foreignId('responsavel_id')->constrained('responsaveis')->cascadeOnDelete();
            $table->date('data_inicio');
            $table->date('data_fim')->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();

            $table->index(['bem_patrimonial_id', 'data_inicio'], 'idx_resp_bem_data_inicio');
            $table->index(['empresa_id', 'filial_id'], 'idx_resp_empresa_filial');
            $table->index(['responsavel_id', 'data_fim'], 'idx_resp_responsavel_data_fim');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('responsabilidade_bens');
    }
};
