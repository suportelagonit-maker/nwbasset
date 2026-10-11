<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Inventário rotativo: contagem parcial, de alguns locais por vez.
     *
     * Contar a filial inteira de uma vez só funciona em empresa pequena.
     * A prática do mercado é o rotativo — percorrer alguns locais por mês
     * até fechar o ciclo —, e isso exige que o inventário saiba qual é o
     * seu escopo. Sem escopo, tudo que está fora dele apareceria como
     * "não encontrado" e a conciliação viraria ruído.
     *
     * Inventário sem local escolhido continua sendo completo, que é o
     * comportamento de antes.
     */
    public function up(): void
    {
        Schema::table('inventarios', function (Blueprint $table): void {
            $table->string('tipo', 20)->default('COMPLETO')->after('nome');
        });

        Schema::create('inventario_locais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('inventario_id')->constrained('inventarios')->cascadeOnDelete();
            $table->foreignId('local_id')->constrained('locais')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['inventario_id', 'local_id'], 'inventario_locais_unique');
        });

        DB::statement("UPDATE inventarios SET tipo = 'COMPLETO' WHERE tipo IS NULL");
    }

    public function down(): void
    {
        Schema::dropIfExists('inventario_locais');

        Schema::table('inventarios', function (Blueprint $table): void {
            $table->dropColumn('tipo');
        });
    }
};
