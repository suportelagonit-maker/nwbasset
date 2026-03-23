<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('depreciacoes_bens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('bem_patrimonial_id')->constrained('bens_patrimoniais')->cascadeOnDelete();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('metodo_depreciacao_id')->constrained('metodos_depreciacao')->cascadeOnDelete();
            $table->decimal('valor_aquisicao', 15, 2);
            $table->decimal('valor_residual', 15, 2)->default(0);
            $table->unsignedInteger('vida_util_anos');
            $table->decimal('taxa_anual', 8, 4);
            $table->decimal('valor_depreciado_acumulado', 15, 2)->default(0);
            $table->decimal('valor_contabil', 15, 2)->default(0);
            $table->date('data_calculo');
            $table->timestamps();

            $table->unique(['bem_patrimonial_id', 'data_calculo']);
            $table->index(['empresa_id', 'data_calculo']);
            $table->index(['metodo_depreciacao_id', 'data_calculo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('depreciacoes_bens');
    }
};
