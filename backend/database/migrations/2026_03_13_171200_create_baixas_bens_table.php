<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('baixas_bens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('bem_patrimonial_id')->constrained('bens_patrimoniais')->cascadeOnDelete();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('filial_id')->constrained('filiais')->cascadeOnDelete();
            $table->date('data_baixa');
            $table->string('motivo_baixa', 150);
            $table->decimal('valor_baixa', 15, 2)->default(0);
            $table->text('observacoes')->nullable();
            $table->timestamps();

            $table->index(['bem_patrimonial_id', 'data_baixa'], 'idx_baixas_bem_data');
            $table->index(['empresa_id', 'filial_id'], 'idx_baixas_empresa_filial');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('baixas_bens');
    }
};
