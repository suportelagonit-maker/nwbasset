<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * A unicidade das regras passa a considerar o tipo de produto.
     *
     * Como estava, a chave (empresa, tipo de bem, base, inicio de vigencia)
     * so admitia UMA regra por tipo de bem — o que impedia justamente o que
     * a tabela da Receita exige: "Veiculos" com 20% a.a. como padrao e
     * "Veiculos / Caminhao" com 25% a.a. convivendo na mesma vigencia.
     *
     * NULLS NOT DISTINCT mantem a regra antiga de pe para as regras sem
     * produto: continua existindo uma so por tipo de bem (no Postgres, sem
     * essa clausula, varios NULL seriam considerados valores diferentes e a
     * duplicidade voltaria pela porta dos fundos).
     */
    public function up(): void
    {
        // Dependendo de como a chave nasceu (constraint da migration antiga
        // ou indice solto), o Postgres exige um comando diferente para
        // remove-la. Os dois sao tentados, nesta ordem.
        DB::statement('ALTER TABLE regras_depreciacao_tipos_bens DROP CONSTRAINT IF EXISTS regra_dep_empresa_tipo_base_inicio_unique');
        DB::statement('DROP INDEX IF EXISTS regra_dep_empresa_tipo_base_inicio_unique');
        DB::statement(
            'CREATE UNIQUE INDEX regra_dep_empresa_tipo_base_inicio_unique
             ON regras_depreciacao_tipos_bens (empresa_id, tipo_bem, base_regra, data_inicio_vigencia, tipo_produto_id)
             NULLS NOT DISTINCT'
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS regra_dep_empresa_tipo_base_inicio_unique');
        DB::statement(
            'CREATE UNIQUE INDEX regra_dep_empresa_tipo_base_inicio_unique
             ON regras_depreciacao_tipos_bens (empresa_id, tipo_bem, base_regra, data_inicio_vigencia)'
        );
    }
};
