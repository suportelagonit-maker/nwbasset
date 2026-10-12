<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Eventos que mudam o valor de um bem ao longo da vida.
     *
     * Era a maior lacuna contabil do modulo: a depreciacao assumia que o
     * valor so cai em linha reta, mas na vida real o bem recebe benfeitoria
     * (sobe), e reavaliado (CPC 27), sofre impairment (CPC 01, perde valor
     * recuperavel) ou tem baixa parcial. Cada evento muda a base depreciavel
     * a partir de uma competencia, e o cronograma recalcula dali para frente
     * — prospectivamente, como manda o CPC 27.
     *
     *   ACRESCIMO     -> valor: quanto foi acrescido (benfeitoria/melhoria)
     *   REAVALIACAO   -> valor: o NOVO valor contabil do bem na data
     *   IMPAIRMENT    -> valor: quanto reduzir (perda ao valor recuperavel)
     *   BAIXA_PARCIAL -> valor: quanto do valor contabil sai (parte do bem)
     *
     * `nova_vida_util_meses` so se aplica a reavaliacao/acrescimo que mudam a
     * vida util restante; em branco, mantem a vida que faltava.
     */
    public function up(): void
    {
        Schema::create('eventos_valor_bens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('bem_patrimonial_id')->constrained('bens_patrimoniais')->cascadeOnDelete();
            $table->string('tipo', 20);
            $table->date('competencia');
            $table->decimal('valor', 15, 2);
            $table->unsignedInteger('nova_vida_util_meses')->nullable();
            $table->string('descricao', 500)->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->timestamps();

            $table->index(['bem_patrimonial_id', 'competencia'], 'eventos_valor_bem_competencia_idx');
            $table->index(['empresa_id', 'competencia'], 'eventos_valor_empresa_competencia_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eventos_valor_bens');
    }
};
