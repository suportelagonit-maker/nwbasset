<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Toda leitura feita em campo, inclusive a que nao achou bem nenhum.
     *
     * Guardar a leitura "perdida" e o que transforma o inventario em
     * informacao util: etiqueta de outra filial, bem que existe fisicamente
     * mas nao esta no cadastro, plaqueta ilegivel. Sem esse registro a
     * pessoa le, o sistema diz "nao encontrei" e a informacao se perde.
     *
     * Tambem e o que torna a fila offline segura: cada leitura leva um
     * identificador gerado no aparelho (`origem_id`), entao reenviar a
     * mesma fila nao conta o bem duas vezes.
     */
    public function up(): void
    {
        Schema::create('inventario_leituras', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('inventario_id')->constrained('inventarios')->cascadeOnDelete();
            $table->foreignId('bem_patrimonial_id')->nullable()->constrained('bens_patrimoniais')->nullOnDelete();
            $table->foreignId('local_id')->nullable()->constrained('locais')->nullOnDelete();
            $table->string('codigo_lido', 120);
            $table->string('resultado', 30);
            $table->string('origem_id', 64)->nullable();
            $table->timestamp('lido_em');
            $table->foreignId('lido_por')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->string('observacoes', 500)->nullable();
            $table->timestamps();

            $table->unique(['inventario_id', 'origem_id'], 'inventario_leituras_origem_unique');
            $table->index(['inventario_id', 'resultado'], 'inventario_leituras_resultado_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventario_leituras');
    }
};
