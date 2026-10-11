<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Granularidade e aceleracao nas regras de depreciacao.
     *
     * - tipo_produto_id: regra mais especifica que a do tipo de bem. A da
     *   Receita exige isso: "Veiculos" nao e uma taxa so — automovel de
     *   passageiros e 5 anos/20% e caminhao, onibus, moto e trator sao
     *   4 anos/25%. Regra sem produto continua valendo como padrao do tipo.
     * - coeficiente_aceleracao: depreciacao acelerada por turnos (art. 323 do
     *   RIR/2018): 1,0 para um turno, 1,5 para dois, 2,0 para tres.
     * - unidades_vida_util: total que o bem deve produzir ao longo da vida,
     *   base do metodo de unidades produzidas.
     */
    public function up(): void
    {
        Schema::table('regras_depreciacao_tipos_bens', function (Blueprint $table): void {
            $table->foreignId('tipo_produto_id')->nullable()->after('tipo_bem_id')
                ->constrained('tipos_produtos')->nullOnDelete();
            $table->decimal('coeficiente_aceleracao', 4, 2)->default(1)->after('taxa_anual_percentual');
            $table->unsignedBigInteger('unidades_vida_util')->nullable()->after('coeficiente_aceleracao');
        });
    }

    public function down(): void
    {
        Schema::table('regras_depreciacao_tipos_bens', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('tipo_produto_id');
            $table->dropColumn(['coeficiente_aceleracao', 'unidades_vida_util']);
        });
    }
};
