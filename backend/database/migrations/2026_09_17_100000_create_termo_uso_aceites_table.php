<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Aceite do Termo de Responsabilidade de Uso e LGPD.
     *
     * Um registro por usuario e versao do termo. Nome e e-mail sao copiados no
     * momento do aceite (o cadastro pode mudar depois; o aceite nao). O hash
     * do conteudo prova qual texto foi aceito.
     */
    public function up(): void
    {
        Schema::create('termo_uso_aceites', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->string('versao', 20);
            $table->string('hash_conteudo', 64);
            $table->string('nome_usuario', 255);
            $table->string('email_usuario', 255);
            $table->timestamp('aceito_em');
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->timestamps();

            $table->unique(['usuario_id', 'versao'], 'termo_uso_aceites_usuario_versao_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('termo_uso_aceites');
    }
};
