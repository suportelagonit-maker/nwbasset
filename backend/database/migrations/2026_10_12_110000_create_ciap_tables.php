<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CIAP — Controle de Credito de ICMS do Ativo Permanente.
     *
     * Para empresa contribuinte de ICMS, o imposto pago na compra de um bem
     * do ativo pode ser creditado em 48 parcelas (1/48 ao mes), cada uma
     * ajustada pelo fator de proporcionalidade do mes (saidas tributadas /
     * saidas totais). E a base do Bloco G do EFD ICMS/IPI.
     *
     * So vale para quem tem operacao de ICMS. Entidade imune (igreja,
     * por exemplo) nao usa — por isso o credito e um campo opcional no bem,
     * e o controle so aparece quando preenchido.
     */
    public function up(): void
    {
        Schema::table('bens_patrimoniais', function (Blueprint $table): void {
            $table->decimal('valor_credito_icms', 15, 2)->nullable()->after('valor_aquisicao');
            $table->date('data_credito_icms')->nullable()->after('valor_credito_icms');
        });

        // Fator de proporcionalidade por competencia (comum a toda a empresa).
        // Sem registro para o mes, o sistema assume 1,0 (saidas 100% tributadas).
        Schema::create('ciap_fatores', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->date('competencia');
            $table->decimal('saidas_tributadas', 15, 2)->default(0);
            $table->decimal('saidas_totais', 15, 2)->default(0);
            $table->decimal('fator', 7, 6)->default(1);
            $table->timestamps();

            $table->unique(['empresa_id', 'competencia'], 'ciap_fatores_empresa_competencia_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ciap_fatores');

        Schema::table('bens_patrimoniais', function (Blueprint $table): void {
            $table->dropColumn(['valor_credito_icms', 'data_credito_icms']);
        });
    }
};
