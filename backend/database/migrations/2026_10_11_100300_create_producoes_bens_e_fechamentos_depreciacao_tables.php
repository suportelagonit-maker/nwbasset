<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /**
         * Producao apontada por bem e por mes.
         *
         * E o que o metodo de unidades produzidas precisa: sem apontamento
         * nao existe quota do mes, porque a quota e proporcional ao que o
         * bem produziu, nao ao tempo que passou.
         */
        Schema::create('producoes_bens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('bem_patrimonial_id')->constrained('bens_patrimoniais')->cascadeOnDelete();
            $table->date('competencia');
            $table->unsignedBigInteger('unidades');
            $table->string('observacoes', 500)->nullable();
            $table->timestamps();

            $table->unique(['bem_patrimonial_id', 'competencia'], 'producoes_bens_bem_competencia_unique');
            $table->index(['empresa_id', 'competencia'], 'producoes_bens_empresa_competencia_idx');
        });

        /**
         * Fechamento de competencia.
         *
         * Depois de fechado, o mes nao e mais recalculado: o numero ja foi
         * para o balancete, para a ECD e para a declaracao. Correcao de mes
         * fechado se faz por reabertura explicita, com registro de quem fez.
         */
        Schema::create('fechamentos_depreciacao', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->string('base_regra', 20);
            $table->date('competencia');
            $table->unsignedInteger('bens_processados')->default(0);
            $table->decimal('valor_total', 15, 2)->default(0);
            $table->timestamp('fechado_em');
            $table->foreignId('fechado_por')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->timestamp('reaberto_em')->nullable();
            $table->foreignId('reaberto_por')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->string('motivo_reabertura', 500)->nullable();
            $table->timestamps();

            $table->unique(['empresa_id', 'base_regra', 'competencia'], 'fechamentos_depreciacao_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fechamentos_depreciacao');
        Schema::dropIfExists('producoes_bens');
    }
};
