<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * O que cada pessoa quer receber.
     *
     * Uma linha por usuario e assunto, criada so quando a pessoa mexe na
     * preferencia: a ausencia de linha significa "o padrao do assunto"
     * (definido em AvisoAcessoEnum), e nao "desligado".
     */
    public function up(): void
    {
        Schema::create('push_preferencias', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->string('assunto', 40);
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->unique(['usuario_id', 'assunto'], 'push_preferencias_usuario_assunto_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_preferencias');
    }
};
