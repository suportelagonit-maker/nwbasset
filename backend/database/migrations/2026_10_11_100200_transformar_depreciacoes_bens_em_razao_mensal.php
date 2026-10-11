<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `depreciacoes_bens` deixa de ser uma fotografia solta e vira razao
     * mensal: uma linha por bem, por base e por competencia.
     *
     * O que muda, e por que:
     *
     * - `competencia` (sempre dia 1 do mes): a lei fiscal e a contabilidade
     *   trabalham por mes. Sem competencia nao ha balancete, nao ha ECD e
     *   nao da para fechar periodo.
     * - `base_regra`: fiscal e societaria convivem. Antes a tabela so
     *   guardava um numero por bem e por data, entao era impossivel manter
     *   os dois livros — exatamente o que todo sistema de mercado faz.
     * - `valor_depreciacao_periodo`: a despesa DO MES. O acumulado sozinho
     *   nao serve para lancamento contabil.
     * - `fechado_em`: competencia fechada nao e recalculada. Sem isso, mudar
     *   uma taxa hoje reescreveria o passado ja declarado.
     *
     * `data_calculo` continua, apontando para o ultimo dia da competencia,
     * para nao quebrar relatorios e exportacoes existentes.
     */
    public function up(): void
    {
        Schema::table('depreciacoes_bens', function (Blueprint $table): void {
            $table->string('base_regra', 20)->default('fiscal')->after('empresa_id');
            $table->date('competencia')->nullable()->after('base_regra');
            $table->decimal('valor_depreciacao_periodo', 15, 2)->default(0)->after('taxa_anual');
            $table->string('metodo', 40)->default('linha_reta')->after('valor_depreciacao_periodo');
            $table->unsignedInteger('meses_depreciados')->default(0)->after('metodo');
            $table->unsignedBigInteger('regra_depreciacao_id')->nullable()->after('metodo_depreciacao_id');
            $table->timestamp('fechado_em')->nullable()->after('data_calculo');
        });

        // O que ja existe vira a competencia do proprio mes do calculo.
        DB::statement("UPDATE depreciacoes_bens SET competencia = date_trunc('month', data_calculo)::date WHERE competencia IS NULL");

        Schema::table('depreciacoes_bens', function (Blueprint $table): void {
            $table->date('competencia')->nullable(false)->change();
            $table->unique(['bem_patrimonial_id', 'base_regra', 'competencia'], 'depreciacoes_bens_bem_base_competencia_unique');
            $table->index(['empresa_id', 'base_regra', 'competencia'], 'depreciacoes_bens_empresa_competencia_idx');
        });
    }

    public function down(): void
    {
        Schema::table('depreciacoes_bens', function (Blueprint $table): void {
            $table->dropUnique('depreciacoes_bens_bem_base_competencia_unique');
            $table->dropIndex('depreciacoes_bens_empresa_competencia_idx');
            $table->dropColumn([
                'base_regra',
                'competencia',
                'valor_depreciacao_periodo',
                'metodo',
                'meses_depreciados',
                'regra_depreciacao_id',
                'fechado_em',
            ]);
        });
    }
};
