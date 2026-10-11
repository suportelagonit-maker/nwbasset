<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Remove a chave unica (bem, data de calculo).
     *
     * Era ela que tornava impossivel manter os dois livros: com uma linha
     * so por bem e por data, a depreciacao fiscal e a societaria do mesmo
     * mes colidiam. A unicidade correta — (bem, base, competencia) — foi
     * criada na migration que transformou a tabela em razao mensal.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE depreciacoes_bens DROP CONSTRAINT IF EXISTS depreciacoes_bens_bem_patrimonial_id_data_calculo_unique');
        DB::statement('DROP INDEX IF EXISTS depreciacoes_bens_bem_patrimonial_id_data_calculo_unique');
    }

    public function down(): void
    {
        DB::statement(
            'CREATE UNIQUE INDEX depreciacoes_bens_bem_patrimonial_id_data_calculo_unique
             ON depreciacoes_bens (bem_patrimonial_id, data_calculo)'
        );
    }
};
