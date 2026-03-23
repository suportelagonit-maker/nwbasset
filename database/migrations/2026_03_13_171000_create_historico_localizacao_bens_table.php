<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('historico_localizacao_bens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('bem_patrimonial_id')->constrained('bens_patrimoniais')->cascadeOnDelete();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('filial_id')->constrained('filiais')->cascadeOnDelete();
            $table->foreignId('unidade_administrativa_id')->constrained('unidades_administrativas')->cascadeOnDelete();
            $table->foreignId('departamento_id')->constrained('departamentos')->cascadeOnDelete();
            $table->foreignId('local_id')->constrained('locais')->cascadeOnDelete();
            $table->date('data_inicio');
            $table->date('data_fim')->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();

            $table->index(['bem_patrimonial_id', 'data_inicio'], 'idx_hist_loc_bem_data_inicio');
            $table->index(['empresa_id', 'filial_id'], 'idx_hist_loc_empresa_filial');
            $table->index(['local_id', 'data_fim'], 'idx_hist_loc_local_data_fim');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('historico_localizacao_bens');
    }
};
