<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('parametros_depreciacao_bens')) {
            return;
        }

        Schema::create('parametros_depreciacao_bens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('bem_patrimonial_id')->constrained('bens_patrimoniais')->cascadeOnDelete();
            $table->foreignId('regra_depreciacao_id')->nullable()->constrained('regras_depreciacao_tipos_bens')->nullOnDelete();
            $table->string('base_regra_aplicada', 20)->default('fiscal');
            $table->string('metodo_depreciacao', 40)->default('linha_reta');
            $table->foreignId('metodo_depreciacao_id')->nullable()->constrained('metodos_depreciacao')->nullOnDelete();
            $table->unsignedInteger('vida_util_anos')->nullable();
            $table->decimal('taxa_anual_percentual', 8, 4)->nullable();
            $table->decimal('valor_residual_percentual', 8, 4)->nullable();
            $table->decimal('valor_residual_monetario', 15, 2)->nullable();
            $table->date('data_inicio_depreciacao')->nullable();
            $table->boolean('depreciavel')->default(true);
            $table->text('motivo_override')->nullable();
            $table->string('origem_parametro', 30)->default('herdado_regra');
            $table->boolean('ativo')->default(true);
            $table->foreignId('criado_por')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->foreignId('atualizado_por')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->timestamps();

            $table->index(['empresa_id', 'ativo']);
            $table->index(['bem_patrimonial_id', 'base_regra_aplicada', 'ativo'], 'param_dep_bem_base_ativo_idx');
        });

        DB::statement("
            CREATE UNIQUE INDEX IF NOT EXISTS param_dep_bem_unico_ativo_true_idx
            ON parametros_depreciacao_bens (bem_patrimonial_id, base_regra_aplicada)
            WHERE ativo = true
        ");
    }

    public function down(): void
    {
        if (! Schema::hasTable('parametros_depreciacao_bens')) {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS param_dep_bem_unico_ativo_true_idx');
        Schema::dropIfExists('parametros_depreciacao_bens');
    }
};

