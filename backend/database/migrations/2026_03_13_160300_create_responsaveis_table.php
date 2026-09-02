<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('responsaveis', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('filial_id')->constrained('filiais')->cascadeOnDelete();
            $table->string('nome', 180);
            $table->string('matricula', 40);
            $table->string('cpf', 14)->nullable();
            $table->string('email')->nullable();
            $table->string('telefone', 30)->nullable();
            $table->string('cargo', 120)->nullable();
            $table->string('status', 20)->default('ativo');
            $table->timestamps();

            $table->unique(['empresa_id', 'matricula']);
            $table->unique(['empresa_id', 'cpf']);
            $table->index(['empresa_id', 'filial_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('responsaveis');
    }
};
