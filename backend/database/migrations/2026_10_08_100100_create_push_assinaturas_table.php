<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Aparelhos inscritos para receber avisos (Web Push).
     *
     * O navegador entrega um "endpoint" unico por aparelho/navegador, mais
     * duas chaves usadas para criptografar o aviso. Aqui so guardamos.
     *
     * A unicidade e pelo hash do endpoint, nao pelo endpoint em si: ele e um
     * texto longo (o do Chrome passa de 200 caracteres) e indice de texto
     * longo em Postgres e desperdicio. A chave e do sistema inteiro, nao por
     * usuario: num aparelho compartilhado a inscricao muda de dono em vez de
     * duplicar, senao o aviso de uma pessoa chegaria no aparelho que agora e
     * de outra.
     *
     * `falhas` conta recusas seguidas do servico de push; quando ele diz que
     * a inscricao morreu (404/410), a linha e apagada na hora.
     */
    public function up(): void
    {
        Schema::create('push_assinaturas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->text('endpoint');
            $table->string('endpoint_hash', 64)->unique();
            $table->string('p256dh', 255);
            $table->string('auth', 255);
            $table->string('user_agent', 500)->nullable();
            $table->unsignedSmallInteger('falhas')->default(0);
            $table->timestamp('ultimo_envio_em')->nullable();
            $table->timestamps();

            $table->index('usuario_id', 'push_assinaturas_usuario_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_assinaturas');
    }
};
