<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Aparelhos de onde cada pessoa ja entrou.
     *
     * E o que permite dizer "entrada de um aparelho novo": sem essa memoria,
     * ou avisariamos a cada login (ruido ate a pessoa desligar o aviso) ou
     * nunca avisariamos.
     *
     * A impressao e um hash do navegador/sistema informado pelo aparelho —
     * grosseira de proposito: nao identifica o aparelho com precisao, so
     * distingue "ja vi este tipo de acesso antes" de "e a primeira vez". O
     * IP fica junto para a pessoa reconhecer o acesso, nao para comparar:
     * IP de celular muda o tempo todo e avisaria a toa.
     */
    public function up(): void
    {
        Schema::create('acessos_aparelhos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->string('impressao', 64);
            $table->string('user_agent', 500)->nullable();
            $table->string('ultimo_ip', 45)->nullable();
            $table->timestamp('visto_primeiro_em');
            $table->timestamp('visto_ultimo_em');
            $table->timestamps();

            $table->unique(['usuario_id', 'impressao'], 'acessos_aparelhos_usuario_impressao_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('acessos_aparelhos');
    }
};
