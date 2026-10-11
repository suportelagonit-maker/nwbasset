<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * O que a contagem em campo precisa registrar alem do "achei".
     *
     * `localizado` sozinho nao resolve: o inventario existe para descobrir
     * se o bem esta ONDE deveria estar, com QUEM deveria, e para provar
     * depois quem contou e quando. Sem o local encontrado nao ha como
     * apontar divergencia de localizacao, que e o achado mais comum de um
     * inventario patrimonial.
     */
    public function up(): void
    {
        Schema::table('inventario_itens', function (Blueprint $table): void {
            $table->foreignId('local_encontrado_id')->nullable()->after('localizado')
                ->constrained('locais')->nullOnDelete();
            $table->foreignId('responsavel_encontrado_id')->nullable()->after('local_encontrado_id')
                ->constrained('responsaveis')->nullOnDelete();
            $table->timestamp('contado_em')->nullable()->after('data_verificacao');
            $table->foreignId('contado_por')->nullable()->after('contado_em')
                ->constrained('usuarios')->nullOnDelete();
            $table->string('codigo_lido', 120)->nullable()->after('contado_por');

            $table->index(['inventario_id', 'localizado'], 'inventario_itens_inventario_localizado_idx');
        });
    }

    public function down(): void
    {
        Schema::table('inventario_itens', function (Blueprint $table): void {
            $table->dropIndex('inventario_itens_inventario_localizado_idx');
            $table->dropConstrainedForeignId('local_encontrado_id');
            $table->dropConstrainedForeignId('responsavel_encontrado_id');
            $table->dropConstrainedForeignId('contado_por');
            $table->dropColumn(['contado_em', 'codigo_lido']);
        });
    }
};
