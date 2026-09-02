<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usuario_permissoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->string('permissao', 120);
            $table->timestamps();

            $table->unique(['usuario_id', 'empresa_id', 'permissao'], 'usuario_permissoes_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usuario_permissoes');
    }
};
