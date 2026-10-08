<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Trilha de eventos do sistema (login, logout, criacao de usuario,
     * mudanca de perfil e de permissao).
     *
     * O AuditLogger ja gravava aqui desde o inicio do projeto, mas a tabela
     * nunca existiu: o proprio logger desiste em silencio quando ela falta
     * (Schema::hasTable), entao todo evento vinha sendo descartado. Criar a
     * tabela liga a trilha que o codigo ja escreve, e e dela que os avisos
     * de acesso tiram o historico de entradas.
     */
    public function up(): void
    {
        Schema::create('auditoria_eventos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('empresa_id')->nullable()->constrained('empresas')->nullOnDelete();
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->string('evento', 40);
            $table->string('entidade_tipo', 255)->nullable();
            $table->unsignedBigInteger('entidade_id')->nullable();
            $table->text('descricao')->nullable();
            $table->jsonb('dados_anteriores')->nullable();
            $table->jsonb('dados_novos')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->timestamps();

            $table->index(['usuario_id', 'evento', 'created_at'], 'auditoria_eventos_usuario_evento_idx');
            $table->index(['empresa_id', 'created_at'], 'auditoria_eventos_empresa_idx');
            $table->index(['evento', 'created_at'], 'auditoria_eventos_evento_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auditoria_eventos');
    }
};
