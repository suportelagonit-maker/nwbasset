<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('locais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('filial_id')->constrained('filiais')->cascadeOnDelete();
            $table->foreignId('unidade_administrativa_id')->constrained('unidades_administrativas')->cascadeOnDelete();
            $table->foreignId('departamento_id')->constrained('departamentos')->cascadeOnDelete();
            $table->string('nome', 180);
            $table->string('codigo', 30);
            $table->string('endereco', 255)->nullable();
            $table->text('descricao')->nullable();
            $table->string('status', 20)->default('ativo');
            $table->timestamps();

            $table->unique(['empresa_id', 'codigo']);
            $table->index(['empresa_id', 'filial_id', 'unidade_administrativa_id', 'departamento_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('locais');
    }
};
