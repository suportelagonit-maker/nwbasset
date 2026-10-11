<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Classificacao do bem que faltava para a depreciacao ser profissional.
     *
     * - tipo_produto_id: o formulario ja perguntava o produto ("Carro",
     *   "Caminhao", "Notebook") e jogava a resposta fora. Sem ele, caminhao e
     *   automovel depreciam igual, e a tabela da Receita trata os dois de
     *   forma diferente (4 anos/25% contra 5 anos/20%).
     * - data_inicio_uso: a lei manda depreciar a partir do mes em que o bem e
     *   instalado ou posto em servico, nao da data da nota fiscal.
     * - conta_contabil / centro_custo: e por aqui que a despesa de
     *   depreciacao e levada para a contabilidade.
     */
    public function up(): void
    {
        Schema::table('bens_patrimoniais', function (Blueprint $table): void {
            $table->foreignId('tipo_produto_id')->nullable()->after('categoria')
                ->constrained('tipos_produtos')->nullOnDelete();
            $table->date('data_inicio_uso')->nullable()->after('data_aquisicao');
            $table->string('conta_contabil', 40)->nullable()->after('estado_conservacao');
            $table->string('centro_custo', 60)->nullable()->after('conta_contabil');
        });

        // Quem ja esta cadastrado comeca a depreciar na aquisicao, que e o
        // que o sistema vinha assumindo.
        DB::statement('UPDATE bens_patrimoniais SET data_inicio_uso = data_aquisicao WHERE data_inicio_uso IS NULL');
    }

    public function down(): void
    {
        Schema::table('bens_patrimoniais', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('tipo_produto_id');
            $table->dropColumn(['data_inicio_uso', 'conta_contabil', 'centro_custo']);
        });
    }
};
