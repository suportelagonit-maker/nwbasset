<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plaquetas_patrimoniais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('bem_patrimonial_id')->constrained('bens_patrimoniais')->cascadeOnDelete();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('filial_id')->constrained('filiais')->cascadeOnDelete();
            $table->string('codigo_plaqueta', 80);
            $table->text('qr_code_conteudo');
            $table->string('status', 20)->default('GERADA');
            $table->date('data_geracao');
            $table->date('data_aplicacao')->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();

            $table->unique(['empresa_id', 'codigo_plaqueta']);
            $table->index(['bem_patrimonial_id', 'status']);
            $table->index(['empresa_id', 'filial_id']);
        });

        DB::statement("
            CREATE UNIQUE INDEX uq_plaquetas_bem_ativa
            ON plaquetas_patrimoniais (bem_patrimonial_id)
            WHERE status IN ('GERADA', 'APLICADA')
        ");
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS uq_plaquetas_bem_ativa');

        Schema::dropIfExists('plaquetas_patrimoniais');
    }
};
