<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bens_patrimoniais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('filial_id')->constrained('filiais')->cascadeOnDelete();
            $table->foreignId('unidade_administrativa_id')->constrained('unidades_administrativas')->cascadeOnDelete();
            $table->foreignId('departamento_id')->constrained('departamentos')->cascadeOnDelete();
            $table->foreignId('local_id')->constrained('locais')->cascadeOnDelete();
            $table->foreignId('responsavel_id')->nullable()->constrained('responsaveis')->nullOnDelete();
            $table->string('numero_tombo', 60);
            $table->string('numero_serie', 120)->nullable();
            $table->text('descricao');
            $table->string('categoria', 120)->nullable();
            $table->string('marca', 120)->nullable();
            $table->string('modelo', 120)->nullable();
            $table->date('data_aquisicao')->nullable();
            $table->decimal('valor_aquisicao', 15, 2)->default(0);
            $table->decimal('valor_residual', 15, 2)->default(0);
            $table->unsignedInteger('vida_util_anos')->nullable();
            $table->string('status_bem', 40)->default('ativo');
            $table->string('estado_conservacao', 40)->default('bom');
            $table->timestamps();

            $table->unique(['empresa_id', 'numero_tombo']);
            $table->index(['empresa_id', 'filial_id']);
            $table->index(['local_id', 'responsavel_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bens_patrimoniais');
    }
};
