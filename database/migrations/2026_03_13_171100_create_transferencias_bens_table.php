<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transferencias_bens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('bem_patrimonial_id')->constrained('bens_patrimoniais')->cascadeOnDelete();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('filial_id')->constrained('filiais')->cascadeOnDelete();
            $table->foreignId('origem_unidade_administrativa_id')->constrained('unidades_administrativas')->cascadeOnDelete();
            $table->foreignId('origem_departamento_id')->constrained('departamentos')->cascadeOnDelete();
            $table->foreignId('origem_local_id')->constrained('locais')->cascadeOnDelete();
            $table->foreignId('destino_unidade_administrativa_id')->constrained('unidades_administrativas')->cascadeOnDelete();
            $table->foreignId('destino_departamento_id')->constrained('departamentos')->cascadeOnDelete();
            $table->foreignId('destino_local_id')->constrained('locais')->cascadeOnDelete();
            $table->date('data_transferencia');
            $table->string('motivo', 150);
            $table->text('observacoes')->nullable();
            $table->timestamps();

            $table->index(['bem_patrimonial_id', 'data_transferencia'], 'idx_transf_bem_data');
            $table->index(['empresa_id', 'filial_id'], 'idx_transf_empresa_filial');
            $table->index(['origem_local_id', 'destino_local_id'], 'idx_transf_origem_destino');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transferencias_bens');
    }
};
